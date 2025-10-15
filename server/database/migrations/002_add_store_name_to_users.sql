-- Добавляем поле store_name в таблицу users для хранения никнейма продюсера

ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);

-- Для существующих пользователей используем username как store_name
UPDATE users SET store_name = username WHERE store_name IS NULL AND username IS NOT NULL;

SELECT '✅ Миграция завершена: добавлено поле store_name в таблицу users' AS status;
