# 🚀 Инструкция по деплою Beatstore Bot на HostVDS + Selectel S3

Этот документ содержит полную пошаговую инструкцию по развертыванию Telegram-бота beatstore на продакшн сервере.

## 📋 Что у нас есть

- **VPS сервер:** HostVDS, IP: `31.56.27.5`
- **S3 хранилище:** Selectel, bucket: `beatstore-files`, регион: `ru-7` (Москва)
- **База данных:** PostgreSQL 16 в Docker
- **Клиент:** React + Vite (TypeScript)
- **Сервер:** Node.js + Express (TypeScript)
- **Бот:** Telegraf

---

## 🔑 Шаг 1: Получение S3 ключей доступа в Selectel

1. Зайди на [Selectel S3](https://my.selectel.ru/storage/s3)
2. Перейди в раздел **"Ключи доступа"**
3. Нажми **"Создать ключ доступа"**
4. Скопируй:
   - **Access Key ID** (например: `12345_my-project`)
   - **Secret Access Key** (например: `AbcDef123456...`)
5. Сохрани эти ключи — они понадобятся в `.env` файле

---

## 🖥️ Шаг 2: Подключение к серверу по SSH

Открой терминал (PowerShell на Windows или Terminal на Mac/Linux):

```bash
ssh root@31.56.27.5
```

Введи пароль root, который ты получил при создании сервера на HostVDS.

---

## 📦 Шаг 3: Установка необходимого ПО на сервер

### 3.1. Обновление системы

```bash
apt update && apt upgrade -y
```

### 3.2. Установка Docker

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Запуск Docker
systemctl start docker
systemctl enable docker

# Проверка
docker --version
```

### 3.3. Установка Docker Compose

```bash
# Установка Docker Compose
apt install docker-compose -y

# Проверка
docker-compose --version
```

### 3.4. Установка Git

```bash
apt install git -y

# Проверка
git --version
```

### 3.5. Установка Node.js 18

```bash
# Добавление репозитория NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Установка Node.js
apt install -y nodejs

# Проверка
node --version
npm --version
```

---

## 📥 Шаг 4: Клонирование репозитория

```bash
# Переход в домашнюю директорию
cd ~

# Клонирование репозитория (замени на свой URL)
git clone https://github.com/projecthowly/beatstore-bot.git

# Переход в директорию проекта
cd beatstore-bot
```

---

## ⚙️ Шаг 5: Настройка переменных окружения

### 5.1. Создание `.env` файла для сервера

```bash
cp server/.env.example server/.env
nano server/.env
```

### 5.2. Заполни `.env` файл

Отредактируй файл, заполнив все значения:

```env
# Telegram Bot Configuration
BOT_TOKEN=8441917942:AAEZkkm7IiVqlqbRlXbHobcaBNwdr_U66DE
WEBAPP_URL=http://31.56.27.5:8080
BASE_URL=http://31.56.27.5:8080
DEPLOY_TOKEN=west147258

# Server Configuration
PORT=8080
NODE_ENV=production

# PostgreSQL Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=beatstore_user
DB_PASSWORD=StrongPassword_12345_CHANGE_THIS
DB_NAME=beatstore_db
DATABASE_URL=postgresql://beatstore_user:StrongPassword_12345_CHANGE_THIS@postgres:5432/beatstore_db

# Selectel S3 Storage Configuration
S3_ENDPOINT=https://s3.ru-7.storage.selcloud.ru
S3_REGION=ru-1
S3_BUCKET=beatstore-files
S3_ACCESS_KEY=ТВОЙ_ACCESS_KEY_ID
S3_SECRET_KEY=ТВОЙ_SECRET_ACCESS_KEY
```

**⚠️ ВАЖНО:**
- Замени `DB_PASSWORD` на сильный пароль
- Вставь свои `S3_ACCESS_KEY` и `S3_SECRET_KEY` из Шага 1
- Используй уже существующий `BOT_TOKEN` из твоего `.env` файла

Сохрани файл:
- В `nano`: нажми `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 🏗️ Шаг 6: Сборка проекта

### 6.1. Сборка клиента (React)

```bash
cd ~/beatstore-bot/client
npm install
npm run build
```

Это создаст папку `client/dist` с собранным React приложением.

### 6.2. Сборка сервера (Node.js)

```bash
cd ~/beatstore-bot/server
npm install
npm run build
```

Это создаст папку `server/dist` с скомпилированным TypeScript кодом.

---

## 🐳 Шаг 7: Запуск Docker контейнеров

Вернись в корневую директорию проекта:

```bash
cd ~/beatstore-bot
```

### 7.1. Запуск PostgreSQL и приложения

```bash
docker-compose up -d
```

Эта команда:
- Скачает образы PostgreSQL и Node.js
- Создаст контейнер `beatstore-postgres` с базой данных
- Создаст контейнер `beatstore-app` с сервером и ботом
- Запустит всё в фоновом режиме

### 7.2. Проверка статуса контейнеров

```bash
docker ps
```

Ты должен увидеть два работающих контейнера:
- `beatstore-postgres`
- `beatstore-app`

### 7.3. Просмотр логов

```bash
# Логи приложения
docker logs -f beatstore-app

# Логи базы данных
docker logs -f beatstore-postgres
```

Нажми `Ctrl+C` чтобы выйти из просмотра логов.

---

## 🗄️ Шаг 8: Миграция базы данных

После запуска контейнеров нужно выполнить миграцию для создания таблиц:

```bash
docker exec -it beatstore-app sh -c "cd server && npm run migrate"
```

Ты увидишь:
```
🚀 Starting database migration...
🔌 Connecting to database...
✅ Connected to PostgreSQL
📄 Reading SQL from: /app/server/database/init.sql
⚙️  Executing migration...
✅ Migration completed successfully!

📊 Database tables created:
   - users
   - beats
   - licenses
   - purchases
   - cart
   - downloads
   - beat_views
   - producer_followers
   - beat_likes
   - reviews
   - notifications
```

---

## 🧪 Шаг 9: Тестирование

### 9.1. Проверка API

```bash
curl http://31.56.27.5:8080/health
```

Ответ должен быть:
```json
{"ok":true,"mode":"polling"}
```

### 9.2. Проверка клиента

Открой браузер и зайди на:
```
http://31.56.27.5:8080
```

Ты должен увидеть React приложение.

### 9.3. Проверка Telegram бота

1. Открой Telegram
2. Найди своего бота
3. Нажми `/start`
4. Нажми кнопку **"Open"**
5. Должно открыться веб-приложение с модалкой выбора роли

---

## 🔄 Шаг 10: Обновление конфигурации Telegram бота

Теперь нужно обновить URL в настройках бота, чтобы он указывал на твой сервер:

### 10.1. Обновление WEBAPP_URL

Твой бот сейчас использует старый URL с GitHub Pages. Обновим его на новый:

```bash
cd ~/beatstore-bot/server
nano .env
```

Убедись, что `WEBAPP_URL` и `BASE_URL` указывают на твой сервер:
```env
WEBAPP_URL=http://31.56.27.5:8080
BASE_URL=http://31.56.27.5:8080
```

### 10.2. Перезапуск контейнера

```bash
cd ~/beatstore-bot
docker-compose restart app
```

### 10.3. Обновление кнопки меню в Telegram

Зайди в бота и отправь команду `/start` снова — теперь кнопка будет открывать новый URL.

---

## 📂 Шаг 11: Структура проекта на сервере

После деплоя структура должна выглядеть так:

```
~/beatstore-bot/
├── client/
│   ├── dist/              # Собранный React (статика)
│   ├── src/
│   └── package.json
├── server/
│   ├── dist/              # Скомпилированный TypeScript
│   ├── src/
│   ├── database/
│   │   ├── init.sql
│   │   └── migrate.js
│   ├── .env               # ВАЖНО: с реальными ключами
│   └── package.json
├── uploads/               # Временные файлы (перед загрузкой в S3)
├── docker-compose.yml
└── package.json
```

---

## 🔧 Полезные команды для управления

### Просмотр логов
```bash
docker logs -f beatstore-app
docker logs -f beatstore-postgres
```

### Перезапуск контейнеров
```bash
docker-compose restart
```

### Остановка контейнеров
```bash
docker-compose down
```

### Запуск контейнеров
```bash
docker-compose up -d
```

### Пересборка контейнеров после изменений
```bash
# Пересобрать клиент и сервер
cd ~/beatstore-bot
npm run build

# Перезапустить контейнер
docker-compose restart app
```

### Очистка системы Docker
```bash
# Удалить неиспользуемые образы и контейнеры
docker system prune -a
```

### Подключение к базе данных
```bash
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db
```

### Вход в контейнер приложения
```bash
docker exec -it beatstore-app sh
```

---

## 🛡️ Шаг 12: Безопасность (опционально, но рекомендуется)

### 12.1. Настройка firewall

```bash
# Установка UFW
apt install ufw -y

# Разрешаем SSH
ufw allow 22/tcp

# Разрешаем HTTP
ufw allow 8080/tcp

# Включаем firewall
ufw enable

# Проверяем статус
ufw status
```

### 12.2. Создание non-root пользователя

```bash
# Создаём пользователя
adduser beatstore

# Добавляем в группу sudo
usermod -aG sudo beatstore

# Добавляем в группу docker
usermod -aG docker beatstore

# Переключаемся на нового пользователя
su - beatstore
```

В дальнейшем используй этого пользователя вместо root.

---

## 🔄 Шаг 13: Обновление кода (после изменений)

Когда ты внесёшь изменения в код и запушишь их в GitHub:

```bash
# Подключись к серверу
ssh root@31.56.27.5

# Перейди в проект
cd ~/beatstore-bot

# Получи последние изменения
git pull origin main

# Пересобери клиент
cd client && npm install && npm run build

# Пересобери сервер
cd ../server && npm install && npm run build

# Перезапусти контейнер
cd ..
docker-compose restart app
```

---

## ❌ Решение проблем

### Проблема: Контейнер не запускается

**Решение:** Проверь логи:
```bash
docker logs beatstore-app
```

### Проблема: База данных недоступна

**Решение:** Проверь статус PostgreSQL:
```bash
docker ps
docker logs beatstore-postgres
```

Попробуй перезапустить:
```bash
docker-compose restart postgres
```

### Проблема: S3 не работает (файлы не загружаются)

**Решение:**
1. Проверь, что ключи доступа правильно указаны в `server/.env`
2. Проверь логи приложения:
   ```bash
   docker logs -f beatstore-app
   ```
3. Убедись, что bucket создан и имеет правильные настройки:
   - Приватный доступ
   - vHosted addressing
   - Регион: ru-7

### Проблема: Бот не отвечает

**Решение:**
1. Проверь, что `BOT_TOKEN` правильный в `server/.env`
2. Проверь логи:
   ```bash
   docker logs -f beatstore-app
   ```
3. Проверь, что контейнер работает:
   ```bash
   docker ps
   ```

### Проблема: React приложение не загружается

**Решение:**
1. Проверь, что клиент собран:
   ```bash
   ls -la ~/beatstore-bot/client/dist
   ```
2. Если папки `dist` нет, пересобери клиент:
   ```bash
   cd ~/beatstore-bot/client
   npm install
   npm run build
   ```
3. Перезапусти контейнер:
   ```bash
   docker-compose restart app
   ```

---

## 📊 Мониторинг

### Использование ресурсов

```bash
# Использование CPU и RAM
docker stats

# Использование диска
df -h

# Размер Docker образов
docker images
```

### База данных

```bash
# Подключиться к PostgreSQL
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db

# Посмотреть таблицы
\dt

# Посмотреть количество пользователей
SELECT COUNT(*) FROM users;

# Выйти
\q
```

---

## ✅ Итоговый чеклист

- [ ] VPS создан на HostVDS (IP: 31.56.27.5)
- [ ] S3 bucket создан на Selectel (beatstore-files)
- [ ] Access Keys получены из Selectel
- [ ] SSH подключение к серверу работает
- [ ] Docker и Docker Compose установлены
- [ ] Git и Node.js установлены
- [ ] Репозиторий склонирован
- [ ] `.env` файл создан и заполнен
- [ ] Клиент собран (`client/dist` существует)
- [ ] Сервер собран (`server/dist` существует)
- [ ] Docker контейнеры запущены
- [ ] Миграция базы данных выполнена
- [ ] API доступен по `http://31.56.27.5:8080/health`
- [ ] React приложение открывается в браузере
- [ ] Telegram бот отвечает на `/start`
- [ ] Модалка выбора роли работает
- [ ] Загрузка битов в S3 работает

---

## 🎉 Готово!

Теперь твой бот полностью развёрнут на продакшн сервере!

**Адрес веб-приложения:** `http://31.56.27.5:8080`
**Telegram бот:** Открой своего бота и нажми `/start`

---

## 📞 Поддержка

Если что-то не получается:
1. Проверь логи контейнеров
2. Убедись, что все переменные окружения правильно заполнены
3. Проверь, что все сервисы запущены (`docker ps`)
4. Напиши мне с подробным описанием проблемы и логами
