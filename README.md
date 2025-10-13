# 🎵 Beatstore Bot

Telegram бот для продажи битов с веб-приложением и админ-панелью.

## 🚀 Быстрый старт (Docker)

### Запустить все сервисы

```bash
docker compose up -d --build
```

Это запустит:
- 🗄️ **PostgreSQL** (порт 5432) - база данных
- 🌐 **pgAdmin** (http://localhost:5050) - управление БД
- 🤖 **Node.js Server** (порт 8080) - Telegram бот + API

### Остановить сервисы

```bash
docker compose down
```

### Посмотреть логи

```bash
docker logs beatstore-server -f    # Логи бота и сервера
docker logs beatstore-postgres -f   # Логи базы данных
```

## 📁 Структура проекта

```
beatstore-bot/
├── client/           # React веб-приложение (Telegram Mini App)
├── server/           # Node.js сервер (Telegram бот + API)
│   ├── src/          # Исходный код
│   ├── database/     # SQL скрипты для БД
│   └── Dockerfile    # Docker образ сервера
├── uploads/          # Загруженные файлы (биты, обложки)
├── docker-compose.yml # Конфигурация Docker
└── DATABASE.md       # Подробная документация по БД
```

## 🔧 Разработка

### Клиент (React)

```bash
cd client
npm install
npm run dev
```

### Сервер (без Docker)

```bash
cd server
npm install
npx tsx src/index.ts
```

**Важно**: При запуске сервера вне Docker, измените в `server/.env`:
```
DB_HOST=localhost  # вместо beatstore-postgres
```

## 🗄️ База данных

Подробная документация в [DATABASE.md](DATABASE.md)

### Доступ к pgAdmin

1. Откройте http://localhost:5050
2. Войдите:
   - Email: `admin@beatstore.com`
   - Пароль: `admin112444`
3. Подключитесь к серверу:
   - Host: `beatstore-postgres`
   - Database: `beatstore_db`
   - User: `beatstore_user`
   - Password: `simple123`

## 🚢 Деплой

1. Скопируйте проект на сервер
2. Обновите переменные окружения в `.env`
3. Запустите:
   ```bash
   docker compose up -d --build
   ```

## 📝 Переменные окружения

Создайте файл `.env` в корне проекта:

```env
BOT_TOKEN=ваш_токен_бота
WEBAPP_URL=https://ваш-домен.com
DEPLOY_TOKEN=ваш_секретный_токен
```

## 🛠️ Технологии

- **Backend**: Node.js + TypeScript + Express
- **Frontend**: React + TypeScript + Vite + Mantine UI
- **Database**: PostgreSQL 16
- **Bot**: node-telegram-bot-api
- **Docker**: Docker Compose

## 📚 Документация

- [DATABASE.md](DATABASE.md) - Работа с базой данных
- [docker-compose.yml](docker-compose.yml) - Конфигурация Docker

## 🆘 Помощь

При проблемах с подключением:
```bash
# Проверить статус контейнеров
docker ps

# Перезапустить все
docker compose restart

# Посмотреть логи
docker compose logs
```

---

**Made with ❤️ for beat producers**
