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

/* ===================== Пути (uploads в КОРНЕ) ===================== */
const ROOT = path.resolve(__dirname, "..", "..");   // корень репозитория
const DATA_DIR = path.join(ROOT, "uploads");        // <repo>/uploads
const BEATS_JSON = path.join(DATA_DIR, "beats.json");

const DIR_COVERS = path.join(DATA_DIR, "covers");
const DIR_AUDIO  = path.join(DATA_DIR, "audio");
const DIR_STEMS  = path.join(DATA_DIR, "stems");

/* ===================== FS helpers ===================== */
async function ensureDirs() {
  await fs.mkdir(DIR_COVERS, { recursive: true });
  await fs.mkdir(DIR_AUDIO,  { recursive: true });
  await fs.mkdir(DIR_STEMS,  { recursive: true });
  try {
    await fs.access(BEATS_JSON).catch(async () => {
      await fs.writeFile(BEATS_JSON, "[]", "utf8");
    });
  } catch {}
}
function fullUrlFrom(req: express.Request, rel: string) {
  if (!rel) return "";
  if (rel.startsWith("http://") || rel.startsWith("https://")) return rel;
  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}${rel.startsWith("/") ? "" : "/"}${rel}`;
}

/* ===================== Multer (upload) ===================== */
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    try {
      if (file.fieldname === "cover") return cb(null, DIR_COVERS);
      if (file.fieldname === "mp3" || file.fieldname === "wav") return cb(null, DIR_AUDIO);
      if (file.fieldname === "stems") return cb(null, DIR_STEMS);
      return cb(null, DATA_DIR);
    } catch (e) {
      return cb(e as any, DATA_DIR);
    }
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

// Раздаём ./uploads как статику (если используется локальное хранилище)
app.use("/uploads", express.static(DATA_DIR));

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

/* ---------- GET /api/beats ---------- */
app.get("/api/beats", async (req, res) => {
  try {
    await ensureDirs();

    const raw = await fs.readFile(BEATS_JSON, "utf8").catch(() => "[]");
    let beats: any = JSON.parse(raw);

    if (beats && typeof beats === "object" && !Array.isArray(beats)) {
      beats = beats.beats || beats.list || [];
    }
    if (!Array.isArray(beats)) beats = [];

    // нормализуем относительные пути → абсолютные URL
    beats = beats.map((b: any) => ({
      ...b,
      coverUrl: fullUrlFrom(req, b.coverUrl || b.cover || ""),
      files: {
        mp3:   fullUrlFrom(req, b?.files?.mp3   || b?.mp3   || ""),
        wav:   fullUrlFrom(req, b?.files?.wav   || b?.wav   || ""),
        stems: fullUrlFrom(req, b?.files?.stems || b?.stems || ""),
      },
      // author — уже хранится, просто отдаём как есть
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
      const folder = fileType === "cover" ? "covers" : "audio";

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
app.post(
  "/api/beats/upload",
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "mp3",   maxCount: 1 },
    { name: "wav",   maxCount: 1 },
    { name: "stems", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      await ensureDirs();

      const title   = String(req.body?.title || "").trim();
      const beatKey = String(req.body?.key   || "").trim() || "Am";
      const bpm     = Number(req.body?.bpm   || 0);

      // Цены за лицензии (парсим JSON строку)
      let prices = {};
      try {
        prices = typeof req.body?.prices === "string"
          ? JSON.parse(req.body.prices)
          : (req.body?.prices || {});
      } catch (e) {
        console.warn("⚠️ Не удалось распарсить prices:", e);
      }

      // Автор приходит с клиента
      const authorId   = String(req.body?.authorId   || "").trim();
      const authorName = String(req.body?.authorName || "").trim();
      const authorSlug = String(req.body?.authorSlug || "").trim();

      // Получаем URL файлов (они уже загружены через /api/upload-file)
      const coverUrl = String(req.body?.coverUrl || "").trim();
      const mp3Url = String(req.body?.mp3Url || "").trim();
      const wavUrl = String(req.body?.wavUrl || "").trim();
      const stemsUrl = String(req.body?.stemsUrl || "").trim();

      if (!title || !bpm || !coverUrl || !mp3Url || !wavUrl) {
        return res.status(400).json({ ok: false, error: "required-missing" });
      }

      console.log(`✅ Creating beat "${title}" with pre-uploaded files`);

      const raw = await fs.readFile(BEATS_JSON, "utf8").catch(() => "[]");
      const list: any[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];

      const record = {
        id: `beat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title,
        key: beatKey,
        bpm,
        coverUrl,
        files: { mp3: mp3Url, wav: wavUrl, stems: stemsUrl },
        prices: prices, // ✅ Сохраняем цены из запроса

        // сохраняем автора, если пришёл
        author: authorId || authorName ? {
          id: authorId || `seller:${authorSlug || authorName || "unknown"}`,
          name: authorName || "Unknown",
          slug: authorSlug || undefined,
        } : null,
      };

      list.unshift(record);
      await fs.writeFile(BEATS_JSON, JSON.stringify(list, null, 2), "utf8");

      console.log(`✅ Beat "${title}" created successfully`);
      res.json({ ok: true, beat: record });
    } catch (e) {
      console.error("POST /api/beats/upload error:", e);
      res.status(500).json({ ok: false, error: "upload-failed" });
    }
  }
);

/* ---------- SPA Fallback для React Router ---------- */
// Все неизвестные маршруты отдают index.html (должно быть в конце!)
app.get("*", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIST, "index.html"));
});

/* ===================== Start HTTP ===================== */
const server = app.listen(PORT, async () => {
  console.log(`\n🌐 HTTP:        http://localhost:${PORT}`);
  console.log(`📁 DATA_DIR:    ${DATA_DIR}`);
  console.log(`📄 BEATS_JSON:  ${BEATS_JSON}\n`);

  // Проверяем подключение к БД
  console.log("🔌 Проверка подключения к PostgreSQL...");
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.log("⚠️  ВНИМАНИЕ: База данных недоступна! Проверьте настройки в .env");
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
