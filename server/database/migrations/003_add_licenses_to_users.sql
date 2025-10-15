-- Добавляем поле licenses в таблицу users для хранения пользовательских лицензий
-- Формат: [{"id": "mp3", "name": "MP3", "defaultPrice": 100}, ...]

ALTER TABLE users ADD COLUMN IF NOT EXISTS licenses JSONB DEFAULT '[]'::jsonb;

-- Инициализируем дефолтные лицензии для существующих продюсеров
UPDATE users
SET licenses = '[
  {"id": "mp3", "name": "MP3", "defaultPrice": null},
  {"id": "wav", "name": "WAV", "defaultPrice": null},
  {"id": "stems", "name": "STEMS", "defaultPrice": null}
]'::jsonb
WHERE role = 'producer' AND (licenses IS NULL OR licenses = '[]'::jsonb);

SELECT '✅ Миграция завершена: добавлено поле licenses в таблицу users' AS status;
