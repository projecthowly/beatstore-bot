import { S3Client, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
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
      ACL: "public-read", // Явно делаем файл публичным
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
      ACL: "public-read", // Явно делаем файл публичным
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

/**
 * Копировать файл внутри S3 bucket
 * @param sourceKey - Исходный ключ файла
 * @param destinationKey - Целевой ключ файла
 * @returns URL нового файла
 */
export async function copyFileInS3(
  sourceKey: string,
  destinationKey: string
): Promise<string> {
  const bucketName = process.env.S3_BUCKET || "beatstore";
  const bucketUrl = process.env.S3_BUCKET_URL || `https://storage.yandexcloud.net/${bucketName}`;

  try {
    console.log(`📋 Copying ${sourceKey} → ${destinationKey}...`);

    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destinationKey,
      ACL: "public-read",
    });

    await s3Client.send(copyCommand);

    const newUrl = `${bucketUrl}/${destinationKey}`;
    console.log(`✅ File copied: ${newUrl}`);
    return newUrl;
  } catch (error) {
    console.error(`❌ Failed to copy ${sourceKey} to ${destinationKey}:`, error);
    throw error;
  }
}

/**
 * Удалить файл из S3
 * @param s3Key - Ключ файла для удаления
 */
export async function deleteFileFromS3(s3Key: string): Promise<void> {
  const bucketName = process.env.S3_BUCKET || "beatstore";

  try {
    console.log(`🗑️ Deleting ${s3Key}...`);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    await s3Client.send(deleteCommand);
    console.log(`✅ File deleted: ${s3Key}`);
  } catch (error) {
    console.error(`❌ Failed to delete ${s3Key}:`, error);
    throw error;
  }
}

/**
 * Удалить несколько файлов из S3 по URL
 * @param urls - Массив публичных URL файлов
 * @returns Количество удаленных файлов
 */
export async function deleteMultipleFromS3(urls: string[]): Promise<number> {
  const bucketName = process.env.S3_BUCKET || "beatstore";
  const bucketUrl = process.env.S3_BUCKET_URL || `https://storage.yandexcloud.net/${bucketName}`;

  let deletedCount = 0;

  for (const url of urls) {
    try {
      // Извлекаем ключ из URL
      const s3Key = url.replace(bucketUrl + "/", "").replace(bucketUrl, "");

      if (!s3Key || s3Key === url) {
        console.warn(`⚠️ Не удалось извлечь S3 ключ из URL: ${url}`);
        continue;
      }

      await deleteFileFromS3(s3Key);
      deletedCount++;
    } catch (error) {
      console.error(`❌ Failed to delete file ${url}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Переместить файл в S3 (копировать и удалить оригинал)
 * @param sourceKey - Исходный ключ файла
 * @param destinationKey - Целевой ключ файла
 * @returns URL нового файла
 */
export async function moveFileInS3(
  sourceKey: string,
  destinationKey: string
): Promise<string> {
  // Копируем файл
  const newUrl = await copyFileInS3(sourceKey, destinationKey);

  // Удаляем исходный файл
  await deleteFileFromS3(sourceKey);

  console.log(`✅ File moved: ${sourceKey} → ${destinationKey}`);
  return newUrl;
}

// Экспортируем клиент для прямого использования (если нужно)
export { s3Client };
