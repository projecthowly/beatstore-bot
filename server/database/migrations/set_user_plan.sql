-- Скрипт для установки плана пользователю
-- Использование:
-- 1. Замени ТВОЙ_TELEGRAM_ID на свой реальный telegram_id
-- 2. Выполни на сервере: psql -U beatstore_user -d beatstore_db -f set_user_plan.sql

-- Сначала найди свой telegram_id (раскомментируй если нужно)
-- SELECT id, telegram_id, username, plan FROM users;

-- Установить план 'pro' для пользователя
-- ЗАМЕНИ 123456789 НА СВОЙ TELEGRAM_ID!
UPDATE users
SET plan = 'pro'
WHERE telegram_id = 123456789;

-- Проверка результата
SELECT
    id,
    telegram_id,
    username,
    store_name,
    role,
    plan,
    created_at
FROM users
WHERE telegram_id = 123456789;

SELECT '✅ План обновлён на PRO!' AS status;
