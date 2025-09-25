import { Telegraf, Markup } from 'telegraf';

export function createBot(token: string, webAppUrl?: string) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name ?? 'друг';
    if (webAppUrl) {
      await ctx.reply(
        `Привет, ${name}! Открой мини-аппу, чтобы посмотреть витрину.`,
        Markup.keyboard([[Markup.button.webApp('Open', webAppUrl)]]).resize()
      );
    } else {
      await ctx.reply(`Привет, ${name}! Нажми кнопку Open в меню бота.`);
    }
  });

  bot.command('whoami', (ctx) =>
    ctx.reply(`id: ${ctx.from?.id}\nusername: @${ctx.from?.username ?? '-'}`)
  );

  return bot;
}
