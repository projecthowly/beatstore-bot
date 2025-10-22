-- Добавляем дефолтное значение для бесплатного скачивания в профиль пользователя
ALTER TABLE users ADD COLUMN free_download_default BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.free_download_default IS 'Дефолтное значение для free_download при создании нового бита';
