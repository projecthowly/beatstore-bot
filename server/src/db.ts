import pg from "pg";

const { Pool } = pg;

// Параметры подключения из переменных окружения
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "beatstore_user",
  password: process.env.DB_PASSWORD || "simple123",
  database: process.env.DB_NAME || "beatstore_db",
  max: 20, // максимум 20 подключений в пуле
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Обработка ошибок пула
pool.on("error", (err) => {
  console.error("❌ Неожиданная ошибка PostgreSQL:", err);
});

/**
 * Проверка подключения к базе данных
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW() as now, version() as version");
    console.log("✅ PostgreSQL подключен успешно!");
    console.log("⏰ Время сервера БД:", result.rows[0].now);
    console.log("📦 Версия PostgreSQL:", result.rows[0].version.split(" ")[0]);
    client.release();
    return true;
  } catch (error) {
    console.error("❌ Ошибка подключения к PostgreSQL:", error);
    return false;
  }
}

/**
 * Тестовый запрос - получить сообщение из test_connection
 */
export async function getTestMessage(): Promise<string | null> {
  try {
    const result = await pool.query(
      "SELECT message FROM test_connection ORDER BY id DESC LIMIT 1"
    );
    if (result.rows.length > 0) {
      return result.rows[0].message;
    }
    return null;
  } catch (error) {
    console.error("Ошибка при получении тестового сообщения:", error);
    return null;
  }
}

/**
 * Закрыть все подключения пула (вызывать при завершении приложения)
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log("🔌 PostgreSQL пул подключений закрыт");
}

// Экспортируем пул для прямого использования в других модулях
export { pool };

// Пример использования:
//
// import { testConnection, getTestMessage, pool } from "./db.js";
//
// // Проверка подключения
// await testConnection();
//
// // Тестовый запрос
// const message = await getTestMessage();
// console.log("Сообщение из БД:", message);
//
// // Прямой запрос через пул
// const result = await pool.query("SELECT * FROM users LIMIT 10");
// console.log(result.rows);
//
