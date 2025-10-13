import pg from "pg";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Скрипт миграции базы данных
 * Выполняет init.sql для создания всех таблиц
 */
async function migrate() {
  console.log("🚀 Starting database migration...");

  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "beatstore_user"}:${
      process.env.DB_PASSWORD || "simple123"
    }@${process.env.DB_HOST || "postgres"}:${
      process.env.DB_PORT || "5432"
    }/${process.env.DB_NAME || "beatstore_db"}`;

  const client = new pg.Client({ connectionString });

  try {
    console.log("🔌 Connecting to database...");
    await client.connect();
    console.log("✅ Connected to PostgreSQL");

    // Читаем SQL файл
    const sqlPath = path.join(__dirname, "init.sql");
    console.log(`📄 Reading SQL from: ${sqlPath}`);
    const sql = await fs.readFile(sqlPath, "utf8");

    // Выполняем миграцию
    console.log("⚙️  Executing migration...");
    await client.query(sql);

    console.log("✅ Migration completed successfully!");
    console.log("\n📊 Database tables created:");
    console.log("   - users");
    console.log("   - beats");
    console.log("   - licenses");
    console.log("   - purchases");
    console.log("   - cart");
    console.log("   - downloads");
    console.log("   - beat_views");
    console.log("   - producer_followers");
    console.log("   - beat_likes");
    console.log("   - reviews");
    console.log("   - notifications");
    console.log("");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Database connection closed");
  }
}

// Запускаем миграцию
migrate();
