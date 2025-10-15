// ===================================
// 🎵 BEATSTORE DATABASE QUERIES
// ===================================

import { pool } from "./db.js";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  Beat,
  CreateBeatInput,
  UpdateBeatInput,
  Purchase,
  CreatePurchaseInput,
  CartItem,
  AddToCartInput,
  Subscription,
  UserSubscription,
  License,
  Deeplink,
  CreateDeeplinkInput,
  UpdateDeeplinkInput,
  BeatLicense,
  CreateBeatLicenseInput,
  Download,
  CreateDownloadInput,
  CreateBeatViewInput,
} from "./db-types.js";

// ===================================
// USER QUERIES
// ===================================

/**
 * Найти пользователя по Telegram ID
 */
export async function findUserByTelegramId(
  telegramId: number
): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE telegram_id = $1",
    [telegramId]
  );
  return result.rows[0] || null;
}

/**
 * Создать нового пользователя
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (telegram_id, username, avatar_url, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.telegram_id, input.username, input.avatar_url, input.role]
  );

  // Если это продюсер - создаем дефолтную подписку Free и дефолтные лицензии
  if (input.role === "producer") {
    await assignFreeSubscription(result.rows[0].id);
    await createDefaultLicenses(result.rows[0].id);
  }

  return result.rows[0];
}

/**
 * Создать дефолтные лицензии для нового продюсера (экспортируется для использования при смене роли)
 */
export async function createDefaultLicenses(userId: number): Promise<void> {
  const defaultLicenses = [
    { license_key: "basic", license_name: "Basic License", default_price: null },
    { license_key: "premium", license_name: "Premium License", default_price: null },
  ];

  for (const lic of defaultLicenses) {
    await pool.query(
      `INSERT INTO user_license_settings (user_id, license_key, license_name, default_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, license_key) DO NOTHING`,
      [userId, lic.license_key, lic.license_name, lic.default_price]
    );
  }
}

/**
 * Обновить данные пользователя
 */
export async function updateUser(
  userId: number,
  input: UpdateUserInput
): Promise<User> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.username !== undefined) {
    fields.push(`username = $${paramIndex++}`);
    values.push(input.username);
  }
  if (input.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(input.avatar_url);
  }
  if (input.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }
  if (input.bio !== undefined) {
    fields.push(`bio = $${paramIndex++}`);
    values.push(input.bio);
  }
  if (input.instagram_url !== undefined) {
    fields.push(`instagram_url = $${paramIndex++}`);
    values.push(input.instagram_url);
  }
  if (input.youtube_url !== undefined) {
    fields.push(`youtube_url = $${paramIndex++}`);
    values.push(input.youtube_url);
  }
  if (input.soundcloud_url !== undefined) {
    fields.push(`soundcloud_url = $${paramIndex++}`);
    values.push(input.soundcloud_url);
  }
  if (input.spotify_url !== undefined) {
    fields.push(`spotify_url = $${paramIndex++}`);
    values.push(input.spotify_url);
  }
  if (input.other_links !== undefined) {
    fields.push(`other_links = $${paramIndex++}`);
    values.push(JSON.stringify(input.other_links));
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);

  const result = await pool.query<User>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Назначить бесплатную подписку продюсеру
 */
async function assignFreeSubscription(userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_subscriptions (user_id, subscription_id)
     VALUES ($1, (SELECT id FROM subscriptions WHERE name = 'Free'))`,
    [userId]
  );
}

/**
 * Получить подписку пользователя
 */
export async function getUserSubscription(
  userId: number
): Promise<(UserSubscription & { subscription: Subscription }) | null> {
  const result = await pool.query(
    `SELECT us.*, s.* FROM user_subscriptions us
     JOIN subscriptions s ON us.subscription_id = s.id
     WHERE us.user_id = $1 AND us.is_active = TRUE`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    subscription_id: row.subscription_id,
    started_at: row.started_at,
    expires_at: row.expires_at,
    is_active: row.is_active,
    subscription: {
      id: row.subscription_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      max_beats: row.max_beats,
      can_create_licenses: row.can_create_licenses,
      has_analytics: row.has_analytics,
      created_at: row.created_at,
    },
  };
}

// ===================================
// BEAT QUERIES
// ===================================

/**
 * Создать новый бит
 */
export async function createBeat(input: CreateBeatInput): Promise<Beat> {
  const result = await pool.query<Beat>(
    `INSERT INTO beats (user_id, title, bpm, key, genre, tags, mp3_file_path, wav_file_path, stems_file_path, cover_file_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.user_id,
      input.title,
      input.bpm,
      input.key,
      input.genre,
      input.tags,
      input.mp3_file_path,
      input.wav_file_path,
      input.stems_file_path,
      input.cover_file_path,
    ]
  );

  return result.rows[0];
}

/**
 * Получить все биты продюсера
 */
export async function getProducerBeats(userId: number): Promise<Beat[]> {
  const result = await pool.query<Beat>(
    "SELECT * FROM beats WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}

/**
 * Получить бит по ID
 */
export async function getBeatById(beatId: number): Promise<Beat | null> {
  const result = await pool.query<Beat>("SELECT * FROM beats WHERE id = $1", [
    beatId,
  ]);
  return result.rows[0] || null;
}

/**
 * Обновить бит
 */
export async function updateBeat(
  beatId: number,
  input: UpdateBeatInput
): Promise<Beat> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.title) {
    fields.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.bpm !== undefined) {
    fields.push(`bpm = $${paramIndex++}`);
    values.push(input.bpm);
  }
  if (input.key !== undefined) {
    fields.push(`key = $${paramIndex++}`);
    values.push(input.key);
  }
  if (input.genre !== undefined) {
    fields.push(`genre = $${paramIndex++}`);
    values.push(input.genre);
  }
  if (input.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`);
    values.push(input.tags);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(beatId);

  const result = await pool.query<Beat>(
    `UPDATE beats SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Удалить бит
 */
export async function deleteBeat(beatId: number): Promise<void> {
  await pool.query("DELETE FROM beats WHERE id = $1", [beatId]);
}

/**
 * Получить все биты (для глобального битстора)
 */
export async function getAllBeats(limit = 50, offset = 0): Promise<Beat[]> {
  const result = await pool.query<Beat>(
    "SELECT * FROM beats ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );
  return result.rows;
}

// ===================================
// BEAT LICENSE QUERIES
// ===================================

/**
 * Добавить лицензию к биту с ценой
 */
export async function addBeatLicense(
  input: CreateBeatLicenseInput
): Promise<BeatLicense> {
  const result = await pool.query<BeatLicense>(
    `INSERT INTO beat_licenses (beat_id, license_id, price)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.beat_id, input.license_id, input.price]
  );
  return result.rows[0];
}

/**
 * Получить лицензии для бита
 */
export async function getBeatLicenses(beatId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT bl.*, l.name, l.description, l.includes_mp3, l.includes_wav, l.includes_stems
     FROM beat_licenses bl
     JOIN licenses l ON bl.license_id = l.id
     WHERE bl.beat_id = $1`,
    [beatId]
  );
  return result.rows;
}

// ===================================
// LICENSE QUERIES
// ===================================

/**
 * Получить глобальные лицензии
 */
export async function getGlobalLicenses(): Promise<License[]> {
  const result = await pool.query<License>(
    "SELECT * FROM licenses WHERE is_global = TRUE"
  );
  return result.rows;
}

/**
 * Получить лицензии продюсера
 */
export async function getProducerLicenses(userId: number): Promise<License[]> {
  const result = await pool.query<License>(
    "SELECT * FROM licenses WHERE user_id = $1 OR is_global = TRUE",
    [userId]
  );
  return result.rows;
}

// ===================================
// CART QUERIES
// ===================================

/**
 * Добавить бит в корзину
 */
export async function addToCart(input: AddToCartInput): Promise<CartItem> {
  const result = await pool.query<CartItem>(
    `INSERT INTO cart (user_id, beat_id, license_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, beat_id, license_id) DO NOTHING
     RETURNING *`,
    [input.user_id, input.beat_id, input.license_id]
  );
  return result.rows[0];
}

/**
 * Получить корзину пользователя
 */
export async function getCart(userId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT c.*, b.title, b.cover_file_path, bl.price, l.name as license_name,
            u.username as producer_username
     FROM cart c
     JOIN beats b ON c.beat_id = b.id
     JOIN beat_licenses bl ON c.beat_id = bl.beat_id AND c.license_id = bl.license_id
     JOIN licenses l ON c.license_id = l.id
     JOIN users u ON b.user_id = u.id
     WHERE c.user_id = $1
     ORDER BY c.added_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Удалить из корзины
 */
export async function removeFromCart(
  userId: number,
  beatId: number,
  licenseId: number
): Promise<void> {
  await pool.query(
    "DELETE FROM cart WHERE user_id = $1 AND beat_id = $2 AND license_id = $3",
    [userId, beatId, licenseId]
  );
}

/**
 * Очистить корзину
 */
export async function clearCart(userId: number): Promise<void> {
  await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);
}

// ===================================
// PURCHASE QUERIES
// ===================================

/**
 * Создать покупку
 */
export async function createPurchase(
  input: CreatePurchaseInput
): Promise<Purchase> {
  const result = await pool.query<Purchase>(
    `INSERT INTO purchases (user_id, beat_id, license_id, price, payment_method)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.user_id,
      input.beat_id,
      input.license_id,
      input.price,
      input.payment_method,
    ]
  );

  // Увеличиваем счетчик продаж бита
  await pool.query(
    "UPDATE beats SET sales_count = sales_count + 1 WHERE id = $1",
    [input.beat_id]
  );

  // Добавляем баланс продюсеру
  await pool.query(
    `UPDATE users SET balance = balance + $1
     WHERE id = (SELECT user_id FROM beats WHERE id = $2)`,
    [input.price, input.beat_id]
  );

  return result.rows[0];
}

/**
 * Получить историю покупок пользователя
 */
export async function getUserPurchases(userId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT p.*, b.title as beat_title, b.cover_file_path,
            l.name as license_name, u.username as producer_username
     FROM purchases p
     JOIN beats b ON p.beat_id = b.id
     JOIN licenses l ON p.license_id = l.id
     JOIN users u ON b.user_id = u.id
     WHERE p.user_id = $1
     ORDER BY p.purchased_at DESC`,
    [userId]
  );
  return result.rows;
}

// ===================================
// DEEPLINK QUERIES
// ===================================

/**
 * Создать диплинк
 */
export async function createDeeplink(
  input: CreateDeeplinkInput
): Promise<Deeplink> {
  const result = await pool.query<Deeplink>(
    `INSERT INTO deeplinks (user_id, custom_name)
     VALUES ($1, $2)
     RETURNING *`,
    [input.user_id, input.custom_name]
  );
  return result.rows[0];
}

/**
 * Обновить диплинк
 */
export async function updateDeeplink(
  userId: number,
  input: UpdateDeeplinkInput
): Promise<Deeplink> {
  const result = await pool.query<Deeplink>(
    `UPDATE deeplinks SET custom_name = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2
     RETURNING *`,
    [input.custom_name, userId]
  );
  return result.rows[0];
}

/**
 * Найти пользователя по deeplink
 */
export async function findUserByDeeplink(
  customName: string
): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT u.* FROM users u
     JOIN deeplinks d ON u.id = d.user_id
     WHERE d.custom_name = $1`,
    [customName]
  );
  return result.rows[0] || null;
}

// ===================================
// ANALYTICS QUERIES
// ===================================

/**
 * Зарегистрировать просмотр бита
 */
export async function recordBeatView(input: CreateBeatViewInput): Promise<void> {
  await pool.query(
    `INSERT INTO beat_views (beat_id, user_id) VALUES ($1, $2)`,
    [input.beat_id, input.user_id || null]
  );

  // Увеличиваем счетчик просмотров
  await pool.query(
    "UPDATE beats SET views_count = views_count + 1 WHERE id = $1",
    [input.beat_id]
  );
}

/**
 * Зарегистрировать скачивание
 */
export async function recordDownload(
  input: CreateDownloadInput
): Promise<Download> {
  const result = await pool.query<Download>(
    `INSERT INTO downloads (purchase_id, beat_id, user_id, file_type, is_free)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.purchase_id || null,
      input.beat_id,
      input.user_id,
      input.file_type,
      input.is_free || false,
    ]
  );
  return result.rows[0];
}

/**
 * Получить аналитику продюсера за период
 */
export async function getProducerAnalytics(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<any> {
  // Общая статистика
  const statsResult = await pool.query(
    `SELECT
      COUNT(DISTINCT bv.id) as total_views,
      COUNT(DISTINCT p.id) as total_sales,
      COALESCE(SUM(p.price), 0) as total_revenue,
      COUNT(DISTINCT d.id) FILTER (WHERE d.is_free = TRUE) as total_free_downloads
     FROM beats b
     LEFT JOIN beat_views bv ON b.id = bv.beat_id
       AND bv.viewed_at BETWEEN $2 AND $3
     LEFT JOIN purchases p ON b.id = p.beat_id
       AND p.purchased_at BETWEEN $2 AND $3
     LEFT JOIN downloads d ON b.id = d.beat_id
       AND d.downloaded_at BETWEEN $2 AND $3
     WHERE b.user_id = $1`,
    [userId, startDate, endDate]
  );

  // Статистика по битам
  const beatsResult = await pool.query(
    `SELECT
      b.id as beat_id,
      b.title as beat_title,
      COUNT(DISTINCT bv.id) as views_count,
      COUNT(DISTINCT p.id) as sales_count,
      COALESCE(SUM(p.price), 0) as revenue,
      COUNT(DISTINCT d.id) FILTER (WHERE d.is_free = TRUE) as free_downloads_count
     FROM beats b
     LEFT JOIN beat_views bv ON b.id = bv.beat_id
       AND bv.viewed_at BETWEEN $2 AND $3
     LEFT JOIN purchases p ON b.id = p.beat_id
       AND p.purchased_at BETWEEN $2 AND $3
     LEFT JOIN downloads d ON b.id = d.beat_id
       AND d.downloaded_at BETWEEN $2 AND $3
     WHERE b.user_id = $1
     GROUP BY b.id, b.title
     ORDER BY revenue DESC, views_count DESC`,
    [userId, startDate, endDate]
  );

  return {
    total_views: parseInt(statsResult.rows[0].total_views) || 0,
    total_sales: parseInt(statsResult.rows[0].total_sales) || 0,
    total_revenue: parseFloat(statsResult.rows[0].total_revenue) || 0,
    total_free_downloads:
      parseInt(statsResult.rows[0].total_free_downloads) || 0,
    beats: beatsResult.rows.map((row) => ({
      beat_id: row.beat_id,
      beat_title: row.beat_title,
      views_count: parseInt(row.views_count) || 0,
      sales_count: parseInt(row.sales_count) || 0,
      revenue: parseFloat(row.revenue) || 0,
      free_downloads_count: parseInt(row.free_downloads_count) || 0,
    })),
  };
}

/**
 * Получить историю продаж продюсера
 */
export async function getProducerSalesHistory(
  userId: number,
  limit = 50
): Promise<any[]> {
  const result = await pool.query(
    `SELECT p.id as purchase_id, b.title as beat_title,
            u.username as buyer_username, l.name as license_name,
            p.price, p.purchased_at
     FROM purchases p
     JOIN beats b ON p.beat_id = b.id
     JOIN users u ON p.user_id = u.id
     JOIN licenses l ON p.license_id = l.id
     WHERE b.user_id = $1
     ORDER BY p.purchased_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
