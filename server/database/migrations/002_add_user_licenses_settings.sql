-- Добавляем таблицу для хранения пользовательских настроек лицензий
CREATE TABLE IF NOT EXISTS user_license_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_key VARCHAR(50) NOT NULL, -- 'mp3', 'wav', 'stems', 'custom_123'
    license_name VARCHAR(100) NOT NULL,
    default_price DECIMAL(10, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, license_key)
);

CREATE INDEX idx_user_license_settings_user_id ON user_license_settings(user_id);
