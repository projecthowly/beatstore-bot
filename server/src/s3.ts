import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

/**
 * S3 клиент для Yandex Object Storage
 * Endpoint: https://storage.yandexcloud.net
 * Region: ru-central1
 */
const s3Client = new S3Client({
  region: process.env.S3_REGION || "ru-central1",
  endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true, // Path-style URLs для Yandex Object Storage
});

/**
 * Загрузить файл в S3 и вернуть публичный URL
 *
 * @param filePath - Локальный путь к файлу
 * @param s3Key - Ключ (путь) файла в S3 bucket (например: "audio/beat_123.mp3")
 * @param contentType - MIME тип файла
 * @returns Публичный URL загруженного файла
 *
 * @example
 * const url = await uploadToS3("/tmp/file.mp3", "audio/beat_123.mp3", "audio/mpeg");
 * // url: https://storage.yandexcloud.net/beatstore/audio/beat_123.mp3
 */
export async function uploadToS3(
  filePath: string,
  s3Key: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.S3_BUCKET || "beatstore";

  try {
    // Читаем весь файл в память (простая загрузка без multipart)
    const fileContent = fs.readFileSync(filePath);

    console.log(`📤 Uploading ${s3Key} (${(fileContent.length / 1024 / 1024).toFixed(2)} MB)...`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      // ACL не нужен - публичный доступ настроен через Bucket Policy
    });

    await s3Client.send(command);

    // Формируем публичный URL (Yandex Object Storage)
    const publicUrl = `https://storage.yandexcloud.net/${bucketName}/${s3Key}`;
    console.log(`✅ Uploaded to S3: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error(`❌ S3 upload failed for ${s3Key}:`, error);
    throw new Error(`Failed to upload file to S3: ${error}`);
  }
}

/**
 * Загрузить файл из Buffer в S3
 * Полезно для загрузки файлов из памяти без сохранения на диск
 *
 * @param buffer - Буфер с данными файла
 * @param s3Key - Ключ файла в S3
 * @param contentType - MIME тип
 * @returns Публичный URL
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  s3Key: string,
  contentType: string
): Promise<string> {
  const bucketName = process.env.S3_BUCKET || "beatstore";

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      // ACL не нужен - публичный доступ настроен через Bucket Policy
    });

    await s3Client.send(command);

    const publicUrl = `https://storage.yandexcloud.net/${bucketName}/${s3Key}`;
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
 * @param folder - Папка (например: "audio", "covers", "stems")
 * @param filename - Оригинальное имя файла
 * @returns Уникальный S3 ключ
 *
 * @example
 * generateS3Key("audio", "mybeat.mp3")
 * // "audio/1738567890_abc123_mybeat.mp3"
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
export { s3Client };
