/**
 * Скрипт для удаления всех файлов из бакета
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.S3_REGION || "ru-central1",
  endpoint: process.env.S3_ENDPOINT || "https://storage.yandexcloud.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || "beatstore";

async function clearBucket() {
  console.log(`🗑️  Удаляю все файлы из бакета "${BUCKET_NAME}"...\n`);

  try {
    // Получаем список всех объектов
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log("ℹ️  Бакет уже пустой\n");
      return;
    }

    console.log(`📋 Найдено объектов: ${response.Contents.length}\n`);

    // Удаляем все объекты
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: response.Contents.map(obj => ({ Key: obj.Key })),
        Quiet: false,
      },
    });

    const deleteResponse = await s3Client.send(deleteCommand);

    if (deleteResponse.Deleted) {
      console.log(`✅ Удалено файлов: ${deleteResponse.Deleted.length}\n`);
      deleteResponse.Deleted.forEach(obj => {
        console.log(`   ✓ ${obj.Key}`);
      });
    }

    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.log(`\n❌ Ошибки при удалении:\n`);
      deleteResponse.Errors.forEach(err => {
        console.log(`   ✗ ${err.Key}: ${err.Message}`);
      });
    }

    console.log(`\n✅ ГОТОВО! Бакет очищен\n`);

  } catch (error) {
    console.error(`\n❌ ОШИБКА:`, error.message);
    process.exit(1);
  }
}

clearBucket();
