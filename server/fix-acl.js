/**
 * Скрипт для установки ACL public-read на все существующие файлы в бакете
 */

import { S3Client, ListObjectsV2Command, PutObjectAclCommand } from "@aws-sdk/client-s3";
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

async function listAllObjects() {
  console.log(`📋 Получаю список всех файлов в бакете "${BUCKET_NAME}"...\n`);

  const objects = [];
  let continuationToken = undefined;

  try {
    do {
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(command);

      if (response.Contents) {
        objects.push(...response.Contents);
        console.log(`   Найдено объектов: ${response.Contents.length}`);
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`\n✅ Всего файлов в бакете: ${objects.length}\n`);
    return objects;
  } catch (error) {
    console.error(`❌ Ошибка при получении списка:`, error.message);
    throw error;
  }
}

async function setPublicAcl(key) {
  try {
    const command = new PutObjectAclCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ACL: "public-read",
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`   ❌ Ошибка для ${key}:`, error.message);
    return false;
  }
}

async function fixAllAcls() {
  console.log(`🚀 Начинаю установку ACL public-read для всех файлов...\n`);

  try {
    // Получаем список всех файлов
    const objects = await listAllObjects();

    if (objects.length === 0) {
      console.log("ℹ️  Бакет пустой, нечего обновлять");
      return;
    }

    // Обновляем ACL для каждого файла
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      console.log(`[${i + 1}/${objects.length}] Обновляю ACL для: ${obj.Key}`);

      const success = await setPublicAcl(obj.Key);
      if (success) {
        successCount++;
        console.log(`   ✅ Успешно`);
      } else {
        failCount++;
      }
    }

    console.log(`\n📊 Результаты:`);
    console.log(`   ✅ Успешно обновлено: ${successCount}`);
    console.log(`   ❌ Ошибок: ${failCount}`);
    console.log(`\n✅ ГОТОВО! Все файлы теперь публично доступны\n`);

  } catch (error) {
    console.error(`\n❌ ОШИБКА:`, error);
    process.exit(1);
  }
}

fixAllAcls();
