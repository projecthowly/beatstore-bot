import 'dotenv/config';
import path from 'path';
import express from 'express';
import type { Telegraf } from 'telegraf';
import { createBot, setMenuButton } from './bot';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBAPP_URL = process.env.WEBAPP_URL || ''; // БАЗОВАЯ ссылка без ?v=
const BASE_URL = process.env.BASE_URL || '';     // если будет вебхук
const PORT = Number(process.env.PORT || 8080);
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || ''; // общий секрет для /refresh-menu

let bot: Telegraf | null = null;

async function main() {
  console.log('🔧 Конфиг:', {
    PORT,
    BASE_URL: BASE_URL || '(пусто)',
    WEBAPP_URL: WEBAPP_URL || '(пусто)',
  });

  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не задан');
    process.exit(1);
  }
  if (!WEBAPP_URL) {
    console.warn('⚠️ WEBAPP_URL пуст — кнопка Open не будет настроена');
  }

  const app = express();
  app.use(express.json());

  // health
  app.get('/health', (_req, res) => {
    res.json({ ok: true, mode: BASE_URL ? 'webhook' : 'polling' });
  });

  // (опционально) отдача собранной мини-аппы, если когда-нибудь решишь хранить её на сервере
  app.use('/app', express.static(path.join(__dirname, '..', 'public', 'app')));

  const server = app.listen(PORT, () => {
    console.log(`🌐 HTTP сервер поднят:  http://localhost:${PORT}`);
  });

  // --- БОТ ---
  const b = createBot(BOT_TOKEN, WEBAPP_URL);
  bot = b as unknown as Telegraf;
  const webhookPath = `/webhook/${b.secretPathComponent()}`;

  const stop = async () => {
    console.log('⏹ Остановка…');
    try { server.close(); } catch {}
    try { await (b as any).stop('SIGINT'); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  try {
    if (BASE_URL) {
      const webhookUrl = `${BASE_URL}${webhookPath}`;
      await (b as any).telegram.setWebhook(webhookUrl);
      app.use(webhookPath, (b as any).webhookCallback(webhookPath));
      console.log(`✅ Webhook установлен: ${webhookUrl}`);
    } else {
      await (b as any).telegram.deleteWebhook().catch(() => {});
      await (b as any).launch();
      console.log('✅ Bot в режиме long polling');
    }

    if (WEBAPP_URL) {
      await setMenuButton(b as any, 'Open', WEBAPP_URL);
    }
  } catch (e) {
    console.error('❌ Ошибка запуска бота:', e);
  }

  // --- Эндпоинт для CD: обновить кнопку после деплоя фронта ---
  app.post('/refresh-menu', async (req, res) => {
    try {
      if (!DEPLOY_TOKEN) return res.status(500).json({ ok: false, error: 'DEPLOY_TOKEN not set' });
      const token = req.headers['x-deploy-token'];
      if (token !== DEPLOY_TOKEN) return res.status(401).json({ ok: false, error: 'unauthorized' });

      const buildId = String(req.body?.buildId || Date.now());
      if (!bot || !WEBAPP_URL) return res.status(500).json({ ok: false, error: 'no-bot-or-url' });

      await setMenuButton(bot as any, 'Open', WEBAPP_URL, buildId);
      res.json({ ok: true, buildId });
    } catch (e) {
      console.error('refresh-menu error:', e);
      res.status(500).json({ ok: false });
    }
  });
}

main().catch((e) => {
  console.error('❌ Критическая ошибка:', e);
  process.exit(1);
});
