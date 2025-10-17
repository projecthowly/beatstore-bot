#!/bin/bash
set -e

SERVER_HOST="root@beatry.store"
SERVER_PATH="/root/beatstore-bot"

echo "📥 Получаю обновления из GitHub..."
git pull origin main

echo "🔧 Настройка окружения для production..."
cd client
if [ -f .env.production ]; then
  cp .env.production .env
  echo "✅ Скопирован .env.production → .env"
fi

echo "🔨 Собираю клиент..."
npm install
npm run build

echo "🔨 Собираю сервер..."
cd ../server
npm install
npm run build

echo "📤 Загружаю файлы на сервер..."
cd ..
echo "  - Загружаю client/dist..."
scp -r client/dist ${SERVER_HOST}:${SERVER_PATH}/client/
echo "  - Загружаю server/dist..."
scp -r server/dist ${SERVER_HOST}:${SERVER_PATH}/server/
echo "  - Загружаю server/.env..."
scp server/.env ${SERVER_HOST}:${SERVER_PATH}/server/.env

echo "🔄 Пересоздаю контейнер на сервере..."
ssh ${SERVER_HOST} "cd ${SERVER_PATH} && docker compose down app && docker compose up -d app"

echo "⏳ Жду запуска сервера..."
sleep 5

echo "📋 Логи сервера:"
ssh ${SERVER_HOST} "docker logs beatstore-app --tail 20"

echo "✅ Деплой завершён!"
