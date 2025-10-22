-- Добавляем поля для бесплатного скачивания и MP3 без тега

-- Добавляем путь к MP3 без тега (для лицензий)
ALTER TABLE beats ADD COLUMN mp3_untagged_file_path TEXT DEFAULT NULL;

-- Добавляем флаг бесплатного скачивания
ALTER TABLE beats ADD COLUMN free_download BOOLEAN DEFAULT FALSE;

-- Добавляем счетчик бесплатных скачиваний
ALTER TABLE beats ADD COLUMN free_downloads_count INTEGER DEFAULT 0;

-- Комментарии для ясности
COMMENT ON COLUMN beats.mp3_untagged_file_path IS 'Путь к MP3 без тега (для лицензий)';
COMMENT ON COLUMN beats.free_download IS 'Разрешено ли бесплатное скачивание MP3 с тегом';
COMMENT ON COLUMN beats.free_downloads_count IS 'Количество бесплатных скачиваний';
