#!/bin/bash
set -e

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

echo "🔄 Перезапускаю контейнеры..."
cd ..
docker compose restart app

echo "✅ Деплой завершён!"
docker logs beatstore-app --tail 10
