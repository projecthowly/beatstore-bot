const EasyYandexS3 = require("easy-yandex-s3").default;
import path from "path";

/**
 * S3 клиент для Yandex Object Storage
 * Использует easy-yandex-s3 для нативной поддержки Яндекса
 *
 * Документация: https://github.com/powerdot/easy-yandex-s3
 */
const s3 = new EasyYandexS3({
  auth: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  Bucket: process.env.S3_BUCKET || "beatstore",
  debug: false, // Включить для отладки в консоли
});

/**
 * Загрузить файл в S3 и вернуть публичный URL
 *
 * @param filePath - Локальный путь к файлу
 * @param s3Key - Ключ (путь) файла в S3 bucket (например: "audio/mp3/beat_123.mp3")
 * @param contentType - MIME тип файла (не используется в easy-yandex-s3)
 * @returns Публичный URL загруженного файла
 *
 * @example
 * const url = await uploadToS3("/tmp/file.mp3", "audio/mp3/beat_123.mp3", "audio/mpeg");
 * // url: https://storage.yandexcloud.net/beatstore/audio/mp3/beat_123.mp3
 */
export async function uploadToS3(
  filePath: string,
  s3Key: string,
  _contentType: string // Не используется - easy-yandex-s3 определяет автоматически
): Promise<string> {
  try {
    console.log(`📤 Uploading ${s3Key} to Yandex Object Storage...`);

    // Загружаем файл через easy-yandex-s3
    // path - путь к локальному файлу
    // save_name - true означает сохранить оригинальное имя (мы передаём полный путь с папками)
    const upload = await s3.Upload(
      {
        path: filePath,
        save_name: true,
        name: s3Key, // Полный путь в бакете включая папки
      },
      "/" // Корневая директория
    );

    if (!upload || !upload.Location) {
      throw new Error("Upload failed: no Location returned");
    }

    const publicUrl = upload.Location;
    console.log(`✅ Uploaded to S3: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ S3 upload failed for ${s3Key}:`, error);
    throw new Error(`Failed to upload file to S3: ${error}`);
  }
}

/**
 * Загрузить файл из Buffer в S3
 * Используется для загрузки из памяти (например, с multer)
 *
 * @param buffer - Буфер с данными файла
 * @param s3Key - Ключ файла в S3 (например: "covers/image.png")
 * @param contentType - MIME тип (не используется в easy-yandex-s3)
 * @returns Публичный URL
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  s3Key: string,
  _contentType: string // Не используется - easy-yandex-s3 определяет автоматически
): Promise<string> {
  try {
    console.log(`📤 Uploading buffer ${s3Key} to Yandex Object Storage...`);

    // Загружаем Buffer через easy-yandex-s3
    const upload = await s3.Upload(
      {
        buffer: buffer,
        name: s3Key, // Полный путь включая папки
      },
      "/" // Корневая директория
    );

    if (!upload || !upload.Location) {
      throw new Error("Upload failed: no Location returned");
    }

    const publicUrl = upload.Location;
    console.log(`✅ Uploaded buffer to S3: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ S3 buffer upload failed for ${s3Key}:`, error);
    throw new Error(`Failed to upload buffer to S3: ${error}`);
  }
}

/**
 * Получить MIME тип по расширению файла
 */
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Генерация уникального ключа для S3
 *
 * @param folder - Папка (например: "audio/mp3", "covers", "stems")
 * @param filename - Оригинальное имя файла
 * @returns Уникальный S3 ключ
 *
 * @example
 * generateS3Key("audio/mp3", "mybeat.mp3")
 * // "audio/mp3/1738567890_abc123_mybeat.mp3"
 */
export function generateS3Key(folder: string, filename: string): string {
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);
  const safeName = basename.replace(/[^a-z0-9_\-.]+/gi, "_");
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${folder}/${timestamp}_${random}_${safeName}${ext}`;
}

// Экспортируем клиент для прямого использования (если нужно)
export { s3 };
