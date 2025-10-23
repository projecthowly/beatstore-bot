// ===================================
// BEATSTORE DATABASE QUERIES (v2 - Clean Schema)
// ===================================

import { pool } from "./db.js";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  Beat,
  CreateBeatInput,
  UpdateBeatInput,
  License,
  CreateLicenseInput,
  UpdateLicenseInput,
  BeatLicensePrice,
  UpsertBeatLicensePriceInput,
  CartItem,
  AddToCartInput,
  Purchase,
  CreatePurchaseInput,
  Order,
  CreateOrderInput,
  OrderItem,
  CreateOrderItemInput,
  Download,
  CreateDownloadInput,
  Deeplink,
  CreateDeeplinkInput,
  UpdateDeeplinkInput,
  Plan,
  UserPlan,
  CreateUserPlanInput,
  CreateBeatViewInput,
  BeatLicenseView,
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
    `INSERT INTO users (telegram_id, username, display_name, avatar_url, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.telegram_id,
      input.username || null,
      input.display_name || null,
      input.avatar_url || null,
      input.role,
    ]
  );

  // Если это продюсер - создаем дефолтный план Free, дефолтные лицензии и deeplink
  if (input.role === "producer") {
    await assignFreePlan(result.rows[0].id);
    await createDefaultLicenses(result.rows[0].id);
    await createDefaultDeeplink(result.rows[0].id);
    console.log(
      `Created producer ${result.rows[0].username || result.rows[0].telegram_id} with default licenses and deeplink`
    );
  }

  return result.rows[0];
}

/**
 * Создать дефолтные лицензии для нового продюсера
 * Free план: 2 лицензии (Basic, Premium)
 * Basic/Pro план: 3 лицензии (Basic, Premium, Unlimited)
 */
export async function createDefaultLicenses(userId: number): Promise<void> {
  // Получаем план пользователя
  const userPlan = await getUserPlan(userId);
  const planCode = userPlan?.plan?.code || "Free";

  // Определяем, сколько лицензий создавать
  const licensesToCreate = planCode === "Free" ? 2 : 3;

  const defaultLicenses = [
    {
      lic_key: "basic",
      name: "Basic License",
      incl_mp3: true,
      incl_wav: false,
      incl_stems: false,
      default_price: null,
      min_price: null,
    },
    {
      lic_key: "premium",
      name: "Premium License",
      incl_mp3: true,
      incl_wav: true,
      incl_stems: false,
      default_price: null,
      min_price: null,
    },
    {
      lic_key: "unlimited",
      name: "Unlimited License",
      incl_mp3: true,
      incl_wav: true,
      incl_stems: true,
      default_price: null,
      min_price: null,
    },
  ];

  // Создаем только нужное количество лицензий
  for (let i = 0; i < licensesToCreate; i++) {
    const lic = defaultLicenses[i];
    await pool.query(
      `INSERT INTO licenses (user_id, lic_key, name, incl_mp3, incl_wav, incl_stems, default_price, min_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, lic_key) DO NOTHING`,
      [
        userId,
        lic.lic_key,
        lic.name,
        lic.incl_mp3,
        lic.incl_wav,
        lic.incl_stems,
        lic.default_price,
        lic.min_price,
      ]
    );
  }

  console.log(`✅ Создано ${licensesToCreate} дефолтных лицензий для пользователя ${userId} (план: ${planCode})`);
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
  if (input.display_name !== undefined) {
    fields.push(`display_name = $${paramIndex++}`);
    values.push(input.display_name);
  }
  if (input.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`);
    values.push(input.avatar_url);
  }
  if (input.bio !== undefined) {
    fields.push(`bio = $${paramIndex++}`);
    values.push(input.bio);
  }
  if (input.contact_username !== undefined) {
    fields.push(`contact_username = $${paramIndex++}`);
    values.push(input.contact_username);
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
  if (input.viewed_producer_id !== undefined) {
    fields.push(`viewed_producer_id = $${paramIndex++}`);
    values.push(input.viewed_producer_id);
  }
  if (input.free_download_default !== undefined) {
    fields.push(`free_download_default = $${paramIndex++}`);
    values.push(input.free_download_default);
  }

  if (fields.length === 0) {
    const current = await pool.query<User>("SELECT * FROM users WHERE id = $1", [userId]);
    return current.rows[0];
  }

  fields.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await pool.query<User>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Установить режим просмотра битстора продюсера (guest mode)
 */
export async function setViewedProducer(
  userId: number,
  producerId: number
): Promise<User> {
  const result = await pool.query<User>(
    `UPDATE users SET viewed_producer_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [producerId, userId]
  );
  return result.rows[0];
}

/**
 * Очистить режим просмотра (выход из guest mode)
 */
export async function clearViewedProducer(userId: number): Promise<User> {
  const result = await pool.query<User>(
    `UPDATE users SET viewed_producer_id = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return result.rows[0];
}

// ===================================
// PLAN QUERIES (formerly Subscription)
// ===================================

/**
 * Назначить бесплатный план продюсеру
 */
export async function assignFreePlan(userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_plan (user_id, plan_id)
     VALUES ($1, (SELECT id FROM plans WHERE code = 'Free'))`,
    [userId]
  );
}

/**
 * Получить план пользователя
 */
export async function getUserPlan(
  userId: number
): Promise<(UserPlan & { plan: Plan }) | null> {
  const result = await pool.query(
    `SELECT up.*, p.* FROM user_plan up
     JOIN plans p ON up.plan_id = p.id
     WHERE up.user_id = $1 AND up.is_active = TRUE`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    started_at: row.started_at,
    expires_at: row.expires_at,
    is_active: row.is_active,
    plan: {
      id: row.plan_id,
      code: row.code,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      max_beats: row.max_beats,
      custom_licenses: row.custom_licenses,
      analytics: row.analytics,
      can_rename_lic: row.can_rename_lic,
      default_license_count: row.default_license_count,
      created_at: row.created_at,
    },
  };
}

/**
 * Создать план для пользователя
 */
export async function createUserPlan(
  input: CreateUserPlanInput
): Promise<UserPlan> {
  const result = await pool.query<UserPlan>(
    `INSERT INTO user_plan (user_id, plan_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.user_id, input.plan_id, input.expires_at || null]
  );
  return result.rows[0];
}

// ===================================
// BEAT QUERIES
// ===================================

/**
 * Создать новый бит
 */
export async function createBeat(input: CreateBeatInput): Promise<Beat> {
  const result = await pool.query<Beat>(
    `INSERT INTO beats (
      user_id, title, bpm, key_sig, genre, tags,
      cover_url, mp3_tagged_url, mp3_untagged_url, wav_url, stems_url,
      free_download
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.user_id,
      input.title,
      input.bpm || null,
      input.key_sig || null,
      input.genre || null,
      input.tags || null,
      input.cover_url || null,
      input.mp3_tagged_url || null,
      input.mp3_untagged_url || null,
      input.wav_url || null,
      input.stems_url || null,
      input.free_download || false,
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

  if (input.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.bpm !== undefined) {
    fields.push(`bpm = $${paramIndex++}`);
    values.push(input.bpm);
  }
  if (input.key_sig !== undefined) {
    fields.push(`key_sig = $${paramIndex++}`);
    values.push(input.key_sig);
  }
  if (input.genre !== undefined) {
    fields.push(`genre = $${paramIndex++}`);
    values.push(input.genre);
  }
  if (input.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`);
    values.push(input.tags);
  }
  if (input.cover_url !== undefined) {
    fields.push(`cover_url = $${paramIndex++}`);
    values.push(input.cover_url);
  }
  if (input.mp3_tagged_url !== undefined) {
    fields.push(`mp3_tagged_url = $${paramIndex++}`);
    values.push(input.mp3_tagged_url);
  }
  if (input.mp3_untagged_url !== undefined) {
    fields.push(`mp3_untagged_url = $${paramIndex++}`);
    values.push(input.mp3_untagged_url);
  }
  if (input.wav_url !== undefined) {
    fields.push(`wav_url = $${paramIndex++}`);
    values.push(input.wav_url);
  }
  if (input.stems_url !== undefined) {
    fields.push(`stems_url = $${paramIndex++}`);
    values.push(input.stems_url);
  }
  if (input.free_download !== undefined) {
    fields.push(`free_download = $${paramIndex++}`);
    values.push(input.free_download);
  }

  if (fields.length === 0) {
    return (await getBeatById(beatId))!;
  }

  fields.push(`updated_at = NOW()`);
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
// LICENSE QUERIES
// ===================================

/**
 * Получить лицензии продюсера
 */
export async function getProducerLicenses(userId: number): Promise<License[]> {
  const result = await pool.query<License>(
    `SELECT * FROM licenses
     WHERE user_id = $1 AND is_hidden = FALSE
     ORDER BY id ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Получить лицензию по ID
 */
export async function getLicenseById(licenseId: number): Promise<License | null> {
  const result = await pool.query<License>(
    "SELECT * FROM licenses WHERE id = $1",
    [licenseId]
  );
  return result.rows[0] || null;
}

/**
 * Создать новую лицензию
 */
export async function createLicense(
  input: CreateLicenseInput
): Promise<License> {
  const result = await pool.query<License>(
    `INSERT INTO licenses (
      user_id, lic_key, name, description,
      incl_mp3, incl_wav, incl_stems,
      default_price, min_price
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.user_id,
      input.lic_key,
      input.name,
      input.description || null,
      input.incl_mp3 ?? true,
      input.incl_wav ?? false,
      input.incl_stems ?? false,
      input.default_price || null,
      input.min_price || null,
    ]
  );
  return result.rows[0];
}

/**
 * Обновить лицензию
 */
export async function updateLicense(
  licenseId: number,
  input: UpdateLicenseInput
): Promise<License> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.incl_mp3 !== undefined) {
    fields.push(`incl_mp3 = $${paramIndex++}`);
    values.push(input.incl_mp3);
  }
  if (input.incl_wav !== undefined) {
    fields.push(`incl_wav = $${paramIndex++}`);
    values.push(input.incl_wav);
  }
  if (input.incl_stems !== undefined) {
    fields.push(`incl_stems = $${paramIndex++}`);
    values.push(input.incl_stems);
  }
  if (input.default_price !== undefined) {
    fields.push(`default_price = $${paramIndex++}`);
    values.push(input.default_price);
  }
  if (input.min_price !== undefined) {
    fields.push(`min_price = $${paramIndex++}`);
    values.push(input.min_price);
  }
  if (input.is_hidden !== undefined) {
    fields.push(`is_hidden = $${paramIndex++}`);
    values.push(input.is_hidden);
  }

  if (fields.length === 0) {
    return (await getLicenseById(licenseId))!;
  }

  fields.push(`updated_at = NOW()`);
  values.push(licenseId);

  const result = await pool.query<License>(
    `UPDATE licenses SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Удалить лицензию
 */
export async function deleteLicense(licenseId: number): Promise<void> {
  await pool.query("DELETE FROM licenses WHERE id = $1", [licenseId]);
}

// ===================================
// BEAT LICENSE PRICE QUERIES
// ===================================

/**
 * Установить/обновить цену для конкретного бита и лицензии
 */
export async function upsertBeatLicensePrice(
  input: UpsertBeatLicensePriceInput
): Promise<void> {
  await pool.query(
    `INSERT INTO bl_prices (beat_id, license_id, price)
     VALUES ($1, $2, $3)
     ON CONFLICT (beat_id, license_id)
     DO UPDATE SET price = $3, updated_at = NOW()`,
    [input.beat_id, input.license_id, input.price]
  );
}

/**
 * Получить цены бита (через view v_beat_licenses)
 */
export async function getBeatLicenses(
  beatId: number
): Promise<BeatLicenseView[]> {
  const result = await pool.query<BeatLicenseView>(
    `SELECT * FROM v_beat_licenses
     WHERE beat_id = $1 AND is_hidden = FALSE
     ORDER BY license_id ASC`,
    [beatId]
  );
  return result.rows;
}

/**
 * Удалить override цены для бита (вернуться к default_price)
 */
export async function deleteBeatLicensePrice(
  beatId: number,
  licenseId: number
): Promise<void> {
  await pool.query(
    "DELETE FROM bl_prices WHERE beat_id = $1 AND license_id = $2",
    [beatId, licenseId]
  );
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
 * Получить корзину пользователя с детальной информацией
 */
export async function getCart(userId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT
      c.id, c.user_id, c.beat_id, c.license_id, c.added_at,
      b.title, b.cover_url,
      u.username as producer_username,
      l.name as license_name,
      vbl.final_price
     FROM cart c
     JOIN beats b ON c.beat_id = b.id
     JOIN users u ON b.user_id = u.id
     JOIN licenses l ON c.license_id = l.id
     LEFT JOIN v_beat_licenses vbl
       ON vbl.beat_id = c.beat_id AND vbl.license_id = c.license_id
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
// ORDER & PURCHASE QUERIES
// ===================================

/**
 * Создать заказ
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const result = await pool.query<Order>(
    `INSERT INTO orders (buyer_id, total_amount, method, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.buyer_id,
      input.total_amount,
      input.method || null,
      input.status || "pending",
    ]
  );
  return result.rows[0];
}

/**
 * Создать элемент заказа
 */
export async function createOrderItem(
  input: CreateOrderItemInput
): Promise<OrderItem> {
  const result = await pool.query<OrderItem>(
    `INSERT INTO order_items (order_id, beat_id, seller_id, license_id, unit_price, includes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.order_id,
      input.beat_id,
      input.seller_id,
      input.license_id,
      input.unit_price,
      JSON.stringify(input.includes),
    ]
  );
  return result.rows[0];
}

/**
 * Создать покупку (shortcut для одного item'а)
 */
export async function createPurchase(
  input: CreatePurchaseInput
): Promise<Purchase> {
  const result = await pool.query<Purchase>(
    `INSERT INTO purchases (buyer_id, seller_id, beat_id, license_id, amount, method, payment_ref)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.buyer_id,
      input.seller_id,
      input.beat_id,
      input.license_id,
      input.amount,
      input.method,
      input.payment_ref ? JSON.stringify(input.payment_ref) : null,
    ]
  );

  // Увеличиваем счетчик продаж бита
  await pool.query(
    "UPDATE beats SET sales_count = sales_count + 1 WHERE id = $1",
    [input.beat_id]
  );

  // Добавляем баланс продюсеру
  await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [
    input.amount,
    input.seller_id,
  ]);

  return result.rows[0];
}

/**
 * Получить историю покупок пользователя
 */
export async function getUserPurchases(userId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT
      p.id, p.buyer_id, p.seller_id, p.beat_id, p.license_id,
      p.amount, p.method, p.created_at,
      b.title as beat_title, b.cover_url,
      l.name as license_name,
      u.username as seller_username
     FROM purchases p
     JOIN beats b ON p.beat_id = b.id
     JOIN licenses l ON p.license_id = l.id
     JOIN users u ON p.seller_id = u.id
     WHERE p.buyer_id = $1
     ORDER BY p.created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Получить историю продаж продюсера
 */
export async function getProducerSalesHistory(
  userId: number,
  limit = 50
): Promise<any[]> {
  const result = await pool.query(
    `SELECT
      p.id, p.buyer_id, p.seller_id, p.beat_id, p.license_id,
      p.amount, p.method, p.created_at,
      b.title as beat_title,
      l.name as license_name,
      u.username as buyer_username
     FROM purchases p
     JOIN beats b ON p.beat_id = b.id
     JOIN licenses l ON p.license_id = l.id
     JOIN users u ON p.buyer_id = u.id
     WHERE p.seller_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

// ===================================
// DEEPLINK QUERIES
// ===================================

/**
 * Генерирует случайный уникальный deeplink (до 15 символов)
 */
async function generateUniqueDeeplink(): Promise<string> {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = 10;
  let customName = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    customName = "";
    for (let i = 0; i < length; i++) {
      customName += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    const exists = await checkDeeplinkExists(customName);
    if (!exists) {
      return customName;
    }

    attempts++;
  }

  return customName + Date.now().toString(36).slice(-4);
}

/**
 * Создать диплинк с автогенерированным именем для нового продюсера
 */
export async function createDefaultDeeplink(userId: number): Promise<Deeplink> {
  const customName = await generateUniqueDeeplink();
  return createDeeplink({ user_id: userId, custom_name: customName });
}

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
    `UPDATE deeplinks SET custom_name = $1, updated_at = NOW()
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

/**
 * Получить deeplink пользователя
 */
export async function getUserDeeplink(
  userId: number
): Promise<Deeplink | null> {
  const result = await pool.query<Deeplink>(
    `SELECT * FROM deeplinks WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Проверить существование custom_name
 */
export async function checkDeeplinkExists(
  customName: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM deeplinks WHERE custom_name = $1)`,
    [customName]
  );
  return result.rows[0].exists;
}

// ===================================
// ANALYTICS QUERIES
// ===================================

/**
 * Зарегистрировать просмотр бита
 */
export async function recordBeatView(input: CreateBeatViewInput): Promise<void> {
  await pool.query(`INSERT INTO beat_views (beat_id, user_id) VALUES ($1, $2)`, [
    input.beat_id,
    input.user_id || null,
  ]);

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
    `INSERT INTO downloads (
      user_id, beat_id, order_item_id, is_free, file_type,
      tg_username, tg_name, tg_photo_url
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.user_id,
      input.beat_id,
      input.order_item_id || null,
      input.is_free || false,
      input.file_type,
      input.tg_username || null,
      input.tg_name || null,
      input.tg_photo_url || null,
    ]
  );

  // Если бесплатное скачивание, увеличиваем счетчик
  if (input.is_free) {
    await pool.query(
      "UPDATE beats SET free_dl_count = free_dl_count + 1 WHERE id = $1",
      [input.beat_id]
    );
  }

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
      COALESCE(SUM(p.amount), 0) as total_revenue,
      COUNT(DISTINCT d.id) FILTER (WHERE d.is_free = TRUE) as total_free_downloads
     FROM beats b
     LEFT JOIN beat_views bv ON b.id = bv.beat_id
       AND bv.viewed_at BETWEEN $2 AND $3
     LEFT JOIN purchases p ON b.id = p.beat_id
       AND p.created_at BETWEEN $2 AND $3
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
      COALESCE(SUM(p.amount), 0) as revenue,
      COUNT(DISTINCT d.id) FILTER (WHERE d.is_free = TRUE) as free_dl_count
     FROM beats b
     LEFT JOIN beat_views bv ON b.id = bv.beat_id
       AND bv.viewed_at BETWEEN $2 AND $3
     LEFT JOIN purchases p ON b.id = p.beat_id
       AND p.created_at BETWEEN $2 AND $3
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
      free_dl_count: parseInt(row.free_dl_count) || 0,
    })),
  };
}
