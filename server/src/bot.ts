import { Telegraf, Markup } from "telegraf";
import * as db from "./database.js";

export function createBot(token: string, webappUrl: string) {
  const bot = new Telegraf(token);

  // /start
  bot.start(async (ctx) => {
    console.log(`🔔 /start получен от пользователя: ${ctx.from?.id} (${ctx.from?.username})`);

    const telegramId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || "User";
    const name = ctx.from?.first_name || "дружище";

    if (!telegramId) {
      return await ctx.reply("Ошибка: не удалось получить ваш Telegram ID.");
    }

    try {
      // Проверяем, существует ли пользователь в БД
      let user = await db.findUserByTelegramId(telegramId);
      let isNewUser = false;

      // Если новый пользователь - НЕ создаём в БД сразу
      // Пусть фронтенд сначала покажет модалку выбора роли
      if (!user) {
        console.log(`👋 Новый пользователь: ${username} (${telegramId}) - покажем модалку выбора роли`);
        isNewUser = true;
      }

      // Формируем URL с параметрами пользователя
      const url = buildWebappUrl(webappUrl, {
        telegramId,
        username,
        role: user?.role || "producer", // временная роль для новых пользователей
        isNewUser,
      });

      await ctx.reply(
        `Привет, ${name}! Нажми кнопку ниже, чтобы открыть магазин.`,
        Markup.keyboard([
          [Markup.button.webApp("Open", url)]
        ])
          .resize()
          .oneTime()
      );
    } catch (error) {
      console.error("Ошибка при инициализации пользователя:", error);
      await ctx.reply("Произошла ошибка. Попробуйте позже или свяжитесь с поддержкой.");
    }
  });

  // fallback
  bot.on("message", async (ctx) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || "User";

    if (!telegramId) {
      return await ctx.reply("Ошибка: не удалось получить ваш Telegram ID.");
    }

    try {
      let user = await db.findUserByTelegramId(telegramId);
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
      }

      const url = buildWebappUrl(webappUrl, {
        telegramId,
        username,
        role: user?.role || "producer",
        isNewUser,
      });

      await ctx.reply(
        "Жми кнопку Open, чтобы открыть магазин.",
        Markup.keyboard([[Markup.button.webApp("Open", url)]])
          .resize()
          .oneTime()
      );
    } catch (error) {
      console.error("Ошибка при обработке сообщения:", error);
      await ctx.reply("Произошла ошибка. Попробуйте позже.");
    }
  });

  // Хелпер для формирования URL с данными пользователя
  function buildWebappUrl(baseUrl: string, params: {
    telegramId: number;
    username: string;
    role: string;
    isNewUser: boolean;
  }) {
    if (!baseUrl) return "";
    const url = new URL(baseUrl);
    url.searchParams.set("tgId", params.telegramId.toString());
    url.searchParams.set("username", params.username);
    url.searchParams.set("role", params.role);
    url.searchParams.set("isNew", params.isNewUser ? "1" : "0");
    return url.toString();
  }

  // маленький хелпер: добавим buildId для кэша
  function withBuildId(url: string, buildId?: string) {
    if (!url) return "";
    const u = new URL(url);
    if (buildId) u.searchParams.set("v", buildId);
    return u.toString();
  }

  // пробрасываем наружу (для /refresh-menu)
  (bot as any).__withBuildId = withBuildId;
  (bot as any).__buildWebappUrl = buildWebappUrl;

  return bot;
}

export async function setMenuButton(bot: Telegraf, text: string, webappUrl: string, buildId?: string) {
  const withBuildId = (bot as any).__withBuildId as (u: string, b?: string) => string;
  const url = withBuildId ? withBuildId(webappUrl, buildId) : webappUrl;

  // Важно: свойство называется menuButton (camelCase), не menu_button
  await bot.telegram.setChatMenuButton({
    menuButton: {
      type: "web_app",
      text,
      web_app: { url }
    }
  });
}
