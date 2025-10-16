const { S3Client, ListObjectsV2Command, ListMultipartUploadsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ru-7",
  endpoint: "https://s3.ru-7.storage.selcloud.ru",
  credentials: {
    accessKeyId: "e90190facf0b43f99d1a22ae2569ed06",
    secretAccessKey: "267688a537284ad99d6d50d19958d56e",
  },
  forcePathStyle: false,
});

async function checkBucket() {
  const bucketName = "beatstore-files";

  try {
    // Проверяем обычные объекты
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const objects = await s3Client.send(listCommand);

    console.log(`📦 Objects in bucket: ${objects.KeyCount || 0}`);
    if (objects.Contents && objects.Contents.length > 0) {
      console.log("Files:");
      objects.Contents.forEach(obj => console.log(`  - ${obj.Key}`));
    }

    // Проверяем незавершенные multipart uploads
    const uploadsCommand = new ListMultipartUploadsCommand({ Bucket: bucketName });
    const uploads = await s3Client.send(uploadsCommand);

    if (uploads.Uploads && uploads.Uploads.length > 0) {
      console.log(`\n⚠️ Found ${uploads.Uploads.length} incomplete multipart uploads:`);
      uploads.Uploads.forEach(u => console.log(`  - ${u.Key}`));
    } else {
      console.log("\n✅ No incomplete uploads");
    }

  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

checkBucket().catch(console.error);
