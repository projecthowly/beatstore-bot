import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// (Опционально) бот
import { createBot, setMenuButton } from "./bot.js";
import type { Telegraf } from "telegraf";

// Database
import * as db from "./database.js";
import { testConnection, pool } from "./db.js";

// S3 Storage
import { uploadToS3, getMimeType, generateS3Key } from "./s3.js";

/* ===================== ENV ===================== */
const PORT = Number(process.env.PORT || 8080);
const BASE_URL = process.env.BASE_URL || "";
const WEBAPP_URL = process.env.WEBAPP_URL || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || "";

/* ===================== __dirname в ESM ===================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===================== Пути для временных файлов ===================== */
const ROOT = path.resolve(__dirname, "..", "..");   // корень репозитория
const TEMP_DIR = path.join(ROOT, "temp");          // временные файлы для multer

/* ===================== FS helpers ===================== */
async function ensureDirs() {
  // Создаём только temp директорию для временных загрузок
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/* ===================== Multer (upload) ===================== */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Все файлы временно складываются в TEMP_DIR перед загрузкой на S3
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safe = path.basename(file.originalname, ext).replace(/[^a-z0-9_\-.]+/gi, "_");
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}${ext}`);
  },
});
const upload = multer({ storage });

/* ===================== App ===================== */
const app = express();
app.use(express.json());

const corsOptions: CorsOptions = {
  origin: true,
  credentials: false,
};
app.use(cors(corsOptions));

// Статика React клиента (client/dist)
const CLIENT_DIST = path.join(ROOT, "client", "dist");
app.use(express.static(CLIENT_DIST));

/* ---------- health ---------- */
app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: BASE_URL ? "webhook" : "polling" });
});

/* ========== USER ENDPOINTS ========== */

/**
 * GET /api/users/:telegramId
 * Получить пользователя по Telegram ID
 */
app.get("/api/users/:telegramId", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    res.json({ ok: true, user });
  } catch (e) {
    console.error("GET /api/users/:telegramId error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * POST /api/users
 * Создать нового пользователя
 * Body: { telegram_id: number, username?: string, avatar_url?: string, role?: 'producer' | 'artist' | null }
 * Если role не указана - создаётся с role = NULL (пользователь ещё не выбрал роль)
 */
app.post("/api/users", async (req, res) => {
  try {
    const { telegram_id, username, avatar_url, role } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ ok: false, error: "missing-telegram-id" });
    }

    // Проверка роли только если она передана
    if (role !== undefined && role !== null && role !== "producer" && role !== "artist") {
      return res.status(400).json({ ok: false, error: "invalid-role" });
    }

    // Проверяем, не существует ли уже пользователь
    const existing = await db.findUserByTelegramId(telegram_id);
    if (existing) {
      return res.status(409).json({ ok: false, error: "user-already-exists", user: existing });
    }

    const user = await db.createUser({
      telegram_id,
      username: username || null,
      avatar_url: avatar_url || null,
      role: role || null, // NULL если не передана
    });

    console.log(`✅ Пользователь создан: telegram_id=${telegram_id}, role=${role || "NULL"}`);
    res.json({ ok: true, user });
  } catch (e) {
    console.error("POST /api/users error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/role
 * Изменить роль пользователя (только artist -> producer)
 * Body: { role: 'producer' }
 */
app.patch("/api/users/:telegramId/role", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { role } = req.body;
    if (role !== "producer") {
      return res.status(400).json({ ok: false, error: "can-only-change-to-producer" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Разрешаем смену только с artist на producer
    if (user.role === "producer") {
      return res.status(400).json({ ok: false, error: "already-producer" });
    }

    const updatedUser = await db.updateUser(user.id, { role });

    // Создаём дефолтные лицензии для нового продюсера
    await db.createDefaultLicenses(user.id);

    res.json({ ok: true, user: updatedUser });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId/role error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId
 * Обновить данные пользователя (username, bio, links и т.д.)
 */
app.patch("/api/users/:telegramId", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Если меняется роль на producer и пользователь не был producer, создаём дефолтные лицензии
    if (req.body.role === "producer" && user.role !== "producer") {
      await db.createDefaultLicenses(user.id);
    }

    const updatedUser = await db.updateUser(user.id, req.body);

    res.json({ ok: true, user: updatedUser });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/subscription
 * Получить подписку пользователя
 */
app.get("/api/users/:telegramId/subscription", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    const subscription = await db.getUserSubscription(user.id);

    res.json({ ok: true, subscription });
  } catch (e) {
    console.error("GET /api/users/:telegramId/subscription error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/licenses
 * Получить настройки лицензий пользователя
 */
app.get("/api/users/:telegramId/licenses", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    const result = await pool.query(
      "SELECT license_key, license_name, default_price FROM user_license_settings WHERE user_id = $1",
      [user.id]
    );

    const licenses = result.rows.map((row: any) => ({
      id: row.license_key,
      name: row.license_name,
      defaultPrice: row.default_price ? parseFloat(row.default_price) : null,
    }));

    res.json({ ok: true, licenses });
  } catch (e) {
    console.error("GET /api/users/:telegramId/licenses error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/licenses
 * Обновить настройки лицензий пользователя
 */
app.patch("/api/users/:telegramId/licenses", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { licenses } = req.body;
    if (!Array.isArray(licenses)) {
      return res.status(400).json({ ok: false, error: "invalid-licenses" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Удаляем старые настройки
    await pool.query("DELETE FROM user_license_settings WHERE user_id = $1", [user.id]);

    // Вставляем новые
    for (const lic of licenses) {
      await pool.query(
        `INSERT INTO user_license_settings (user_id, license_key, license_name, default_price)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, license_key)
         DO UPDATE SET license_name = $3, default_price = $4, updated_at = CURRENT_TIMESTAMP`,
        [user.id, lic.id, lic.name, lic.defaultPrice]
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId/licenses error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/purchases
 * Получить историю покупок пользователя
 */
app.get("/api/users/:telegramId/purchases", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    const purchases = await db.getUserPurchases(user.id);

    res.json({ ok: true, purchases });
  } catch (e) {
    console.error("GET /api/users/:telegramId/purchases error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/* ========== CART ENDPOINTS ========== */

/**
 * GET /api/users/:telegramId/cart
 * Получить корзину пользователя
 */
app.get("/api/users/:telegramId/cart", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Получаем корзину с информацией о битах и лицензиях
    const result = await pool.query(
      `SELECT
        c.id,
        c.beat_id,
        c.license_id,
        c.added_at,
        b.title as beat_title,
        l.name as license_name,
        bl.price as license_price
       FROM cart c
       JOIN beats b ON c.beat_id = b.id
       JOIN licenses l ON c.license_id = l.id
       LEFT JOIN beat_licenses bl ON bl.beat_id = c.beat_id AND bl.license_id = c.license_id
       WHERE c.user_id = $1
       ORDER BY c.added_at DESC`,
      [user.id]
    );

    const cartItems = result.rows.map((row: any) => ({
      beatId: `beat_${row.beat_id}`,
      license: row.license_id.toString(),
      beatTitle: row.beat_title,
      licenseName: row.license_name,
      price: row.license_price ? parseFloat(row.license_price) : 0,
      addedAt: row.added_at,
    }));

    res.json({ ok: true, cart: cartItems });
  } catch (e) {
    console.error("GET /api/users/:telegramId/cart error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * POST /api/users/:telegramId/cart
 * Добавить товар в корзину
 * Body: { beatId: string, licenseId: string }
 */
app.post("/api/users/:telegramId/cart", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { beatId, licenseId } = req.body;
    if (!beatId || !licenseId) {
      return res.status(400).json({ ok: false, error: "missing-parameters" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Извлекаем числовой ID бита из строки "beat_123"
    const numericBeatId = parseInt(beatId.replace("beat_", ""), 10);
    const numericLicenseId = parseInt(licenseId, 10);

    if (isNaN(numericBeatId) || isNaN(numericLicenseId)) {
      return res.status(400).json({ ok: false, error: "invalid-ids" });
    }

    // Добавляем в корзину (или игнорируем если уже есть из-за UNIQUE constraint)
    await pool.query(
      `INSERT INTO cart (user_id, beat_id, license_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, beat_id, license_id) DO NOTHING`,
      [user.id, numericBeatId, numericLicenseId]
    );

    console.log(`✅ Добавлено в корзину: user=${user.id}, beat=${numericBeatId}, license=${numericLicenseId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/users/:telegramId/cart error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * DELETE /api/users/:telegramId/cart
 * Удалить товар из корзины
 * Body: { beatId: string, licenseId: string }
 */
app.delete("/api/users/:telegramId/cart", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { beatId, licenseId } = req.body;
    if (!beatId || !licenseId) {
      return res.status(400).json({ ok: false, error: "missing-parameters" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Извлекаем числовой ID бита
    const numericBeatId = parseInt(beatId.replace("beat_", ""), 10);
    const numericLicenseId = parseInt(licenseId, 10);

    if (isNaN(numericBeatId) || isNaN(numericLicenseId)) {
      return res.status(400).json({ ok: false, error: "invalid-ids" });
    }

    await pool.query(
      `DELETE FROM cart
       WHERE user_id = $1 AND beat_id = $2 AND license_id = $3`,
      [user.id, numericBeatId, numericLicenseId]
    );

    console.log(`✅ Удалено из корзины: user=${user.id}, beat=${numericBeatId}, license=${numericLicenseId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/users/:telegramId/cart error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * DELETE /api/users/:telegramId/cart/all
 * Очистить всю корзину
 */
app.delete("/api/users/:telegramId/cart/all", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    await pool.query("DELETE FROM cart WHERE user_id = $1", [user.id]);

    console.log(`✅ Корзина очищена для пользователя ${user.id}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/users/:telegramId/cart/all error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/* ---------- GET /api/beats ---------- */
app.get("/api/beats", async (req, res) => {
  try {
    // Query параметры для фильтрации
    // ?userId=TELEGRAM_ID - получить биты конкретного пользователя (для личного битстора)
    const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;

    let query = `
      SELECT
        b.id,
        b.title,
        b.bpm,
        b.key,
        b.cover_file_path as "coverUrl",
        b.mp3_file_path as "mp3Url",
        b.wav_file_path as "wavUrl",
        b.stems_file_path as "stemsUrl",
        b.views_count,
        b.sales_count,
        b.created_at,
        u.id as author_id,
        u.username as author_name,
        u.telegram_id as author_telegram_id,
        json_agg(
          json_build_object(
            'licenseKey', bl.license_id::text,
            'licenseName', l.name,
            'price', bl.price
          )
        ) FILTER (WHERE bl.id IS NOT NULL) as licenses
      FROM beats b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN beat_licenses bl ON b.id = bl.beat_id
      LEFT JOIN licenses l ON bl.license_id = l.id
    `;

    // Если указан userId, фильтруем по пользователю
    const params: any[] = [];
    if (userId && !isNaN(userId)) {
      query += ` WHERE u.telegram_id = $1`;
      params.push(userId);
      console.log(`📦 Загрузка битов пользователя ${userId}`);
    } else {
      console.log(`📦 Загрузка всех битов (глобальный битстор)`);
    }

    query += ` GROUP BY b.id, u.id ORDER BY b.created_at DESC`;

    const result = await pool.query(query, params);

    const beats = result.rows.map((row: any) => ({
      id: `beat_${row.id}`,
      title: row.title,
      key: row.key,
      bpm: row.bpm,
      coverUrl: row.coverUrl,
      files: {
        mp3: row.mp3Url,
        wav: row.wavUrl,
        stems: row.stemsUrl || "",
      },
      prices: (row.licenses || []).reduce((acc: any, lic: any) => {
        acc[lic.licenseKey] = {
          name: lic.licenseName,
          price: parseFloat(lic.price)
        };
        return acc;
      }, {}),
      author: row.author_id ? {
        id: `user:${row.author_telegram_id}`,
        name: row.author_name || "Unknown",
        slug: row.author_name?.toLowerCase().replace(/\s+/g, "-") || "unknown",
      } : null,
    }));

    res.json({ ok: true, beats });
  } catch (e) {
    console.error("GET /api/beats error:", e);
    res.status(500).json({ ok: false, error: "read-failed" });
  }
});

/* ---------- POST /api/upload-file ---------- */
// Немедленная загрузка отдельного файла на S3
app.post(
  "/api/upload-file",
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const fileType = req.body?.type || "unknown"; // cover, mp3, wav, stems

      if (!file) {
        return res.status(400).json({ ok: false, error: "no-file" });
      }

      console.log(`📤 Immediate upload: ${file.originalname} (${fileType})`);

      // Определяем папку по типу файла
      let folder = "audio"; // по умолчанию
      if (fileType === "cover") folder = "covers";
      else if (fileType === "mp3") folder = "audio/mp3";
      else if (fileType === "wav") folder = "audio/wav";
      else if (fileType === "stems") folder = "stems";

      // Загружаем на S3
      const url = await uploadToS3(
        file.path,
        generateS3Key(folder, file.originalname),
        getMimeType(file.originalname)
      );

      // Удаляем временный файл
      await fs.unlink(file.path).catch(() => {});

      res.json({ ok: true, url });
    } catch (e) {
      console.error("POST /api/upload-file error:", e);
      res.status(500).json({ ok: false, error: "upload-failed" });
    }
  }
);

/* ---------- POST /api/beats/upload ---------- */
app.post("/api/beats/upload", express.json(), async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const beatKey = String(req.body?.key || "").trim() || "Am";
    const bpm = Number(req.body?.bpm || 0);

    // Цены за лицензии
    let prices = {};
    try {
      prices = typeof req.body?.prices === "string"
        ? JSON.parse(req.body.prices)
        : (req.body?.prices || {});
    } catch (e) {
      console.warn("⚠️ Не удалось распарсить prices:", e);
    }

    // Автор (user_id из telegram_id)
    const authorId = String(req.body?.authorId || "").trim();

    // URL файлов (уже загружены через /api/upload-file)
    const coverUrl = String(req.body?.coverUrl || "").trim();
    const mp3Url = String(req.body?.mp3Url || "").trim();
    const wavUrl = String(req.body?.wavUrl || "").trim();
    const stemsUrl = String(req.body?.stemsUrl || "").trim();

    if (!title || !bpm || !coverUrl || !mp3Url || !wavUrl || !authorId) {
      return res.status(400).json({ ok: false, error: "required-missing" });
    }

    console.log(`✅ Creating beat "${title}" with pre-uploaded files`);

    // Получаем user_id из authorId (формат: "user:781620101")
    const telegramId = authorId.startsWith("user:")
      ? parseInt(authorId.split(":")[1], 10)
      : parseInt(authorId, 10);

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Создаём бит в БД (key - зарезервированное слово, экранируем кавычками)
    const beatResult = await pool.query(
      `INSERT INTO beats (user_id, title, bpm, "key", cover_file_path, mp3_file_path, wav_file_path, stems_file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.id, title, bpm, beatKey, coverUrl, mp3Url, wavUrl, stemsUrl || null]
    );

    const beatId = beatResult.rows[0].id;

    // Сохраняем цены лицензий
    // license_key (basic/premium) → находим глобальную лицензию по имени
    for (const [licenseKey, price] of Object.entries(prices)) {
      if (price && typeof price === "number") {
        // Проверяем что у пользователя есть эта лицензия в настройках
        const userLicenseCheck = await pool.query(
          "SELECT license_name FROM user_license_settings WHERE user_id = $1 AND license_key = $2 LIMIT 1",
          [user.id, licenseKey]
        );

        if (userLicenseCheck.rows.length > 0) {
          const licenseName = userLicenseCheck.rows[0].license_name;

          // Находим глобальную лицензию по имени
          const globalLicenseResult = await pool.query(
            "SELECT id FROM licenses WHERE name = $1 AND is_global = true LIMIT 1",
            [licenseName]
          );

          if (globalLicenseResult.rows.length > 0) {
            const globalLicenseId = globalLicenseResult.rows[0].id;
            await pool.query(
              `INSERT INTO beat_licenses (beat_id, license_id, price)
               VALUES ($1, $2, $3)
               ON CONFLICT (beat_id, license_id) DO UPDATE SET price = $3`,
              [beatId, globalLicenseId, price]
            );
          }
        }
      }
    }

    console.log(`✅ Beat "${title}" created successfully (ID: ${beatId})`);

    res.json({
      ok: true,
      beat: {
        id: `beat_${beatId}`,
        title,
        key: beatKey,
        bpm,
        coverUrl,
        files: { mp3: mp3Url, wav: wavUrl, stems: stemsUrl },
        prices,
        author: {
          id: authorId,
          name: user.username || "Unknown",
          slug: user.username?.toLowerCase().replace(/\s+/g, "-") || "unknown",
        },
      },
    });
  } catch (e) {
    console.error("POST /api/beats/upload error:", e);
    res.status(500).json({ ok: false, error: "upload-failed" });
  }
});

/* ---------- SPA Fallback для React Router ---------- */
// Все неизвестные маршруты отдают index.html (должно быть в конце!)
app.get("*", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

/* ===================== Start HTTP ===================== */
const server = app.listen(PORT, async () => {
  console.log(`\n🌐 HTTP:        http://localhost:${PORT}`);
  console.log(`📁 TEMP_DIR:    ${TEMP_DIR}`);
  console.log(`💾 Storage:     PostgreSQL + S3\n`);

  // Создаём временную директорию
  await ensureDirs();

  // Проверяем подключение к БД
  console.log("🔌 Проверка подключения к PostgreSQL...");
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log("⚠️  ВНИМАНИЕ: База данных недоступна! Проверьте настройки в .env");
  } else {
    console.log("✅ PostgreSQL подключен");
  }
  console.log("");
});

/* ===================== Telegram (опционально) ===================== */
let bot: Telegraf | null = null;
async function startBot() {
  if (!BOT_TOKEN) {
    console.log("🤖 BOT_TOKEN не задан — бот не запускается (это ок для локального API).");
    return;
  }
  try {
    // @ts-ignore
    const b = createBot(BOT_TOKEN, WEBAPP_URL);
    bot = b as unknown as Telegraf;

    if (BASE_URL) {
      const webhookPath = `/webhook/${b.secretPathComponent()}`;
      // @ts-ignore
      await b.telegram.setWebhook(`${BASE_URL}${webhookPath}`);
      // @ts-ignore
      app.use(webhookPath, b.webhookCallback(webhookPath));
      console.log("✅ Webhook установлен:", `${BASE_URL}${webhookPath}`);
    } else {
      // @ts-ignore
      await b.telegram.deleteWebhook().catch(() => {});
      // @ts-ignore
      await b.launch();
      console.log("✅ Bot: long polling");
    }

    if (WEBAPP_URL) {
      // @ts-ignore
      await setMenuButton(b, "Open", WEBAPP_URL);
    }
  } catch (e) {
    console.error("❌ Бот не запустился:", e);
  }
}
startBot().catch(console.error);

process.on("SIGINT", () => { try { server.close(); } catch {} try { /* @ts-ignore */ bot?.stop?.("SIGINT"); } catch {} process.exit(0); });
process.on("SIGTERM", () => { try { server.close(); } catch {} try { /* @ts-ignore */ bot?.stop?.("SIGTERM"); } catch {} process.exit(0); });
