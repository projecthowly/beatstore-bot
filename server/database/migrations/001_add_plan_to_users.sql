-- Добавляем поле plan в таблицу users для быстрого доступа
-- Это упростит работу с планами на клиенте

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro'));

-- Обновляем существующих пользователей, у которых нет плана
UPDATE users SET plan = 'free' WHERE plan IS NULL;

-- Создаём индекс для фильтрации по плану
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

SELECT '✅ Миграция завершена: добавлено поле plan в таблицу users' AS status;
