import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

/**
 * Конвертирует WAV файл в MP3 с тегом
 * @param wavPath - путь к исходному WAV файлу
 * @param outputPath - путь для сохранения MP3 с тегом
 * @param producerName - имя продюсера для тега
 */
export async function convertWavToTaggedMp3(
  wavPath: string,
  outputPath: string,
  producerName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(wavPath)
      .audioCodec("libmp3lame")
      .audioBitrate("320k") // Высокое качество
      .outputOptions([
        `-metadata`,
        `comment=PROD BY ${producerName}`,
        `-metadata`,
        `artist=${producerName}`,
      ])
      .on("end", () => {
        console.log(`✅ Конвертация в MP3 с тегом завершена: ${outputPath}`);
        resolve();
      })
      .on("error", (err: Error) => {
        console.error(`❌ Ошибка конвертации в MP3 с тегом:`, err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Конвертирует WAV файл в MP3 без тега
 * @param wavPath - путь к исходному WAV файлу
 * @param outputPath - путь для сохранения MP3 без тега
 */
export async function convertWavToUntaggedMp3(
  wavPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(wavPath)
      .audioCodec("libmp3lame")
      .audioBitrate("320k") // Высокое качество
      .outputOptions([
        `-map_metadata`, `-1`, // Удаляем все метаданные
      ])
      .on("end", () => {
        console.log(`✅ Конвертация в MP3 без тега завершена: ${outputPath}`);
        resolve();
      })
      .on("error", (err: Error) => {
        console.error(`❌ Ошибка конвертации в MP3 без тега:`, err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Обрабатывает загруженный WAV файл: создает MP3 с тегом и MP3 без тега
 * @param wavPath - путь к загруженному WAV файлу
 * @param producerName - имя продюсера для тега
 * @returns объект с путями к созданным файлам
 */
export async function processUploadedAudio(
  wavPath: string,
  producerName: string
): Promise<{
  mp3TaggedPath: string;
  mp3UntaggedPath: string;
  wavPath: string;
}> {
  const dir = path.dirname(wavPath);
  const basename = path.basename(wavPath, path.extname(wavPath));

  const mp3TaggedPath = path.join(dir, `${basename}_tagged.mp3`);
  const mp3UntaggedPath = path.join(dir, `${basename}_untagged.mp3`);

  console.log(`🎵 Начало обработки аудио: ${wavPath}`);
  console.log(`   MP3 с тегом: ${mp3TaggedPath}`);
  console.log(`   MP3 без тега: ${mp3UntaggedPath}`);

  try {
    // Конвертируем в оба формата параллельно
    await Promise.all([
      convertWavToTaggedMp3(wavPath, mp3TaggedPath, producerName),
      convertWavToUntaggedMp3(wavPath, mp3UntaggedPath),
    ]);

    console.log(`✅ Обработка аудио завершена успешно`);

    return {
      mp3TaggedPath,
      mp3UntaggedPath,
      wavPath,
    };
  } catch (error) {
    // Очищаем созданные файлы в случае ошибки
    try {
      await fs.unlink(mp3TaggedPath).catch(() => {});
      await fs.unlink(mp3UntaggedPath).catch(() => {});
    } catch (e) {
      console.error("Ошибка очистки файлов:", e);
    }
    throw error;
  }
}

/**
 * Генерирует имя файла для бесплатного скачивания
 * @param producerUsername - ник продюсера
 * @param beatTitle - название бита
 * @param bpm - BPM бита
 * @param key - тональность бита
 * @returns отформатированное имя файла (без расширения)
 */
export function generateFreeDownloadFilename(
  producerUsername: string,
  beatTitle: string,
  bpm: number | null,
  key: string | null
): string {
  const parts: string[] = [`@${producerUsername}`];

  if (bpm) {
    parts.push(`${bpm}BPM`);
  }

  if (key) {
    parts.push(key);
  }

  parts.push(beatTitle);

  // Удаляем недопустимые символы для имени файла
  return parts
    .join(" ")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
}
