import { Telegraf, Markup } from 'telegraf';

export function withVersion(url: string, buildId?: string): string {
  const v = buildId || process.env.BUILD_ID || String(Date.now());
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(v)}`;
}

export async function setMenuButton(bot: Telegraf, text: string, url: string, buildId?: string) {
  const finalUrl = withVersion(url, buildId);
  await bot.telegram.setChatMenuButton({
    // ВАЖНО: camelCase
    menuButton: { type: 'web_app', text, web_app: { url: finalUrl } }
  });
  console.log('🟦 Menu Button →', finalUrl);
}

export function createBot(token: string, webAppUrl?: string) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name ?? 'друг';
    const kb = webAppUrl
      ? Markup.inlineKeyboard([Markup.button.webApp('Open', withVersion(webAppUrl))])
      : undefined;
    await ctx.reply(`Привет, ${name}! Открывай мини-аппу.`, kb);
  });

  bot.command('open', async (ctx) => {
    if (!webAppUrl) return ctx.reply('WEBAPP_URL не задан на сервере.');
    await ctx.reply('Открыть мини-аппу:', Markup.inlineKeyboard([
      Markup.button.webApp('Open', withVersion(webAppUrl))
    ]));
  });

  return bot;
}
