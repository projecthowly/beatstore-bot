import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
import multer from "multer";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

// (Опционально) бот
import { createBot, setMenuButton } from "./bot.js";
import type { Telegraf } from "telegraf";

// Database
import * as db from "./database.js";
import { testConnection, pool } from "./db.js";

// S3 Storage
import { uploadToS3, getMimeType, generateS3Key, generateS3KeyForBeat, generateS3KeyForAvatar, deleteMultipleFromS3, moveFileInS3 } from "./s3.js";

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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

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
 * Body: { telegram_id: number, username?: string, display_name?: string, avatar_url?: string, role?: 'producer' | 'artist' }
 * Если role не указана - создаётся с role = "artist" (по умолчанию все новые пользователи артисты)
 */
app.post("/api/users", async (req, res) => {
  try {
    const { telegram_id, username, display_name, avatar_url, role } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ ok: false, error: "missing-telegram-id" });
    }

    // Роль по умолчанию - artist
    const userRole = role || "artist";

    // Проверка роли
    if (userRole !== "producer" && userRole !== "artist") {
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
      display_name: display_name || null,
      avatar_url: avatar_url || null,
      role: userRole, // Всегда artist или producer
    });

    // db.createUser уже создал deeplink и лицензии для продюсера
    console.log(`✅ Пользователь создан: telegram_id=${telegram_id}, username=${username}, display_name=${display_name}, role=${userRole}`);
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

    // Обновляем роль напрямую через SQL (роль не входит в UpdateUserInput)
    const updateResult = await pool.query(
      "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [role, user.id]
    );
    const updatedUser = updateResult.rows[0];

    // Назначаем Free план новому продюсеру (если еще нет)
    const existingPlan = await db.getUserPlan(user.id);
    if (!existingPlan) {
      await db.assignFreePlan(user.id);
      console.log(`✅ Назначен Free план продюсеру: ${user.username}`);
    }

    // Создаём дефолтные лицензии для нового продюсера
    await db.createDefaultLicenses(user.id);

    // Создаём deeplink для нового продюсера (если еще нет)
    const existingDeeplink = await db.getUserDeeplink(user.id);
    if (!existingDeeplink) {
      const deeplinkName = `user${telegramId}`;
      await db.createDeeplink({
        user_id: user.id,
        custom_name: deeplinkName,
      });
      console.log(`✅ Создан deeplink для продюсера: ${deeplinkName}`);
    }

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
    console.log("🔧 PATCH /api/users/:telegramId вызван");
    console.log("  - telegramId:", req.params.telegramId);
    console.log("  - Request body:", JSON.stringify(req.body, null, 2));

    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      console.log("❌ Invalid telegram ID");
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    console.log("✅ User found:", user.id, user.username);

    // Если меняется роль на producer и пользователь не был producer, создаём дефолтные лицензии
    if (req.body.role === "producer" && user.role !== "producer") {
      console.log("🎵 Creating default licenses for new producer");
      await db.createDefaultLicenses(user.id);
    }

    // Если удаляется аватар (avatar_url установлен в null), удаляем файл из S3
    if (req.body.avatar_url === null && user.avatar_url) {
      console.log(`🗑️ Удаляем аватар из S3: ${user.avatar_url}`);
      await deleteMultipleFromS3([user.avatar_url]).catch((e) => {
        console.warn("⚠️ Не удалось удалить аватар из S3:", e);
      });
    }

    console.log("💾 Updating user in database...");
    const updatedUser = await db.updateUser(user.id, req.body);
    console.log("✅ User updated successfully");
    console.log("  - wallet_address:", updatedUser.wallet_address);
    console.log("  - wallet_connected_at:", updatedUser.wallet_connected_at);

    res.json({ ok: true, user: updatedUser });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/deeplink
 * Получить deeplink пользователя
 */
app.get("/api/users/:telegramId/deeplink", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    const deeplink = await db.getUserDeeplink(user.id);
    if (!deeplink) {
      return res.status(404).json({ ok: false, error: "deeplink-not-found" });
    }

    res.json({ ok: true, deeplink });
  } catch (e) {
    console.error("GET /api/users/:telegramId/deeplink error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/deeplink
 * Обновить custom_name для deeplink
 * Body: { customName: string }
 */
app.patch("/api/users/:telegramId/deeplink", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { customName } = req.body;
    if (!customName || customName.length > 15 || !/^[a-zA-Z0-9_]+$/.test(customName)) {
      return res.status(400).json({
        ok: false,
        error: "invalid-custom-name",
        message: "Custom name must be 1-15 characters and contain only letters, numbers, and underscores"
      });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Получаем текущий deeplink пользователя
    const currentDeeplink = await db.getUserDeeplink(user.id);

    // Проверяем, не занято ли имя (но только если это не текущее имя пользователя)
    if (currentDeeplink?.custom_name !== customName) {
      const exists = await db.checkDeeplinkExists(customName);
      if (exists) {
        return res.status(409).json({ ok: false, error: "custom-name-already-taken" });
      }
    }

    const updatedDeeplink = await db.updateDeeplink(user.id, { custom_name: customName });
    res.json({ ok: true, deeplink: updatedDeeplink });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId/deeplink error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/deeplink/:customName
 * Получить продюсера по deeplink custom_name
 */
app.get("/api/deeplink/:customName", async (req, res) => {
  try {
    const { customName } = req.params;

    const producer = await db.findUserByDeeplink(customName);
    if (!producer) {
      return res.status(404).json({ ok: false, error: "producer-not-found" });
    }

    res.json({ ok: true, producer });
  } catch (e) {
    console.error("GET /api/deeplink/:customName error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/viewer-mode
 * Установить или очистить режим просмотра битстора продюсера (guest mode)
 * Body: { viewed_producer_id: number | null }
 * null = очистить режим просмотра (выход из guest mode)
 * number = установить просмотр битстора продюсера
 */
app.patch("/api/users/:telegramId/viewer-mode", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { viewed_producer_id } = req.body;

    // Проверка типа (должно быть number или null)
    if (viewed_producer_id !== null && typeof viewed_producer_id !== "number") {
      return res.status(400).json({ ok: false, error: "invalid-viewed-producer-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    let updatedUser;

    if (viewed_producer_id === null) {
      // Очистить режим просмотра
      updatedUser = await db.clearViewedProducer(user.id);
      console.log(`✅ Пользователь ${telegramId} вышел из guest mode`);
    } else {
      // Проверяем, что продюсер существует
      const producer = await db.findUserByTelegramId(viewed_producer_id);
      if (!producer || producer.role !== "producer") {
        return res.status(404).json({ ok: false, error: "producer-not-found" });
      }

      // Устанавливаем режим просмотра
      updatedUser = await db.setViewedProducer(user.id, producer.id);
      console.log(`✅ Пользователь ${telegramId} вошел в guest mode для продюсера ${viewed_producer_id}`);
    }

    res.json({ ok: true, user: updatedUser });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId/viewer-mode error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/subscription
 * Получить подписку (план) пользователя
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

    const subscription = await db.getUserPlan(user.id);

    res.json({ ok: true, subscription });
  } catch (e) {
    console.error("GET /api/users/:telegramId/subscription error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * POST /api/users/:telegramId/subscription/confirm-payment
 * Подтвердить оплату подписки через TON
 * Body: { plan: 'basic' | 'pro', transactionHash: string, tonAmount: number, usdPrice: number }
 */
app.post("/api/users/:telegramId/subscription/confirm-payment", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const { plan, transactionHash, tonAmount, usdPrice, walletAddress } = req.body;
    if (!plan || !transactionHash || !tonAmount || !walletAddress) {
      return res.status(400).json({ ok: false, error: "missing-parameters" });
    }

    console.log(`💎 Подтверждение TON платежа:`, {
      telegramId,
      plan,
      transactionHash,
      tonAmount,
      usdPrice,
      walletAddress,
    });

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Проверяем транзакцию в TON blockchain
    const { verifyTonTransaction } = await import("./ton-payment.js");
    const isValid = await verifyTonTransaction(transactionHash, tonAmount, walletAddress);
    if (!isValid) {
      console.error(`❌ Верификация транзакции провалилась для пользователя ${telegramId}`);
      return res.status(400).json({ ok: false, error: "invalid-transaction" });
    }

    console.log(`✅ Транзакция верифицирована успешно!`);

    // Получаем ID плана из таблицы plans
    const planResult = await pool.query(
      `SELECT id FROM plans WHERE LOWER(code) = LOWER($1)`,
      [plan]
    );

    if (!planResult.rows[0]) {
      return res.status(400).json({ ok: false, error: "plan-not-found" });
    }

    const planId = planResult.rows[0].id;

    // Активируем подписку на 1 месяц
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await pool.query(
      `INSERT INTO user_plan (user_id, plan_id, expires_at, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id)
       DO UPDATE SET plan_id = $2, expires_at = $3, is_active = true, started_at = NOW()`,
      [user.id, planId, expiresAt]
    );

    // Добавляем Unlimited лицензию для платных планов
    if (plan.toLowerCase() !== 'free') {
      await db.addUnlimitedLicense(user.id);
    }

    // Записываем платеж в историю транзакций
    await pool.query(
      `INSERT INTO subscription_payments (user_id, plan_id, amount, transaction_hash)
       VALUES ($1, $2, $3, $4)`,
      [user.id, planId, usdPrice || tonAmount, transactionHash]
    );

    console.log(`✅ План ${plan} (ID: ${planId}) активирован для пользователя ${telegramId} до ${expiresAt.toISOString()}`);
    console.log(`💰 Получено: ${tonAmount} TON ($${usdPrice})`);
    console.log(`📝 Платеж записан в subscription_payments`);

    res.json({ ok: true, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("POST /api/users/:telegramId/subscription/confirm-payment error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/transactions
 * Получить все транзакции пользователя (покупки битов, продажи битов, платежи за подписки)
 */
app.get("/api/users/:telegramId/transactions", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // 1. Покупки битов (расход)
    const purchases = await pool.query(`
      SELECT
        p.id,
        'beat_purchase' as type,
        p.created_at,
        b.cover_url as beat_cover,
        b.title as beat_title,
        u.username as beat_author,
        b.bpm,
        b.key_sig as key,
        -p.amount as amount
      FROM purchases p
      JOIN beats b ON p.beat_id = b.id
      JOIN users u ON b.user_id = u.id
      WHERE p.buyer_id = $1
    `, [user.id]);

    // 2. Продажи битов (доход)
    const sales = await pool.query(`
      SELECT
        p.id,
        'beat_sale' as type,
        p.created_at,
        b.cover_url as beat_cover,
        b.title as beat_title,
        u.username as beat_author,
        b.bpm,
        b.key_sig as key,
        p.amount as amount
      FROM purchases p
      JOIN beats b ON p.beat_id = b.id
      JOIN users u ON p.buyer_id = u.id
      WHERE p.seller_id = $1
    `, [user.id]);

    // 3. Платежи за подписки (расход)
    const subscriptions = await pool.query(`
      SELECT
        sp.id,
        'subscription' as type,
        sp.created_at,
        pl.name as subscription_plan,
        -sp.amount as amount
      FROM subscription_payments sp
      JOIN plans pl ON sp.plan_id = pl.id
      WHERE sp.user_id = $1
    `, [user.id]);

    // Объединяем все транзакции и сортируем по дате
    const allTransactions = [
      ...purchases.rows,
      ...sales.rows,
      ...subscriptions.rows
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ ok: true, transactions: allTransactions });
  } catch (e) {
    console.error("GET /api/users/:telegramId/transactions error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/analytics
 * Получить аналитику для продюсера (просмотры, скачивания, продажи)
 */
app.get("/api/users/:telegramId/analytics", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    const { startDate, endDate, metricType = 'views' } = req.query;

    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ ok: false, error: "missing-date-parameters" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    let query = '';
    let params: any[] = [];

    // Определяем запрос в зависимости от типа метрики
    if (metricType === 'views') {
      // Прослушивания битов
      query = `
        SELECT
          DATE(bp.played_at) as date,
          COUNT(*) as count
        FROM beat_plays bp
        JOIN beats b ON bp.beat_id = b.id
        WHERE b.user_id = $1
          AND bp.played_at >= $2::date
          AND bp.played_at < ($3::date + INTERVAL '1 day')
        GROUP BY DATE(bp.played_at)
        ORDER BY date ASC
      `;
      params = [user.id, startDate, endDate];
    } else if (metricType === 'downloads') {
      // Бесплатные скачивания
      query = `
        SELECT
          DATE(d.downloaded_at) as date,
          COUNT(*) as count
        FROM downloads d
        JOIN beats b ON d.beat_id = b.id
        WHERE b.user_id = $1
          AND d.downloaded_at >= $2::date
          AND d.downloaded_at < ($3::date + INTERVAL '1 day')
        GROUP BY DATE(d.downloaded_at)
        ORDER BY date ASC
      `;
      params = [user.id, startDate, endDate];
    } else if (metricType === 'sales') {
      // Продажи (сумма и количество)
      query = `
        SELECT
          DATE(p.created_at) as date,
          COUNT(*) as count,
          COALESCE(SUM(p.amount), 0) as total
        FROM purchases p
        JOIN beats b ON p.beat_id = b.id
        WHERE p.seller_id = $1
          AND p.created_at >= $2::date
          AND p.created_at < ($3::date + INTERVAL '1 day')
        GROUP BY DATE(p.created_at)
        ORDER BY date ASC
      `;
      params = [user.id, startDate, endDate];
    } else {
      return res.status(400).json({ ok: false, error: "invalid-metric-type" });
    }

    const result = await pool.query(query, params);

    // Также получаем общую статистику за период
    let totalQuery = '';
    if (metricType === 'views') {
      totalQuery = `
        SELECT COUNT(*) as total
        FROM beat_plays bp
        JOIN beats b ON bp.beat_id = b.id
        WHERE b.user_id = $1
          AND bp.played_at >= $2::date
          AND bp.played_at < ($3::date + INTERVAL '1 day')
      `;
    } else if (metricType === 'downloads') {
      totalQuery = `
        SELECT COUNT(*) as total
        FROM downloads d
        JOIN beats b ON d.beat_id = b.id
        WHERE b.user_id = $1
          AND d.downloaded_at >= $2::date
          AND d.downloaded_at < ($3::date + INTERVAL '1 day')
      `;
    } else if (metricType === 'sales') {
      totalQuery = `
        SELECT
          COUNT(*) as count,
          COALESCE(SUM(p.amount), 0) as total
        FROM purchases p
        JOIN beats b ON p.beat_id = b.id
        WHERE p.seller_id = $1
          AND p.created_at >= $2::date
          AND p.created_at < ($3::date + INTERVAL '1 day')
      `;
    }

    const totalResult = await pool.query(totalQuery, params);

    res.json({
      ok: true,
      metricType,
      chartData: result.rows,
      summary: totalResult.rows[0]
    });
  } catch (e) {
    console.error("GET /api/users/:telegramId/analytics error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * In-memory cooldown для защиты от накрутки прослушиваний
 * Ключ: userId_beatId, Значение: timestamp последнего прослушивания
 */
const playCooldowns = new Map<string, number>();
const PLAY_COOLDOWN_MS = 30 * 1000; // 30 секунд

/**
 * POST /api/beats/:beatId/play
 * Записать прослушивание бита (с защитой от накрутки)
 */
app.post("/api/beats/:beatId/play", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId.replace("beat_", "");
    const beatId = parseInt(beatIdParam, 10);
    const { userTelegramId } = req.body;

    if (!userTelegramId) {
      return res.status(400).json({ ok: false, error: "missing-user-id" });
    }

    // Находим пользователя
    const userResult = await pool.query(
      "SELECT id FROM users WHERE telegram_id = $1",
      [userTelegramId]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    const userId = userResult.rows[0].id;

    // Проверяем cooldown (серверная защита)
    const cooldownKey = `${userId}_${beatId}`;
    const lastPlayTime = playCooldowns.get(cooldownKey);
    const now = Date.now();

    if (lastPlayTime && now - lastPlayTime < PLAY_COOLDOWN_MS) {
      // Cooldown активен - отвечаем ок, но НЕ записываем в БД
      console.log(`⏳ Cooldown активен для user=${userId}, beat=${beatId}`);
      return res.json({ ok: true, recorded: false });
    }

    // Обновляем время последнего прослушивания
    playCooldowns.set(cooldownKey, now);

    // Записываем прослушивание в БД
    await pool.query(
      `INSERT INTO beat_plays (beat_id, user_id, played_at)
       VALUES ($1, $2, NOW())`,
      [beatId, userId]
    );

    console.log(`🎵 Прослушивание записано: beat_id=${beatId}, user_id=${userId}`);

    res.json({ ok: true, recorded: true });
  } catch (e) {
    console.error("POST /api/beats/:beatId/play error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * POST /api/beats/:beatId/purchase
 * Подтвердить покупку бита через TON
 */
app.post("/api/beats/:beatId/purchase", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId.replace("beat_", "");
    const beatId = parseInt(beatIdParam, 10);
    const { buyerTelegramId, licenseKey, transactionHash, tonAmount, usdPrice } = req.body;

    if (!buyerTelegramId || !licenseKey || !transactionHash) {
      return res.status(400).json({ ok: false, error: "missing-parameters" });
    }

    console.log(`💎 Подтверждение покупки бита ${beatId}:`, {
      buyerTelegramId,
      licenseKey,
      transactionHash,
      tonAmount,
      usdPrice,
    });

    // Получаем информацию о бите и продавце
    const beatResult = await pool.query(
      `SELECT b.*, u.id as seller_user_id, u.telegram_id as seller_telegram_id, u.wallet_address as seller_wallet_address
       FROM beats b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [beatId]
    );

    if (!beatResult.rows[0]) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    const beat = beatResult.rows[0];

    // Получаем информацию о покупателе
    const buyerResult = await pool.query(
      "SELECT id, username FROM users WHERE telegram_id = $1",
      [buyerTelegramId]
    );

    if (!buyerResult.rows[0]) {
      return res.status(404).json({ ok: false, error: "buyer-not-found" });
    }

    const buyer = buyerResult.rows[0];
    const buyerId = buyer.id;

    // Получаем информацию о лицензии
    const licenseResult = await pool.query(
      `SELECT id, name, incl_mp3, incl_wav, incl_stems
       FROM licenses
       WHERE user_id = $1 AND lic_key = $2`,
      [beat.seller_user_id, licenseKey]
    );

    if (!licenseResult.rows[0]) {
      return res.status(404).json({ ok: false, error: "license-not-found" });
    }

    const license = licenseResult.rows[0];

    // Проверяем транзакцию в TON blockchain
    console.log("🔍 Начинаем верификацию TON транзакции покупки бита...");
    const { verifyBeatPurchaseTransaction } = await import("./ton-payment.js");

    // Получаем wallet address покупателя
    const buyerWalletResult = await pool.query(
      "SELECT wallet_address FROM users WHERE telegram_id = $1",
      [buyerTelegramId]
    );

    const buyerWalletAddress = buyerWalletResult.rows[0]?.wallet_address;

    if (!buyerWalletAddress) {
      console.error("❌ У покупателя нет привязанного кошелька");
      return res.status(400).json({ ok: false, error: "buyer-wallet-not-found" });
    }

    // Получаем wallet address продавца
    const sellerWalletAddress = beat.seller_wallet_address;

    if (!sellerWalletAddress) {
      console.error("❌ У продавца нет привязанного кошелька");
      return res.status(400).json({ ok: false, error: "seller-wallet-not-found" });
    }

    // Верифицируем транзакцию (проверяем что деньги пришли продавцу)
    const isValid = await verifyBeatPurchaseTransaction(
      transactionHash,
      tonAmount,
      buyerWalletAddress,
      sellerWalletAddress
    );

    if (!isValid) {
      console.error("❌ Транзакция не прошла верификацию");
      return res.status(400).json({ ok: false, error: "invalid-transaction" });
    }

    console.log("✅ Транзакция покупки бита успешно верифицирована");

    // Сохраняем покупку в БД
    await pool.query(
      `INSERT INTO purchases (user_id, beat_id, license_id, price, payment_method)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        buyerId,
        beatId,
        license.id,
        usdPrice,
        "TON", // метод оплаты
      ]
    );

    console.log(`✅ Покупка сохранена в БД: бит ${beatId}, лицензия ${licenseKey}`);

    // Создаем уведомление для продюсера
    await createPurchaseNotification(beat.seller_user_id, {
      beatTitle: beat.title,
      beatCoverUrl: beat.cover_url,
      price: usdPrice,
      licenseName: license.name,
      buyerUsername: buyer.username || undefined,
    });

    // Создаем и отправляем ZIP-архив
    try {
      const { createBeatZipArchive, sendZipToUser } = await import("./beat-purchase.js");

      const zipBuffer = await createBeatZipArchive(
        beat.title,
        license.name,
        {
          mp3TaggedUrl: beat.mp3_tagged_url,
          mp3UntaggedUrl: beat.mp3_untagged_url,
          wavUrl: beat.wav_url,
          stemsUrl: beat.stems_url,
        },
        {
          incl_mp3: license.incl_mp3,
          incl_wav: license.incl_wav,
          incl_stems: license.incl_stems,
        }
      );

      const zipFileName = `${beat.title}_${license.name}.zip`;
      const caption = `🎵 ${beat.title}\n📝 Лицензия: ${license.name}\n💰 Оплачено: $${usdPrice} (${tonAmount} TON)`;

      await sendZipToUser(buyerTelegramId, zipBuffer, zipFileName, caption);

      console.log(`✅ ZIP-архив отправлен покупателю ${buyerTelegramId}`);
    } catch (zipError) {
      console.error("Ошибка создания/отправки ZIP:", zipError);

      // Отправляем сообщение об ошибке пользователю
      const { sendErrorMessage } = await import("./beat-purchase.js");
      await sendErrorMessage(
        buyerTelegramId,
        "Произошла ошибка при подготовке файлов. Мы уже работаем над решением проблемы!"
      );
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/beats/:beatId/purchase error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * POST /api/cart/purchase
 * Обработка покупки корзины (нескольких битов)
 */
app.post("/api/cart/purchase", async (req, res) => {
  try {
    const { buyerTelegramId, items, transactionHash, tonAmount, totalUsd } = req.body;

    console.log(`💳 Покупка корзины от пользователя ${buyerTelegramId}:`, {
      itemsCount: items?.length,
      totalUsd,
      tonAmount,
    });

    // Валидация
    if (!buyerTelegramId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "invalid-request" });
    }

    // Получаем покупателя
    const buyer = await db.findUserByTelegramId(buyerTelegramId);
    if (!buyer) {
      return res.status(404).json({ ok: false, error: "buyer-not-found" });
    }

    // Обрабатываем каждую покупку
    for (const item of items) {
      const { beatId, licenseKey, price } = item;

      // Получаем информацию о бите
      const beatResult = await pool.query(
        `SELECT b.*, u.id as seller_user_id, u.telegram_id as seller_telegram_id
         FROM beats b
         JOIN users u ON b.user_id = u.id
         WHERE b.id = $1`,
        [beatId.replace("beat_", "")]
      );

      if (beatResult.rows.length === 0) {
        console.error(`❌ Бит ${beatId} не найден`);
        continue;
      }

      const beat = beatResult.rows[0];

      // Получаем информацию о лицензии
      const licenseResult = await pool.query(
        `SELECT * FROM licenses WHERE user_id = $1 AND lic_key = $2`,
        [beat.seller_user_id, licenseKey]
      );

      if (licenseResult.rows.length === 0) {
        console.error(`❌ Лицензия ${licenseKey} не найдена`);
        continue;
      }

      const license = licenseResult.rows[0];

      // Сохраняем покупку в БД
      await pool.query(
        `INSERT INTO purchases (buyer_id, seller_id, beat_id, license_id, amount, method, payment_ref, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          buyer.id,
          beat.seller_user_id,
          beat.id,
          license.id,
          price,
          "TON",
          JSON.stringify({ transactionHash, tonAmount, totalUsd, itemPrice: price }),
        ]
      );

      console.log(`✅ Покупка сохранена: ${beat.title} (${license.name})`);

      // Создаем уведомление для продюсера
      await createPurchaseNotification(beat.seller_user_id, {
        beatTitle: beat.title,
        beatCoverUrl: beat.cover_url,
        price: price,
        licenseName: license.name,
        buyerUsername: buyer.username || undefined,
      });

      // Создаем и отправляем ZIP-архив
      try {
        const { createBeatZipArchive, sendZipToUser, sendErrorMessage } = await import("./beat-purchase.js");

        const files = {
          mp3TaggedUrl: beat.mp3_tagged_url,
          mp3UntaggedUrl: beat.mp3_untagged_url,
          wavUrl: beat.wav_url,
          stemsUrl: beat.stems_url,
        };

        const includeFiles = {
          incl_mp3: license.incl_mp3 || false,
          incl_wav: license.incl_wav || false,
          incl_stems: license.incl_stems || false,
        };

        const zipBuffer = await createBeatZipArchive(beat.title, license.name, files, includeFiles);

        const caption = `✅ Ваша покупка: ${beat.title}\n📦 Лицензия: ${license.name}\n💰 Цена: $${price}`;

        await sendZipToUser(buyerTelegramId, zipBuffer, `${beat.title}_${license.name}.zip`, caption);

        console.log(`✅ ZIP-архив отправлен пользователю ${buyerTelegramId}`);
      } catch (error) {
        console.error(`❌ Ошибка отправки ZIP для бита ${beatId}:`, error);
        const { sendErrorMessage } = await import("./beat-purchase.js");
        await sendErrorMessage(
          buyerTelegramId,
          `Произошла ошибка при отправке файлов для бита "${beat.title}". Пожалуйста, свяжитесь с поддержкой.`
        );
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/cart/purchase error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/licenses
 * Получить лицензии продюсера
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
      "SELECT id, lic_key, name, description, default_price, min_price, incl_mp3, incl_wav, incl_stems FROM licenses WHERE user_id = $1 AND is_hidden = FALSE ORDER BY id ASC",
      [user.id]
    );

    const licenses = result.rows.map((row: any) => ({
      id: row.lic_key,
      name: row.name,
      description: row.description || null,
      defaultPrice: row.default_price ? parseFloat(row.default_price) : null,
      minPrice: row.min_price ? parseFloat(row.min_price) : null,
      fileType: (row.incl_stems ? "mp3_wav_stems" : row.incl_wav ? "mp3_wav" : row.incl_mp3 ? "untagged_mp3" : "tagged_mp3"),
    }));

    res.json({ ok: true, licenses });
  } catch (e) {
    console.error("GET /api/users/:telegramId/licenses error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/licenses
 * Обновить лицензии продюсера
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

    console.log(`🔄 Обновление лицензий для пользователя ${user.id}, количество: ${licenses.length}`);

    // Обновляем/вставляем лицензии
    for (const lic of licenses) {
      // Определяем состав файлов из fileType
      const incl_mp3 = lic.fileType && lic.fileType.includes("mp3");
      const incl_wav = lic.fileType && lic.fileType.includes("wav");
      const incl_stems = lic.fileType && lic.fileType.includes("stems");

      await pool.query(
        `INSERT INTO licenses (user_id, lic_key, name, description, default_price, min_price, incl_mp3, incl_wav, incl_stems)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id, lic_key)
         DO UPDATE SET name = $3, description = $4, default_price = $5, min_price = $6, incl_mp3 = $7, incl_wav = $8, incl_stems = $9, updated_at = NOW()`,
        [user.id, lic.id, lic.name, lic.description || null, lic.defaultPrice, lic.minPrice || null, incl_mp3, incl_wav, incl_stems]
      );
      console.log(`✅ Обновлена лицензия ${lic.id}: ${lic.name}, цена: ${lic.defaultPrice}, мин. цена: ${lic.minPrice}`);
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

    // Получаем корзину с информацией о битах и лицензиях (используем view v_beat_licenses)
    const result = await pool.query(
      `SELECT
        c.id,
        c.beat_id,
        c.license_id,
        c.added_at,
        b.title as beat_title,
        l.lic_key as license_key,
        l.name as license_name,
        vbl.final_price as license_price
       FROM cart c
       JOIN beats b ON c.beat_id = b.id
       JOIN licenses l ON c.license_id = l.id
       LEFT JOIN v_beat_licenses vbl ON vbl.beat_id = c.beat_id AND vbl.license_id = c.license_id
       WHERE c.user_id = $1
       ORDER BY c.added_at DESC`,
      [user.id]
    );

    const cartItems = result.rows.map((row: any) => ({
      beatId: `beat_${row.beat_id}`,
      license: row.license_key,
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

    if (isNaN(numericBeatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    // licenseId теперь это lic_key ("basic", "premium", "unlimited")
    // Находим автора бита
    const beatResult = await pool.query(
      "SELECT user_id FROM beats WHERE id = $1",
      [numericBeatId]
    );

    if (beatResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    const beatAuthorId = beatResult.rows[0].user_id;

    // Находим ID лицензии из таблицы licenses автора бита
    const licenseResult = await pool.query(
      "SELECT id FROM licenses WHERE user_id = $1 AND lic_key = $2",
      [beatAuthorId, licenseId]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "license-not-found" });
    }

    const userLicenseId = licenseResult.rows[0].id;

    // Добавляем в корзину (или игнорируем если уже есть из-за UNIQUE constraint)
    await pool.query(
      `INSERT INTO cart (user_id, beat_id, license_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, beat_id, license_id) DO NOTHING`,
      [user.id, numericBeatId, userLicenseId]
    );

    console.log(`✅ Добавлено в корзину: user=${user.id}, beat=${numericBeatId}, license=${licenseId}(${userLicenseId})`);
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

    if (isNaN(numericBeatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    // licenseId теперь это lic_key ("basic", "premium", "unlimited")
    // Находим автора бита
    const beatResult = await pool.query(
      "SELECT user_id FROM beats WHERE id = $1",
      [numericBeatId]
    );

    if (beatResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    const beatAuthorId = beatResult.rows[0].user_id;

    // Находим ID лицензии из таблицы licenses автора бита
    const licenseResult = await pool.query(
      "SELECT id FROM licenses WHERE user_id = $1 AND lic_key = $2",
      [beatAuthorId, licenseId]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "license-not-found" });
    }

    const userLicenseId = licenseResult.rows[0].id;

    await pool.query(
      `DELETE FROM cart
       WHERE user_id = $1 AND beat_id = $2 AND license_id = $3`,
      [user.id, numericBeatId, userLicenseId]
    );

    console.log(`✅ Удалено из корзины: user=${user.id}, beat=${numericBeatId}, license=${licenseId}(${userLicenseId})`);
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
        b.key_sig as "key",
        b.cover_url as "coverUrl",
        b.mp3_tagged_url as "mp3Url",
        b.mp3_untagged_url as "mp3UntaggedUrl",
        b.wav_url as "wavUrl",
        b.stems_url as "stemsUrl",
        b.free_download,
        b.views_count,
        b.sales_count,
        b.created_at,
        u.id as author_id,
        u.username as author_name,
        u.telegram_id as author_telegram_id,
        u.wallet_address as seller_wallet_address,
        json_agg(
          json_build_object(
            'license_key', l.lic_key,
            'license_name', l.name,
            'price', COALESCE(blp.price, l.default_price),
            'incl_mp3', l.incl_mp3,
            'incl_wav', l.incl_wav,
            'incl_stems', l.incl_stems
          )
        ) FILTER (WHERE l.id IS NOT NULL AND l.is_hidden = FALSE) as licenses
      FROM beats b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN licenses l ON l.user_id = b.user_id
      LEFT JOIN bl_prices blp ON blp.beat_id = b.id AND blp.license_id = l.id
    `;

    // Если указан userId, фильтруем по пользователю
    const params: any[] = [];
    if (userId && !isNaN(userId)) {
      query += ` WHERE u.telegram_id = $1 AND (b.is_deleted = FALSE OR b.is_deleted IS NULL)`;
      params.push(userId);
      console.log(`📦 Загрузка битов пользователя ${userId}`);
    } else {
      query += ` WHERE (b.is_deleted = FALSE OR b.is_deleted IS NULL)`;
      console.log(`📦 Загрузка всех битов (глобальный битстор)`);
    }

    query += ` GROUP BY b.id, u.id ORDER BY b.created_at DESC`;

    const result = await pool.query(query, params);

    console.log(`🔍 SQL вернул ${result.rows.length} битов`);
    if (result.rows.length > 0) {
      console.log(`🔍 Первый бит:`, {
        id: result.rows[0].id,
        title: result.rows[0].title,
        licenses: result.rows[0].licenses
      });
    }

    const beats = result.rows.map((row: any) => {
      console.log(`🔍 Обрабатываем бит ${row.id} "${row.title}":`, {
        licenses: row.licenses,
        licensesType: typeof row.licenses,
        licensesIsArray: Array.isArray(row.licenses)
      });

      const prices = (row.licenses || []).reduce((acc: any, lic: any) => {
        const key = lic.license_key;
        const name = lic.license_name;

        if (key) {
          acc[key] = {
            name: name || null,
            price: lic.price ? parseFloat(lic.price) : null,
            incl_mp3: lic.incl_mp3 || false,
            incl_wav: lic.incl_wav || false,
            incl_stems: lic.incl_stems || false
          };
        }
        return acc;
      }, {});

      return {
        id: `beat_${row.id}`,
        title: row.title,
        key: row.key,
        bpm: row.bpm,
        coverUrl: row.coverUrl,
        files: {
          mp3: row.mp3Url,
          mp3Untagged: row.mp3UntaggedUrl || null,
          wav: row.wavUrl,
          stems: row.stemsUrl || "",
        },
        prices,
        freeDownload: row.free_download || false,
        author: row.author_id ? {
          id: `user:${row.author_telegram_id}`,
          name: row.author_name || "Unknown",
          slug: row.author_name?.toLowerCase().replace(/\s+/g, "-") || "unknown",
        } : null,
        seller: row.author_id ? {
          id: `user:${row.author_telegram_id}`,
          name: row.author_name || "Unknown",
          walletAddress: row.seller_wallet_address || null,
        } : null,
      };
    });

    res.json({ ok: true, beats });
  } catch (e) {
    console.error("GET /api/beats error:", e);
    res.status(500).json({ ok: false, error: "read-failed" });
  }
});

/**
 * PATCH /api/beats/:beatId/prices
 * Обновить цены лицензий для бита
 */
app.patch("/api/beats/:beatId/prices", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId;
    const beatId = beatIdParam.startsWith("beat_")
      ? parseInt(beatIdParam.replace("beat_", ""), 10)
      : parseInt(beatIdParam, 10);

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    const prices = req.body?.prices;
    if (!prices || typeof prices !== "object") {
      return res.status(400).json({ ok: false, error: "invalid-prices" });
    }

    console.log(`💰 Обновление цен для бита ${beatId}:`, prices);

    // Получаем бит из БД
    const beat = await db.getBeatById(beatId);
    if (!beat) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    // Обновляем цены для каждой лицензии
    // prices = { "basic": 10, "premium": 20, ... } или { "1": 10, "2": 20, ... }
    for (const [licenseKey, price] of Object.entries(prices)) {
      if (typeof price !== "number") continue;

      // Пытаемся найти license_id по ключу (строковому или числовому)
      let licenseId: number | null = null;

      // Сначала проверяем, является ли ключ числом
      const numericId = parseInt(licenseKey, 10);
      if (!isNaN(numericId)) {
        licenseId = numericId;
      } else {
        // Если ключ строковый (например, 'basic', 'premium'), ищем в таблице licenses
        const licenseResult = await pool.query(
          `SELECT id FROM licenses WHERE user_id = $1 AND lic_key = $2`,
          [beat.user_id, licenseKey]
        );
        if (licenseResult.rows.length > 0) {
          licenseId = licenseResult.rows[0].id;
        }
      }

      if (!licenseId) {
        console.warn(`⚠️ Не найдена лицензия для ключа "${licenseKey}"`);
        continue;
      }

      // Используем UPSERT для bl_prices
      await pool.query(
        `INSERT INTO bl_prices (beat_id, license_id, price)
         VALUES ($1, $2, $3)
         ON CONFLICT (beat_id, license_id)
         DO UPDATE SET price = $3, updated_at = NOW()`,
        [beatId, licenseId, price]
      );
    }

    console.log(`✅ Цены обновлены для бита ${beatId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/beats/:beatId/prices error:", e);
    res.json({ ok: false, error: "update-failed" });
  }
});

/**
 * DELETE /api/beats/:beatId
 * Удалить бит
 */
app.delete("/api/beats/:beatId", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId;
    const beatId = beatIdParam.startsWith("beat_")
      ? parseInt(beatIdParam.replace("beat_", ""), 10)
      : parseInt(beatIdParam, 10);

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    console.log(`🗑️ Удаление бита ${beatId}`);

    // Проверяем существование бита
    const beat = await db.getBeatById(beatId);
    if (!beat) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    // Проверяем, был ли бит куплен
    const purchaseCheck = await pool.query(
      "SELECT COUNT(*) as count FROM purchases WHERE beat_id = $1",
      [beatId]
    );
    const wasPurchased = parseInt(purchaseCheck.rows[0].count, 10) > 0;

    if (wasPurchased) {
      // МЯГКОЕ УДАЛЕНИЕ: бит покупали - помечаем как удаленный, удаляем все файлы кроме обложки
      console.log(`⚠️ Бит ${beatId} был куплен - применяем мягкое удаление`);

      // Помечаем бит как удаленный в БД и обнуляем ссылки на удаляемые файлы
      await pool.query(
        "UPDATE beats SET is_deleted = TRUE, mp3_tagged_url = NULL, mp3_untagged_url = NULL, wav_url = NULL, stems_url = NULL WHERE id = $1",
        [beatId]
      );

      // Удаляем все файлы кроме обложки (аудио + ZIP со стемами)
      const filesToDelete: string[] = [];
      if (beat.mp3_tagged_url) filesToDelete.push(beat.mp3_tagged_url);
      if (beat.mp3_untagged_url) filesToDelete.push(beat.mp3_untagged_url);
      if (beat.wav_url) filesToDelete.push(beat.wav_url);
      if (beat.stems_url) filesToDelete.push(beat.stems_url); // ZIP-архив со стемами

      if (filesToDelete.length > 0) {
        console.log(`🗑️ Удаление ${filesToDelete.length} файлов из S3 (обложка сохранена)...`);
        deleteMultipleFromS3(filesToDelete).then((deletedCount) => {
          console.log(`✅ Удалено файлов из S3: ${deletedCount}/${filesToDelete.length}`);
        }).catch((error) => {
          console.error(`❌ Ошибка при удалении файлов из S3:`, error);
        });
      }

      console.log(`✅ Бит ${beatId} помечен как удаленный (мягкое удаление)`);
    } else {
      // ПОЛНОЕ УДАЛЕНИЕ: бит не покупали - удаляем полностью из БД и все файлы из S3
      console.log(`✅ Бит ${beatId} не покупали - применяем полное удаление`);

      // Собираем ВСЕ файлы для удаления из S3 (включая обложку)
      const filesToDelete: string[] = [];
      if (beat.cover_url) filesToDelete.push(beat.cover_url);
      if (beat.mp3_tagged_url) filesToDelete.push(beat.mp3_tagged_url);
      if (beat.mp3_untagged_url) filesToDelete.push(beat.mp3_untagged_url);
      if (beat.wav_url) filesToDelete.push(beat.wav_url);
      if (beat.stems_url) filesToDelete.push(beat.stems_url); // ZIP-архив со стемами

      // Удаляем бит из БД (каскадно удалятся связанные записи в cart, beat_licenses и т.д.)
      await db.deleteBeat(beatId);

      // Удаляем все файлы из S3
      if (filesToDelete.length > 0) {
        console.log(`🗑️ Удаление ${filesToDelete.length} файлов из S3...`);
        deleteMultipleFromS3(filesToDelete).then((deletedCount) => {
          console.log(`✅ Удалено файлов из S3: ${deletedCount}/${filesToDelete.length}`);
        }).catch((error) => {
          console.error(`❌ Ошибка при удалении файлов из S3:`, error);
        });
      }

      console.log(`✅ Бит ${beatId} полностью удален из БД и S3`);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/beats/:beatId error:", e);
    res.status(500).json({ ok: false, error: "delete-failed" });
  }
});

/**
 * PATCH /api/beats/:beatId
 * Обновить метаданные бита (title, bpm, key, freeDownload)
 */
app.patch("/api/beats/:beatId", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId;
    const beatId = beatIdParam.startsWith("beat_")
      ? parseInt(beatIdParam.replace("beat_", ""), 10)
      : parseInt(beatIdParam, 10);

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    const { title, bpm, key, freeDownload } = req.body;

    console.log(`📝 Обновление бита ${beatId}:`, { title, bpm, key, freeDownload });

    // Проверяем существование бита
    const beat = await db.getBeatById(beatId);
    if (!beat) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    // Обновляем бит
    await db.updateBeat(beatId, {
      title: title?.trim(),
      bpm,
      key_sig: key,
      free_download: freeDownload !== undefined ? freeDownload : undefined,
    });

    console.log(`✅ Бит ${beatId} успешно обновлен`);
    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/beats/:beatId error:", e);
    res.status(500).json({ ok: false, error: "update-failed" });
  }
});

/**
 * PUT /api/beats/:beatId
 * Полное обновление бита (метаданные, цены, файлы)
 */
app.put("/api/beats/:beatId", async (req, res) => {
  try {
    const beatIdParam = req.params.beatId;
    const beatId = beatIdParam.startsWith("beat_")
      ? parseInt(beatIdParam.replace("beat_", ""), 10)
      : parseInt(beatIdParam, 10);

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    const { title, bpm, key, freeDownload, prices, fileUrls } = req.body;

    console.log(`📝 Полное обновление бита ${beatId}:`, { title, bpm, key, freeDownload, prices, fileUrls });

    // Проверяем существование бита
    const beat = await db.getBeatById(beatId);
    if (!beat) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    // Обновляем метаданные бита
    await db.updateBeat(beatId, {
      title: title?.trim(),
      bpm,
      key_sig: key,
      free_download: freeDownload !== undefined ? freeDownload : undefined,
      cover_url: fileUrls?.cover,
      mp3_tagged_url: fileUrls?.mp3,
      mp3_untagged_url: fileUrls?.mp3Untagged,
      wav_url: fileUrls?.wav,
      stems_url: fileUrls?.stems,
    });

    // Обновляем цены для каждой лицензии
    if (prices) {
      for (const [licenseKey, price] of Object.entries(prices)) {
        if (typeof price === "number" && price > 0) {
          // Получаем license_id по ключу (basic, premium и т.д.)
          const licenseResult = await pool.query(
            `SELECT id FROM licenses WHERE user_id = $1 AND lic_key = $2`,
            [beat.user_id, licenseKey]
          );

          if (licenseResult.rows.length === 0) {
            console.warn(`⚠️ Лицензия с ключом ${licenseKey} не найдена для пользователя ${beat.user_id}`);
            continue;
          }

          const licenseId = licenseResult.rows[0].id;

          // Обновляем или создаём цену для этого бита и лицензии в bl_prices
          await pool.query(
            `INSERT INTO bl_prices (beat_id, license_id, price)
             VALUES ($1, $2, $3)
             ON CONFLICT (beat_id, license_id)
             DO UPDATE SET price = EXCLUDED.price`,
            [beatId, licenseId, price]
          );

          console.log(`✅ Обновлена цена для бита ${beatId}, лицензия ${licenseKey}: ${price}`);
        }
      }
    }

    console.log(`✅ Бит ${beatId} успешно обновлен (полное обновление)`);
    res.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/beats/:beatId error:", e);
    res.status(500).json({ ok: false, error: "update-failed" });
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
      const telegramId = req.body?.telegramId; // ID пользователя в Telegram
      const beatTitle = req.body?.beatTitle || "untitled"; // Название бита

      if (!file) {
        return res.status(400).json({ ok: false, error: "no-file" });
      }

      if (!telegramId) {
        return res.status(400).json({ ok: false, error: "no-telegram-id" });
      }

      console.log(`📤 Immediate upload: ${file.originalname} (${fileType}) for user ${telegramId}, beat: ${beatTitle}`);

      // Получаем данные пользователя
      const user = await db.findUserByTelegramId(parseInt(telegramId, 10));
      if (!user) {
        return res.status(404).json({ ok: false, error: "user-not-found" });
      }

      const username = user.username || `user${telegramId}`;

      // Определяем фиксированное имя файла в зависимости от типа
      let fixedFilename: string;
      if (fileType === "cover") {
        fixedFilename = "cover.jpg"; // Обложка всегда cover.jpg
      } else if (fileType === "mp3") {
        fixedFilename = "download_tagged.mp3"; // MP3 с тегом
      } else if (fileType === "wav") {
        fixedFilename = "untagged.wav"; // WAV файл
      } else if (fileType === "stems") {
        fixedFilename = "track_stems.zip"; // Stems архив
      } else {
        // Fallback на оригинальное имя (только расширение)
        const ext = path.extname(file.originalname) || "";
        fixedFilename = `file${ext}`;
      }

      // Генерируем S3 ключ с фиксированным именем файла
      const s3Key = generateS3KeyForBeat(
        username,
        parseInt(telegramId, 10),
        beatTitle,
        fixedFilename
      );

      // Загружаем на S3
      const url = await uploadToS3(
        file.path,
        s3Key,
        getMimeType(file.originalname)
      );

      // Если это WAV файл, создаем MP3 без тега для лицензий
      let mp3UntaggedUrl = null;
      if (fileType === "wav") {
        console.log(`🎵 WAV файл обнаружен, создаем MP3 без тега...`);

        try {
          const { convertWavToUntaggedMp3 } = await import("./audio-converter.js");

          // Путь для MP3 без тега
          const mp3UntaggedPath = file.path.replace(/\.(wav|WAV)$/, "_untagged.mp3");

          // Конвертируем WAV → MP3 без тега
          await convertWavToUntaggedMp3(file.path, mp3UntaggedPath);

          // Загружаем MP3 без тега на S3 с фиксированным именем
          const mp3UntaggedS3Key = generateS3KeyForBeat(
            username,
            parseInt(telegramId, 10),
            beatTitle,
            "mp3_untagged.mp3" // Фиксированное имя для MP3 без тега
          );
          mp3UntaggedUrl = await uploadToS3(
            mp3UntaggedPath,
            mp3UntaggedS3Key,
            "audio/mpeg"
          );

          // Удаляем временный MP3 файл
          await fs.unlink(mp3UntaggedPath).catch(() => {});

          console.log(`✅ MP3 без тега создан: ${mp3UntaggedUrl}`);
        } catch (e) {
          console.error(`❌ Ошибка создания MP3 без тега:`, e);
          // Не прерываем процесс, просто логируем ошибку
        }
      }

      // Удаляем временный файл
      await fs.unlink(file.path).catch(() => {});

      res.json({
        ok: true,
        url,
        mp3UntaggedUrl // Вернем URL MP3 без тега (если был создан)
      });
    } catch (e) {
      console.error("POST /api/upload-file error:", e);
      res.status(500).json({ ok: false, error: "upload-failed" });
    }
  }
);

/* ---------- POST /api/cleanup-temp-files ---------- */
// Удаление временных файлов из S3 (когда пользователь закрывает модалку без сохранения)
app.post("/api/cleanup-temp-files", express.json(), async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ ok: false, error: "invalid-urls" });
    }

    console.log(`🗑️ Удаление ${urls.length} временных файлов...`);

    // Удаляем все файлы
    await deleteMultipleFromS3(urls);

    console.log(`✅ Временные файлы удалены`);
    res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/cleanup-temp-files error:", e);
    res.status(500).json({ ok: false, error: "cleanup-failed" });
  }
});

/* ---------- POST /api/upload-avatar ---------- */
// Загрузка аватара пользователя
app.post(
  "/api/upload-avatar",
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const telegramId = req.body?.telegramId;

      if (!file) {
        return res.status(400).json({ ok: false, error: "no-file" });
      }

      if (!telegramId) {
        return res.status(400).json({ ok: false, error: "no-telegram-id" });
      }

      console.log(`📤 Avatar upload for user ${telegramId}`);

      // Получаем данные пользователя
      const user = await db.findUserByTelegramId(parseInt(telegramId, 10));
      if (!user) {
        return res.status(404).json({ ok: false, error: "user-not-found" });
      }

      // Удаляем старый аватар из S3, если он есть
      if (user.avatar_url) {
        console.log(`🗑️ Удаляем старый аватар из S3: ${user.avatar_url}`);
        await deleteMultipleFromS3([user.avatar_url]).catch((e) => {
          console.warn("⚠️ Не удалось удалить старый аватар:", e);
        });
      }

      const username = user.username || `user${telegramId}`;

      // Генерируем S3 ключ для аватара
      const s3Key = generateS3KeyForAvatar(
        username,
        parseInt(telegramId, 10),
        file.originalname
      );

      // Загружаем на S3
      const url = await uploadToS3(
        file.path,
        s3Key,
        getMimeType(file.originalname)
      );

      // Обновляем avatar_url в БД
      await db.updateUser(user.id, { avatar_url: url });

      // Удаляем временный файл
      await fs.unlink(file.path).catch(() => {});

      console.log(`✅ Новый аватар загружен: ${url}`);
      res.json({ ok: true, url });
    } catch (e) {
      console.error("POST /api/upload-avatar error:", e);
      res.status(500).json({ ok: false, error: "upload-failed" });
    }
  }
);

/* ---------- DELETE /api/users/:telegramId/avatar ---------- */
// Удаление аватара пользователя
app.delete("/api/users/:telegramId/avatar", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    console.log(`🗑️ Deleting avatar for user ${telegramId}`);

    // Получаем данные пользователя
    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Удаляем аватар из S3, если он есть
    if (user.avatar_url) {
      console.log(`🗑️ Удаляем аватар из S3: ${user.avatar_url}`);
      await deleteMultipleFromS3([user.avatar_url]).catch((e) => {
        console.warn("⚠️ Не удалось удалить аватар из S3:", e);
      });
    }

    // Обновляем avatar_url в БД (устанавливаем null)
    await db.updateUser(user.id, { avatar_url: null });

    console.log(`✅ Аватар удалён для пользователя ${telegramId}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/users/:telegramId/avatar error:", e);
    res.status(500).json({ ok: false, error: "delete-failed" });
  }
});

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
      console.log(`📋 Полученные цены:`, prices);
    } catch (e) {
      console.warn("⚠️ Не удалось распарсить prices:", e);
    }

    // Автор (user_id из telegram_id)
    const authorId = String(req.body?.authorId || "").trim();

    // URL файлов (уже загружены через /api/upload-file)
    const coverUrl = String(req.body?.coverUrl || "").trim();
    const mp3Url = String(req.body?.mp3Url || "").trim(); // MP3 с тегом
    const mp3UntaggedUrl = String(req.body?.mp3UntaggedUrl || "").trim(); // MP3 без тега (авто-созданный)
    const wavUrl = String(req.body?.wavUrl || "").trim();
    const stemsUrl = String(req.body?.stemsUrl || "").trim();

    // Бесплатное скачивание
    const freeDownload = Boolean(req.body?.freeDownload);

    if (!title || !bpm || !coverUrl || !mp3Url || !wavUrl || !authorId) {
      return res.status(400).json({ ok: false, error: "required-missing" });
    }

    console.log(`✅ Creating beat "${title}" with pre-uploaded files, free_download=${freeDownload}`);

    // Получаем user_id из authorId (формат: "user:781620101")
    const telegramId = authorId.startsWith("user:")
      ? parseInt(authorId.split(":")[1], 10)
      : parseInt(authorId, 10);

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    // Перемещаем файлы из _temp_ в финальную папку с названием бита
    console.log(`📁 Moving files from _temp_ to "${title}" folder...`);
    const bucketUrl = process.env.S3_BUCKET_URL || `https://storage.yandexcloud.net/${process.env.S3_BUCKET || "beatstore"}`;
    const username = user.username || `user${telegramId}`;

    // Функция для перемещения файла
    const moveFile = async (url: string): Promise<string> => {
      if (!url) return url;

      // Извлекаем S3 ключ из URL
      const s3Key = url.replace(bucketUrl + "/", "").replace(bucketUrl, "");

      // Проверяем, содержит ли путь _temp_
      if (!s3Key.includes("/_temp_")) {
        console.log(`⏭️ File already in final location: ${s3Key}`);
        return url;
      }

      // Создаем новый ключ с названием бита
      const filename = s3Key.split("/").pop() || "file";
      const newS3Key = generateS3KeyForBeat(username, telegramId, title, filename);

      // Перемещаем файл
      const newUrl = await moveFileInS3(s3Key, newS3Key);
      return newUrl;
    };

    // Перемещаем все файлы
    const finalCoverUrl = await moveFile(coverUrl);
    const finalMp3Url = await moveFile(mp3Url);
    let finalMp3UntaggedUrl = mp3UntaggedUrl ? await moveFile(mp3UntaggedUrl) : null;
    const finalWavUrl = await moveFile(wavUrl);
    const finalStemsUrl = stemsUrl ? await moveFile(stemsUrl) : null;

    console.log(`✅ Files moved successfully`);

    // Если MP3 без тега не был загружен, генерируем его из WAV
    if (!finalMp3UntaggedUrl && finalWavUrl) {
      console.log(`🎵 Генерация MP3 без тега из WAV...`);
      try {
        const { convertWavToUntaggedMp3 } = await import("./audio-converter.js");
        const { GetObjectCommand, PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");

        // Инициализируем S3 клиента
        const s3Client = new S3Client({
          region: process.env.S3_REGION || "auto",
          endpoint: process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY || "",
            secretAccessKey: process.env.S3_SECRET_KEY || "",
          },
        });

        // Скачиваем WAV из S3
        const wavS3Key = finalWavUrl.replace(`https://storage.yandexcloud.net/${process.env.S3_BUCKET}/`, "");
        const getCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET || "",
          Key: wavS3Key,
        });
        const wavResponse = await s3Client.send(getCommand);
        const wavStream = wavResponse.Body as Readable;

        // Сохраняем WAV во временный файл
        const tempWavPath = path.join(TEMP_DIR, `${Date.now()}_${title.replace(/[^a-z0-9]/gi, "_")}.wav`);
        const wavWriteStream = createWriteStream(tempWavPath);
        await new Promise((resolve, reject) => {
          wavStream.pipe(wavWriteStream);
          wavStream.on("end", resolve);
          wavStream.on("error", reject);
        });

        console.log(`📥 WAV скачан во временный файл: ${tempWavPath}`);

        // Конвертируем WAV в MP3 без тега
        const tempMp3UntaggedPath = path.join(TEMP_DIR, `${Date.now()}_${title.replace(/[^a-z0-9]/gi, "_")}_untagged.mp3`);
        await convertWavToUntaggedMp3(tempWavPath, tempMp3UntaggedPath);

        console.log(`✅ MP3 без тега создан: ${tempMp3UntaggedPath}`);

        // Загружаем MP3 без тега в S3
        const mp3UntaggedFilename = "mp3_untagged.mp3";
        const mp3UntaggedS3Key = generateS3KeyForBeat(username, telegramId, title, mp3UntaggedFilename);
        const mp3Buffer = await fs.readFile(tempMp3UntaggedPath);

        const putCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET || "",
          Key: mp3UntaggedS3Key,
          Body: mp3Buffer,
          ContentType: "audio/mpeg",
        });
        await s3Client.send(putCommand);

        finalMp3UntaggedUrl = `https://storage.yandexcloud.net/${process.env.S3_BUCKET}/${mp3UntaggedS3Key}`;
        console.log(`✅ MP3 без тега загружен в S3: ${finalMp3UntaggedUrl}`);

        // Удаляем временные файлы
        await fs.unlink(tempWavPath).catch(() => {});
        await fs.unlink(tempMp3UntaggedPath).catch(() => {});
      } catch (error) {
        console.error(`❌ Ошибка генерации MP3 без тега:`, error);
        // Продолжаем без MP3 без тега
      }
    }

    // Удаляем всю temp папку после успешного перемещения файлов
    try {
      // Извлекаем tempFolderId из coverUrl (формат: .../beats/_temp_123456789/...)
      const tempMatch = coverUrl.match(/\/beats\/(_temp_\d+)\//);
      if (tempMatch) {
        const tempFolderId = tempMatch[1];
        const tempFolderPrefix = `${telegramId}/beats/${tempFolderId}/`;
        console.log(`🗑️ Удаление temp папки: ${tempFolderPrefix}`);

      const { ListObjectsV2Command, DeleteObjectsCommand, S3Client } = await import("@aws-sdk/client-s3");

      const s3Client = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || "",
          secretAccessKey: process.env.S3_SECRET_KEY || "",
        },
      });

      const bucketName = process.env.S3_BUCKET || "";

      // Получаем список всех файлов в temp папке
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: tempFolderPrefix,
      });

      const listResponse = await s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Удаляем все файлы из temp папки
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        });

        await s3Client.send(deleteCommand);
        console.log(`✅ Удалено ${listResponse.Contents.length} файлов из temp папки`);
      }
      }
    } catch (error) {
      console.error('❌ Ошибка при удалении temp папки:', error);
      // Не прерываем процесс, продолжаем создание бита
    }

    // Создаём бит в БД с финальными URL
    const beatResult = await pool.query(
      `INSERT INTO beats (user_id, title, bpm, key_sig, cover_url, mp3_tagged_url, mp3_untagged_url, wav_url, stems_url, free_download)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [user.id, title, bpm, beatKey, finalCoverUrl, finalMp3Url, finalMp3UntaggedUrl, finalWavUrl, finalStemsUrl, freeDownload]
    );

    const beatId = beatResult.rows[0].id;

    // Сохраняем цены лицензий
    // Клиент отправляет: { basic: 12, premium: 233 }
    // где ключи - это lic_key из таблицы licenses
    console.log(`🔍 Начинаем сохранение цен для бита ${beatId}, user.id=${user.id}`);
    for (const [licenseKey, priceValue] of Object.entries(prices)) {
      console.log(`🔍 Обрабатываем лицензию: ${licenseKey} = ${priceValue} (type: ${typeof priceValue})`);

      if (priceValue && typeof priceValue === "number" && priceValue > 0) {
        try {
          // Находим лицензию у пользователя
          const userLicenseResult = await pool.query(
            "SELECT id FROM licenses WHERE user_id = $1 AND lic_key = $2 LIMIT 1",
            [user.id, licenseKey]
          );

          console.log(`🔍 Найдено лицензий: ${userLicenseResult.rows.length}`, userLicenseResult.rows);

          if (userLicenseResult.rows.length > 0) {
            const userLicenseId = userLicenseResult.rows[0].id;
            console.log(`🔍 Вставляем в bl_prices: beatId=${beatId}, licenseId=${userLicenseId}, price=${priceValue}`);

            const insertResult = await pool.query(
              `INSERT INTO bl_prices (beat_id, license_id, price)
               VALUES ($1, $2, $3)
               ON CONFLICT (beat_id, license_id) DO UPDATE SET price = $3
               RETURNING beat_id`,
              [beatId, userLicenseId, priceValue]
            );

            console.log(`✅ Цена для лицензии "${licenseKey}": ${priceValue}`);
          } else {
            console.warn(`⚠️ Лицензия с ключом "${licenseKey}" не найдена у пользователя ${user.id}`);
          }
        } catch (e) {
          console.error(`❌ Ошибка при сохранении цены для лицензии "${licenseKey}":`, e);
        }
      } else {
        console.log(`⏭️ Пропускаем лицензию "${licenseKey}": некорректное значение`);
      }
    }

    // Проверяем что сохранилось
    const savedLicenses = await pool.query(
      "SELECT * FROM bl_prices WHERE beat_id = $1",
      [beatId]
    );
    console.log(`🔍 Сохранено цен для бита ${beatId}: ${savedLicenses.rows.length}`, savedLicenses.rows);

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
        freeDownload: freeDownload,
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

/* ---------- GET /api/beats/:beatId/free-download ---------- */
// Бесплатное скачивание MP3 с тегом
// POST для записи в БД, GET для совместимости
app.post("/api/beats/:beatId/free-download", async (req, res) => {
  try {
    const beatId = parseInt(req.params.beatId, 10);
    const { userId } = req.body;

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    // Получаем данные бита
    const beatResult = await pool.query(
      `SELECT b.*, u.username, u.id as user_id
       FROM beats b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [beatId]
    );

    if (beatResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    const beat = beatResult.rows[0];

    // Проверяем что бесплатное скачивание разрешено
    if (!beat.free_download) {
      return res.status(403).json({ ok: false, error: "free-download-not-allowed" });
    }

    // Проверяем что файл существует
    if (!beat.mp3_tagged_url) {
      return res.status(404).json({ ok: false, error: "file-not-found" });
    }

    // Увеличиваем счетчик бесплатных скачиваний
    await pool.query(
      `UPDATE beats SET free_dl_count = free_dl_count + 1 WHERE id = $1`,
      [beatId]
    );

    // Записываем в таблицу downloads для аналитики
    if (userId) {
      // Находим пользователя по telegram_id
      const userResult = await pool.query(
        `SELECT id FROM users WHERE telegram_id = $1`,
        [userId]
      );

      if (userResult.rows.length > 0) {
        const dbUserId = userResult.rows[0].id;

        await pool.query(
          `INSERT INTO downloads (user_id, beat_id, file_type, is_free, downloaded_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [dbUserId, beatId, 'mp3', true]
        );

        console.log(`📊 Записано скачивание в downloads: user_id=${dbUserId}, beat_id=${beatId}`);
      }
    }

    console.log(`📥 Бесплатное скачивание: beat_id=${beatId}, user=${userId}`);

    // Отправляем файл пользователю через Telegram Bot
    if (userId && bot) {
      try {
        await bot.telegram.sendAudio(userId, beat.mp3_tagged_url, {
          title: beat.title,
          performer: beat.username || "Producer",
          caption: `🎵 ${beat.title}\n📥 Бесплатное скачивание MP3`,
        });

        console.log(`✅ Файл отправлен пользователю ${userId} через Telegram`);

        res.json({
          ok: true,
          sentViaBot: true,
          message: "Файл отправлен в Telegram"
        });
      } catch (sendError) {
        console.error("❌ Ошибка при отправке файла через Telegram:", sendError);

        // Если не удалось отправить через бота, возвращаем URL для скачивания в браузере
        res.json({
          ok: true,
          fileUrl: beat.mp3_tagged_url,
          fallback: true
        });
      }
    } else {
      // Если нет userId или бота, возвращаем URL для скачивания
      res.json({
        ok: true,
        fileUrl: beat.mp3_tagged_url
      });
    }
  } catch (e) {
    console.error("POST /api/beats/:beatId/free-download error:", e);
    res.status(500).json({ ok: false, error: "download-failed" });
  }
});

// GET endpoint для обратной совместимости
app.get("/api/beats/:beatId/free-download", async (req, res) => {
  try {
    const beatId = parseInt(req.params.beatId, 10);

    if (isNaN(beatId)) {
      return res.status(400).json({ ok: false, error: "invalid-beat-id" });
    }

    // Получаем данные бита
    const beatResult = await pool.query(
      `SELECT b.*, u.username
       FROM beats b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [beatId]
    );

    if (beatResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "beat-not-found" });
    }

    const beat = beatResult.rows[0];

    // Проверяем что бесплатное скачивание разрешено
    if (!beat.free_download) {
      return res.status(403).json({ ok: false, error: "free-download-not-allowed" });
    }

    // Проверяем что файл существует
    if (!beat.mp3_tagged_url) {
      return res.status(404).json({ ok: false, error: "file-not-found" });
    }

    // Генерируем имя файла: @username BPM KEY - title.mp3
    const { generateFreeDownloadFilename } = await import("./audio-converter.js");
    const filename = generateFreeDownloadFilename(
      beat.username || "producer",
      beat.title,
      beat.bpm,
      beat.key_sig
    );

    console.log(`📥 Бесплатное скачивание (GET): ${filename}.mp3 (beat_id: ${beatId})`);

    // Возвращаем URL файла с правильным именем для скачивания
    res.json({
      ok: true,
      downloadUrl: beat.mp3_tagged_url,
      filename: `${filename}.mp3`
    });
  } catch (e) {
    console.error("GET /api/beats/:beatId/free-download error:", e);
    res.status(500).json({ ok: false, error: "download-failed" });
  }
});

/* ===================== Telegram (опционально) ===================== */
let bot: Telegraf | null = null;
async function initBot() {
  if (!BOT_TOKEN) {
    console.log("🤖 BOT_TOKEN не задан — бот не запускается (это ок для локального API).");
    return null;
  }
  try {
    // @ts-ignore
    const b = createBot(BOT_TOKEN, WEBAPP_URL);
    bot = b as unknown as Telegraf;

    if (BASE_URL) {
      const webhookPath = `/webhook/${b.secretPathComponent()}`;
      // ВАЖНО: Регистрируем webhook route ДО catchall route
      // Используем POST вместо use, так как Telegram отправляет POST запросы
      // @ts-ignore
      app.post(webhookPath, b.webhookCallback(webhookPath));
      console.log("✅ Webhook route зарегистрирован (POST):", webhookPath);
      return { bot: b, webhookPath };
    } else {
      return { bot: b, webhookPath: null };
    }
  } catch (e) {
    console.error("❌ Ошибка создания бота:", e);
    return null;
  }
}

// Инициализируем бота СИНХРОННО перед catchall route
const botInfo = await initBot();

/* ===================== Automatic cleanup of old temp folders ===================== */
async function cleanupOldTempFolders() {
  try {
    const { ListObjectsV2Command, S3Client, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

    const s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
      },
    });

    const bucketName = process.env.S3_BUCKET || "";

    // Получаем список всех объектов с префиксом, содержащим /_temp_
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "",
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      return;
    }

    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 час назад

    // Находим все файлы в temp папках старше 1 часа
    const oldTempFiles = response.Contents.filter((obj) => {
      if (!obj.Key || !obj.Key.includes('/_temp_')) return false;

      // Извлекаем timestamp из имени папки _temp_{timestamp}
      const match = obj.Key.match(/_temp_(\d+)/);
      if (!match) return false;

      const timestamp = parseInt(match[1], 10);
      return timestamp < oneHourAgo;
    });

    if (oldTempFiles.length === 0) {
      return;
    }

    console.log(`🗑️ Найдено ${oldTempFiles.length} старых временных файлов для удаления`);

    // Удаляем файлы батчами по 1000 (ограничение S3)
    const batchSize = 1000;
    for (let i = 0; i < oldTempFiles.length; i += batchSize) {
      const batch = oldTempFiles.slice(i, i + batchSize);

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map((obj) => ({ Key: obj.Key! })),
          Quiet: true,
        },
      });

      await s3Client.send(deleteCommand);
    }

    console.log(`✅ Удалено ${oldTempFiles.length} временных файлов`);
  } catch (error) {
    console.error('❌ Ошибка при очистке временных файлов:', error);
  }
}

/**
 * Проверка истечения подписок и переключение на Free план
 */
async function checkExpiredSubscriptions() {
  try {
    console.log('🔍 Проверка истекших подписок...');

    // 1. Деактивировать истекшие подписки
    const deactivateResult = await pool.query(`
      UPDATE user_plan
      SET is_active = FALSE
      WHERE expires_at < NOW() AND is_active = TRUE
      RETURNING user_id
    `);

    if (deactivateResult.rowCount && deactivateResult.rowCount > 0) {
      console.log(`⏰ Деактивировано истекших подписок: ${deactivateResult.rowCount}`);

      // 2. Получить ID Free плана
      const freePlanResult = await pool.query(`SELECT id FROM plans WHERE code = 'Free' LIMIT 1`);

      if (freePlanResult.rows.length === 0) {
        console.error('❌ Free план не найден в базе данных!');
        return;
      }

      const freePlanId = freePlanResult.rows[0].id;

      // 3. Переключить пользователей на Free план
      const switchResult = await pool.query(`
        INSERT INTO user_plan (user_id, plan_id, is_active, started_at)
        SELECT user_id, $1, TRUE, NOW()
        FROM (${deactivateResult.rows.map(r => r.user_id).join(',') || 'SELECT NULL WHERE FALSE'})
        ON CONFLICT (user_id) DO NOTHING
      `, [freePlanId]);

      console.log(`✅ Переключено на Free план пользователей: ${deactivateResult.rowCount}`);
    } else {
      console.log('✅ Нет истекших подписок');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки истекших подписок:', error);
  }
}

/* ===================== NOTIFICATIONS API ===================== */

/**
 * GET /api/users/:telegramId/notifications
 * Получить уведомления пользователя
 */
app.get("/api/users/:telegramId/notifications", async (req, res) => {
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
      `SELECT id, type, title, message, metadata, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.id]
    );

    const notifications = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      metadata: row.metadata,
      read: row.is_read,
      time: row.created_at,
    }));

    res.json({ ok: true, notifications });
  } catch (e) {
    console.error("GET /api/users/:telegramId/notifications error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * GET /api/users/:telegramId/notifications/unread-count
 * Получить количество непрочитанных уведомлений
 */
app.get("/api/users/:telegramId/notifications/unread-count", async (req, res) => {
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
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [user.id]
    );

    const count = parseInt(result.rows[0].count, 10);

    res.json({ ok: true, count });
  } catch (e) {
    console.error("GET /api/users/:telegramId/notifications/unread-count error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Пометить уведомление как прочитанное
 */
app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ ok: false, error: "invalid-notification-id" });
    }

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1",
      [notificationId]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/notifications/:id/read error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * PATCH /api/users/:telegramId/notifications/read-all
 * Пометить все уведомления как прочитанные
 */
app.patch("/api/users/:telegramId/notifications/read-all", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
      [user.id]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/users/:telegramId/notifications/read-all error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * DELETE /api/notifications/:id
 * Удалить уведомление
 */
app.delete("/api/notifications/:id", async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    if (isNaN(notificationId)) {
      return res.status(400).json({ ok: false, error: "invalid-notification-id" });
    }

    await pool.query("DELETE FROM notifications WHERE id = $1", [notificationId]);

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/notifications/:id error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * DELETE /api/users/:telegramId/notifications
 * Удалить все уведомления пользователя
 */
app.delete("/api/users/:telegramId/notifications", async (req, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (isNaN(telegramId)) {
      return res.status(400).json({ ok: false, error: "invalid-telegram-id" });
    }

    const user = await db.findUserByTelegramId(telegramId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "user-not-found" });
    }

    await pool.query("DELETE FROM notifications WHERE user_id = $1", [user.id]);

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/users/:telegramId/notifications error:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/**
 * Вспомогательная функция для создания уведомления о покупке
 */
async function createPurchaseNotification(producerUserId: number, purchaseData: {
  beatTitle: string;
  beatCoverUrl: string;
  price: number;
  licenseName: string;
  buyerUsername?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, metadata, is_read)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [
        producerUserId,
        'purchase',
        'Поздравляем! Вы только что сделали продажу!',
        `Ваш бит "${purchaseData.beatTitle}" был куплен с лицензией ${purchaseData.licenseName}`,
        JSON.stringify({
          beatTitle: purchaseData.beatTitle,
          beatCoverUrl: purchaseData.beatCoverUrl,
          price: purchaseData.price,
          licenseName: purchaseData.licenseName,
          buyerUsername: purchaseData.buyerUsername
        })
      ]
    );
    console.log(`✅ Уведомление о покупке создано для пользователя ${producerUserId}`);
  } catch (e) {
    console.error("❌ Ошибка создания уведомления о покупке:", e);
  }
}

/* ===================== Plans API ===================== */

/**
 * GET /api/plans
 * Получить все доступные планы подписки с ценами
 */
app.get("/api/plans", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, name, description, price, max_beats, custom_licenses, analytics, can_rename_lic, default_license_count
       FROM plans
       ORDER BY id ASC`
    );

    const plans = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      maxBeats: row.max_beats,
      customLicenses: row.custom_licenses,
      analytics: row.analytics,
      canRenameLic: row.can_rename_lic,
      defaultLicenseCount: row.default_license_count
    }));

    res.json({ ok: true, plans });
  } catch (e) {
    console.error("❌ Ошибка получения планов:", e);
    res.status(500).json({ ok: false, error: "server-error" });
  }
});

/* ===================== Static Files ===================== */
// Статика React клиента (client/dist) с отключением кеша для HTML и JS
// ВАЖНО: Это должно быть ПОСЛЕ всех API роутов!
// В production (Docker) файлы монтируются в /client/dist
const CLIENT_DIST = process.env.NODE_ENV === 'production'
  ? '/client/dist'
  : path.join(ROOT, "client", "dist");
app.use(express.static(CLIENT_DIST, {
  setHeaders: (res, filePath) => {
    // Для HTML и JS файлов - запрещаем кеширование
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Для остальных файлов (изображения, шрифты) - разрешаем кеш на 1 час
    else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// SPA fallback: все неизвестные роуты возвращают index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
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

  // Запускаем периодическую очистку временных папок (каждые 30 минут)
  setInterval(cleanupOldTempFolders, 30 * 60 * 1000);
  console.log("🕐 Автоматическая очистка temp папок запущена (каждые 30 минут)");

  // Запускаем периодическую проверку истечения подписок (каждый час)
  setInterval(checkExpiredSubscriptions, 60 * 60 * 1000);
  // Запускаем первую проверку сразу
  checkExpiredSubscriptions();
  console.log("🕐 Автоматическая проверка истечения подписок запущена (каждый час)");

  if (!dbConnected) {
    console.log("⚠️  ВНИМАНИЕ: База данных недоступна! Проверьте настройки в .env");
  } else {
    console.log("✅ PostgreSQL подключен");
  }
  console.log("");

  // Устанавливаем webhook только ПОСЛЕ запуска сервера
  if (botInfo && botInfo.webhookPath) {
    try {
      // @ts-ignore
      await botInfo.bot.telegram.setWebhook(`${BASE_URL}${botInfo.webhookPath}`);
      console.log("✅ Webhook установлен:", `${BASE_URL}${botInfo.webhookPath}`);
    } catch (e) {
      console.error("❌ Ошибка установки webhook:", e);
    }
  } else if (botInfo && !botInfo.webhookPath) {
    try {
      // @ts-ignore
      await botInfo.bot.telegram.deleteWebhook().catch(() => {});
      // @ts-ignore
      await botInfo.bot.launch();
      console.log("✅ Bot: long polling");
    } catch (e) {
      console.error("❌ Ошибка запуска бота в polling режиме:", e);
    }
  }

  // Устанавливаем Menu Button
  if (botInfo && WEBAPP_URL) {
    try {
      // @ts-ignore
      await setMenuButton(botInfo.bot, "Open", WEBAPP_URL);
    } catch (e) {
      console.error("❌ Ошибка установки Menu Button:", e);
    }
  }
});

process.on("SIGINT", () => { try { server.close(); } catch {} try { /* @ts-ignore */ bot?.stop?.("SIGINT"); } catch {} process.exit(0); });
process.on("SIGTERM", () => { try { server.close(); } catch {} try { /* @ts-ignore */ bot?.stop?.("SIGTERM"); } catch {} process.exit(0); });
