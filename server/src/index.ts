import 'dotenv/config';
import express from 'express';
import { createBot } from './bot';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const BASE_URL = process.env.BASE_URL || '';
const PORT = Number(process.env.PORT || 8080);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не задан в .env');
  process.exit(1);
}

async function main() {
  console.log('🔧 Конфиг:', { PORT, BASE_URL: BASE_URL || '(пусто)', WEBAPP_URL: WEBAPP_URL || '(пусто)' });

  const app = express();
  app.use(express.json());

  // health-check отвечает всегда
  app.get('/health', (_req, res) => {
    res.json({ ok: true, mode: BASE_URL ? 'webhook' : 'polling' });
  });

  const server = app.listen(PORT, () => {
    console.log(`🌐 HTTP сервер поднят:  http://localhost:${PORT}  (ожидание запуска бота...)`);
  });

  // аккуратная остановка
  const stop = async () => {
    console.log('⏹ Остановка…');
    try { server.close(); } catch {}
    try { await bot.stop(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // --- TELEGRAM BOT ---
  console.log('🤖 Инициализация бота…');
  const bot = createBot(BOT_TOKEN, WEBAPP_URL);

  const webhookPath = `/webhook/${bot.secretPathComponent()}`;

  try {
    if (BASE_URL) {
      // WEBHOOK режим
      const webhookUrl = `${BASE_URL}${webhookPath}`;
      await bot.telegram.setWebhook(webhookUrl);
      app.use(webhookPath, bot.webhookCallback(webhookPath));
      console.log(`✅ Webhook установлен: ${webhookUrl}`);
      console.log('✅ Готов принимать апдейты через вебхук');
    } else {
      // POLLING режим (дефолт)
      await bot.telegram.deleteWebhook().catch(() => {});
      await bot.launch();
      console.log('✅ Bot запущен в режиме long polling');
    }
  } catch (e) {
    console.error('❌ Ошибка запуска бота:', e);
    console.log('ℹ️ HTTP сервер продолжает работать, /health доступен.');
  }
}

main().catch((e) => {
  console.error('❌ Критическая ошибка старта:', e);
  process.exit(1);
});
