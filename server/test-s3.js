/**
 * Тестовый скрипт для проверки загрузки в Yandex Object Storage
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

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

async function testUpload() {
  console.log("🧪 Тестирую загрузку в Yandex Object Storage...\n");

  console.log("Конфигурация:");
  console.log("  - Endpoint:", process.env.S3_ENDPOINT);
  console.log("  - Region:", process.env.S3_REGION);
  console.log("  - Bucket:", process.env.S3_BUCKET);
  console.log("  - Access Key:", process.env.S3_ACCESS_KEY?.substring(0, 10) + "...");
  console.log("  - Force Path Style: true\n");

  try {
    // Создаём тестовый файл
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testKey = `test/test-${Date.now()}.txt`;

    console.log(`📤 Загружаю тестовый файл: ${testKey}...`);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || "beatstore",
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: "text/plain",
      ACL: "public-read", // Делаем файл публично доступным
    });

    await s3Client.send(command);

    const bucketName = process.env.S3_BUCKET || "beatstore";
    const publicUrl = `https://storage.yandexcloud.net/${bucketName}/${testKey}`;
    console.log(`✅ Успешно загружено!`);
    console.log(`📍 URL: ${publicUrl}\n`);

    console.log("✅ ТЕСТ ПРОЙДЕН! S3 работает корректно.");

  } catch (error) {
    console.error("❌ ОШИБКА:", error.message);
    console.error("\nДетали ошибки:");
    console.error(error);

    console.log("\n❌ ТЕСТ НЕ ПРОЙДЕН!");
  }
}

testUpload();
