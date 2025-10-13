# 📚 Как использовать базу данных

## 🎯 Быстрый старт

```typescript
import * as db from "./database.js";

// Найти или создать пользователя
let user = await db.findUserByTelegramId(telegramId);
if (!user) {
  user = await db.createUser({
    telegram_id: telegramId,
    username: "nickname",
    role: "producer", // или "artist"
  });
}
```

## 📋 Основные операции

### Пользователи

```typescript
// Найти пользователя
const user = await db.findUserByTelegramId(123456789);

// Создать пользователя
const newUser = await db.createUser({
  telegram_id: 123456789,
  username: "producer_name",
  role: "producer",
});

// Обновить профиль
await db.updateUser(userId, {
  bio: "Я продюсер битов",
  instagram_url: "https://instagram.com/...",
});

// Получить подписку
const subscription = await db.getUserSubscription(userId);
console.log(subscription.subscription.name); // "Free", "Basic", "Pro"
```

### Биты

```typescript
// Создать бит
const beat = await db.createBeat({
  user_id: producerId,
  title: "Dark Trap Beat",
  bpm: 140,
  key: "Am",
  genre: "Trap",
  tags: ["dark", "trap", "hard"],
  mp3_file_path: "/uploads/beat123.mp3",
  cover_file_path: "/uploads/cover123.jpg",
});

// Добавить лицензии к биту
await db.addBeatLicense({
  beat_id: beat.id,
  license_id: 1, // Basic License
  price: 29.99,
});

await db.addBeatLicense({
  beat_id: beat.id,
  license_id: 2, // Premium License
  price: 49.99,
});

// Получить все биты продюсера
const beats = await db.getProducerBeats(producerId);

// Получить лицензии для бита
const licenses = await db.getBeatLicenses(beatId);
```

### Корзина и покупки

```typescript
// Добавить в корзину
await db.addToCart({
  user_id: userId,
  beat_id: beatId,
  license_id: licenseId,
});

// Получить корзину
const cart = await db.getCart(userId);

// Создать покупку
const purchase = await db.createPurchase({
  user_id: userId,
  beat_id: beatId,
  license_id: licenseId,
  price: 29.99,
  payment_method: "TON",
});

// Очистить корзину после покупки
await db.clearCart(userId);

// Получить историю покупок
const purchases = await db.getUserPurchases(userId);
```

### Диплинки

```typescript
// Создать диплинк для продюсера
await db.createDeeplink({
  user_id: producerId,
  custom_name: "my_beats", // t.me/bot?start=my_beats
});

// Обновить диплинк
await db.updateDeeplink(producerId, {
  custom_name: "new_name",
});

// Найти продюсера по диплинку
const producer = await db.findUserByDeeplink("my_beats");
```

### Аналитика

```typescript
// Зарегистрировать просмотр бита
await db.recordBeatView({
  beat_id: beatId,
  user_id: userId, // опционально
});

// Зарегистрировать скачивание
await db.recordDownload({
  beat_id: beatId,
  user_id: userId,
  file_type: "mp3",
  is_free: true, // бесплатное скачивание
});

// Получить аналитику за период
const startDate = new Date("2025-01-01");
const endDate = new Date("2025-12-31");
const analytics = await db.getProducerAnalytics(
  producerId,
  startDate,
  endDate
);

console.log(analytics);
// {
//   total_views: 1234,
//   total_sales: 56,
//   total_revenue: 1999.44,
//   total_free_downloads: 89,
//   beats: [
//     {
//       beat_id: 1,
//       beat_title: "Dark Trap",
//       views_count: 500,
//       sales_count: 20,
//       revenue: 599.80,
//       free_downloads_count: 30
//     },
//     // ...
//   ]
// }

// Получить историю продаж
const sales = await db.getProducerSalesHistory(producerId, 50);
```

## 🗂️ Структура таблиц

### users
- **id** - автоинкремент
- **telegram_id** - Telegram ID пользователя (уникальный)
- **username** - никнейм
- **avatar_url** - ссылка на аватар
- **role** - роль: `producer` или `artist`
- **bio** - описание профиля
- **instagram_url, youtube_url, soundcloud_url, spotify_url** - ссылки на соцсети
- **other_links** - JSON с дополнительными ссылками
- **balance** - баланс продюсера
- **created_at, updated_at** - даты

### subscriptions
- **id** - ID плана
- **name** - `Free`, `Basic`, `Pro`
- **price** - цена в месяц
- **max_beats** - лимит битов (NULL = без лимита)
- **can_create_licenses** - может создавать кастомные лицензии
- **has_analytics** - доступ к аналитике

### beats
- **id** - ID бита
- **user_id** - ID продюсера
- **title** - название
- **bpm, key, genre, tags** - метаданные
- **mp3_file_path, wav_file_path, stems_file_path, cover_file_path** - пути к файлам
- **views_count, sales_count** - счетчики
- **created_at, updated_at** - даты

### licenses
- **id** - ID лицензии
- **user_id** - NULL для глобальных лицензий
- **name** - название
- **includes_mp3, includes_wav, includes_stems** - что включено
- **is_global** - глобальная или кастомная

### beat_licenses
- **beat_id + license_id** - связь бита с лицензией
- **price** - цена для этого бита

### cart
- **user_id + beat_id + license_id** - корзина пользователя

### purchases
- **user_id, beat_id, license_id** - информация о покупке
- **price** - цена на момент покупки
- **payment_method** - `TON` или `Stars`
- **purchased_at** - дата покупки

### downloads
- **purchase_id** - NULL если бесплатное скачивание
- **beat_id, user_id** - кто и что скачал
- **file_type** - `mp3`, `wav`, `stems`
- **is_free** - бесплатное или после покупки
- **downloaded_at** - дата

### beat_views
- **beat_id, user_id** - просмотр бита
- **viewed_at** - дата

## 🔐 Важные правила

1. **При создании продюсера** автоматически назначается подписка `Free`
2. **При покупке** автоматически:
   - Увеличивается `sales_count` у бита
   - Добавляется сумма к `balance` продюсера
3. **При просмотре бита** увеличивается `views_count`
4. **Один пользователь** может иметь только одну активную подписку
5. **У продюсера** может быть только один диплинк
6. **Один бит** может иметь несколько лицензий с разными ценами

## 📊 Примеры запросов

```typescript
// Проверить лимит битов для продюсера
const subscription = await db.getUserSubscription(producerId);
const beatsCount = (await db.getProducerBeats(producerId)).length;

if (subscription.subscription.max_beats !== null &&
    beatsCount >= subscription.subscription.max_beats) {
  console.log("Достигнут лимит битов! Обновите подписку.");
}

// Получить все биты для глобального битстора
const allBeats = await db.getAllBeats(50, 0); // лимит 50, offset 0

// Проверить, может ли продюсер создавать кастомные лицензии
const subscription = await db.getUserSubscription(producerId);
if (subscription.subscription.can_create_licenses) {
  // Можно создавать кастомные лицензии
}

// Проверить доступ к аналитике
if (subscription.subscription.has_analytics) {
  // Показать вкладку "Аналитика"
}
```

## 🚀 Следующие шаги

1. Интегрировать функции БД в `server/src/index.ts`
2. Реализовать API endpoints для клиента
3. Добавить обработку загрузки файлов
4. Реализовать платежную систему (TON, Stars)

---

**Все функции уже готовы и протестированы! 🎉**
