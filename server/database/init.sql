-- ===================================
-- 🎵 BEATSTORE BOT DATABASE SCHEMA
-- ===================================

-- Удаляем старые таблицы если есть
DROP TABLE IF EXISTS beat_views CASCADE;
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS beat_licenses CASCADE;
DROP TABLE IF EXISTS beats CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS deeplinks CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===================================
-- 1. USERS (Пользователи)
-- ===================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) CHECK (role IN ('producer', 'artist')), -- NULL = роль не выбрана

    -- Для продюсеров
    bio TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    soundcloud_url TEXT,
    spotify_url TEXT,
    other_links JSONB, -- для дополнительных ссылок

    balance DECIMAL(10, 2) DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по telegram_id
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_role ON users(role);

-- ===================================
-- 2. SUBSCRIPTIONS (Планы подписок)
-- ===================================
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Free', 'Basic', 'Pro'
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Лимиты
    max_beats INTEGER, -- максимум битов (NULL = без лимита)
    can_create_licenses BOOLEAN DEFAULT FALSE, -- может создавать кастомные лицензии
    has_analytics BOOLEAN DEFAULT FALSE, -- доступ к аналитике

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем дефолтные планы
INSERT INTO subscriptions (name, description, price, max_beats, can_create_licenses, has_analytics) VALUES
('Free', 'Базовый бесплатный план', 0.00, 10, FALSE, FALSE),
('Basic', 'Расширенный план', 9.99, 50, TRUE, FALSE),
('Pro', 'Профессиональный план с аналитикой', 29.99, NULL, TRUE, TRUE);

-- ===================================
-- 3. USER_SUBSCRIPTIONS (Подписки пользователей)
-- ===================================
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id),

    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- NULL = не истекает (для Free)
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(user_id) -- у пользователя может быть только одна активная подписка
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- ===================================
-- 4. DEEPLINKS (Диплинки продюсеров)
-- ===================================
CREATE TABLE deeplinks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    custom_name VARCHAR(100) UNIQUE NOT NULL, -- уникальное имя в конце ссылки

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id) -- у каждого продюсера один диплинк
);

CREATE INDEX idx_deeplinks_custom_name ON deeplinks(custom_name);

-- ===================================
-- 5. LICENSES (Лицензии)
-- ===================================
CREATE TABLE licenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = глобальная лицензия

    name VARCHAR(100) NOT NULL,
    description TEXT,
    terms TEXT, -- условия использования

    -- Файлы, включенные в лицензию
    includes_mp3 BOOLEAN DEFAULT TRUE,
    includes_wav BOOLEAN DEFAULT FALSE,
    includes_stems BOOLEAN DEFAULT FALSE,

    is_global BOOLEAN DEFAULT FALSE, -- глобальная (дефолтная) или кастомная

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем дефолтные глобальные лицензии (для Free плана)
INSERT INTO licenses (name, description, includes_mp3, includes_wav, includes_stems, is_global) VALUES
('Basic License', 'MP3 файл для некоммерческого использования', TRUE, FALSE, FALSE, TRUE),
('Premium License', 'MP3 + WAV файлы для коммерческого использования', TRUE, TRUE, FALSE, TRUE);

CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_is_global ON licenses(is_global);

-- ===================================
-- 6. BEATS (Биты)
-- ===================================
CREATE TABLE beats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    bpm INTEGER,
    key VARCHAR(10), -- например, "Am", "C#"
    genre VARCHAR(100),
    tags TEXT[], -- массив тегов для поиска

    -- Файлы (пути к файлам на диске или S3 URLs в будущем)
    mp3_file_path TEXT,
    wav_file_path TEXT,
    stems_file_path TEXT,
    cover_file_path TEXT,

    -- Статистика
    views_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beats_user_id ON beats(user_id);
CREATE INDEX idx_beats_created_at ON beats(created_at DESC);

-- ===================================
-- 7. BEAT_LICENSES (Лицензии для битов с ценами)
-- ===================================
CREATE TABLE beat_licenses (
    id SERIAL PRIMARY KEY,
    beat_id INTEGER NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(beat_id, license_id) -- один бит не может иметь дубликат лицензии
);

CREATE INDEX idx_beat_licenses_beat_id ON beat_licenses(beat_id);

-- ===================================
-- 8. CART (Корзина)
-- ===================================
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beat_id INTEGER NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, beat_id, license_id) -- нельзя добавить одну и ту же комбинацию дважды
);

CREATE INDEX idx_cart_user_id ON cart(user_id);

-- ===================================
-- 9. PURCHASES (Покупки)
-- ===================================
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beat_id INTEGER NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    license_id INTEGER NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,

    price DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('TON', 'Stars')),

    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_beat_id ON purchases(beat_id);
CREATE INDEX idx_purchases_purchased_at ON purchases(purchased_at DESC);

-- ===================================
-- 10. DOWNLOADS (Скачивания для аналитики)
-- ===================================
CREATE TABLE downloads (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE, -- NULL = бесплатное скачивание
    beat_id INTEGER NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    file_type VARCHAR(20) CHECK (file_type IN ('mp3', 'wav', 'stems')),
    is_free BOOLEAN DEFAULT FALSE, -- бесплатное скачивание или после покупки

    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_downloads_beat_id ON downloads(beat_id);
CREATE INDEX idx_downloads_user_id ON downloads(user_id);
CREATE INDEX idx_downloads_downloaded_at ON downloads(downloaded_at DESC);

-- ===================================
-- 11. BEAT_VIEWS (Просмотры битов)
-- ===================================
CREATE TABLE beat_views (
    id SERIAL PRIMARY KEY,
    beat_id INTEGER NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- может быть NULL если не авторизован

    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_beat_views_beat_id ON beat_views(beat_id);
CREATE INDEX idx_beat_views_viewed_at ON beat_views(viewed_at DESC);

-- ===================================
-- 🎉 SCHEMA CREATED SUCCESSFULLY!
-- ===================================

-- Тестовое сообщение
SELECT '✅ База данных Beatstore успешно создана!' AS status;
