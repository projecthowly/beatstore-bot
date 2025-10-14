# ⚡ Быстрый деплой на сервер 31.56.27.5

## 🔑 Твои данные:

**VPS:** 31.56.27.5 (HostVDS)
**S3 Bucket:** beatstore-files (Selectel, ru-7)
**S3 Access Key:** `e90190facf0b43f99d1a22ae2569ed06`
**S3 Secret Key:** `267688a537284ad99d6d50d19958d56e`
**DB Password:** `BeatStore_Secure_2025!`

---

## 🚀 Пошаговая инструкция

### Шаг 1: Подключись к серверу

```bash
ssh root@31.56.27.5
```

Введи пароль root (который получил от HostVDS).

---

### Шаг 2: Установка Docker

```bash
# Обновление системы
apt update && apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Запуск Docker
systemctl start docker
systemctl enable docker

# Установка Docker Compose
apt install docker-compose -y

# Проверка
docker --version
docker-compose --version
```

---

### Шаг 3: Установка Git и Node.js

```bash
# Установка Git
apt install git -y

# Установка Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверка
git --version
node --version
npm --version
```

---

### Шаг 4: Клонирование проекта

```bash
cd ~
git clone https://github.com/projecthowly/beatstore-bot.git
cd beatstore-bot
```

---

### Шаг 5: Создание .env файла на сервере

```bash
# Копируем шаблон
cp server/.env.example server/.env

# Открываем редактор
nano server/.env
```

**Вставь следующее содержимое:**

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
DB_PASSWORD=BeatStore_Secure_2025!
DB_NAME=beatstore_db
DATABASE_URL=postgresql://beatstore_user:BeatStore_Secure_2025!@postgres:5432/beatstore_db

# Selectel S3 Storage Configuration
S3_ENDPOINT=https://s3.ru-7.storage.selcloud.ru
S3_REGION=ru-1
S3_BUCKET=beatstore-files
S3_ACCESS_KEY=e90190facf0b43f99d1a22ae2569ed06
S3_SECRET_KEY=267688a537284ad99d6d50d19958d56e
```

**Сохрани файл:**
- Нажми `Ctrl+O` → `Enter` (сохранить)
- Нажми `Ctrl+X` (выйти)

---

### Шаг 6: Сборка клиента

```bash
cd ~/beatstore-bot/client
npm install
npm run build
```

Это займёт 2-3 минуты. В конце появится папка `client/dist`.

---

### Шаг 7: Сборка сервера

```bash
cd ~/beatstore-bot/server
npm install
npm run build
```

Это займёт 1-2 минуты. В конце появится папка `server/dist`.

---

### Шаг 8: Запуск Docker контейнеров

```bash
cd ~/beatstore-bot
docker-compose up -d
```

Команды Docker:
- `docker-compose up -d` — запустить в фоне
- `docker ps` — посмотреть запущенные контейнеры
- `docker logs -f beatstore-app` — посмотреть логи приложения
- `docker logs -f beatstore-postgres` — посмотреть логи БД

**Ожидаемый результат:**
```
Creating beatstore-postgres ... done
Creating beatstore-app      ... done
```

Проверь статус:
```bash
docker ps
```

Должно быть два контейнера:
- `beatstore-postgres` (статус: Up)
- `beatstore-app` (статус: Up)

---

### Шаг 9: Миграция базы данных

Создаём таблицы в PostgreSQL:

```bash
docker exec -it beatstore-app sh -c "cd server && npm run migrate"
```

**Ожидаемый результат:**
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

### Шаг 10: Проверка работы

#### 10.1 Проверка API

```bash
curl http://31.56.27.5:8080/health
```

**Ожидаемый ответ:**
```json
{"ok":true,"mode":"polling"}
```

#### 10.2 Проверка в браузере

Открой в браузере:
```
http://31.56.27.5:8080
```

Должно открыться React приложение (твой фронтенд).

#### 10.3 Проверка Telegram бота

1. Открой Telegram
2. Найди своего бота: `@YourBotName`
3. Нажми `/start`
4. Нажми кнопку **"Open"** или **"Открыть приложение"**
5. Должно открыться веб-приложение с модальным окном выбора роли

---

## ✅ Готово!

Твой бот работает! 🎉

**Адреса:**
- Веб-приложение: `http://31.56.27.5:8080`
- API Health: `http://31.56.27.5:8080/health`
- Telegram бот: `@YourBotName`

---

## 🔧 Полезные команды

### Просмотр логов

```bash
# Логи приложения (бот + API)
docker logs -f beatstore-app

# Логи базы данных
docker logs -f beatstore-postgres

# Выход из логов: Ctrl+C
```

### Перезапуск

```bash
# Перезапустить всё
docker-compose restart

# Перезапустить только приложение
docker-compose restart app

# Перезапустить только БД
docker-compose restart postgres
```

### Остановка и запуск

```bash
# Остановить всё
docker-compose down

# Запустить снова
docker-compose up -d
```

### Обновление кода

Когда внесёшь изменения и запушишь в GitHub:

```bash
cd ~/beatstore-bot

# Получить обновления
git pull origin main

# Пересобрать клиент
cd client && npm install && npm run build

# Пересобрать сервер
cd ../server && npm install && npm run build

# Перезапустить приложение
cd ..
docker-compose restart app
```

### Подключение к базе данных

```bash
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db
```

Внутри PostgreSQL:
```sql
\dt                  -- посмотреть таблицы
SELECT * FROM users; -- посмотреть пользователей
\q                   -- выйти
```

---

## �� Решение проблем

### Проблема: Контейнер не запускается

```bash
docker logs beatstore-app
```

Если видишь ошибку про `S3_ACCESS_KEY` или `DB_PASSWORD` — проверь `.env` файл:
```bash
cat server/.env
```

### Проблема: БД недоступна

```bash
docker logs beatstore-postgres
docker ps
```

Перезапусти PostgreSQL:
```bash
docker-compose restart postgres
```

### Проблема: Порт 8080 занят

Проверь, что слушает порт:
```bash
netstat -tulpn | grep 8080
```

Останови процесс:
```bash
kill -9 <PID>
```

### Проблема: React приложение не загружается

Проверь, что `client/dist` существует:
```bash
ls -la ~/beatstore-bot/client/dist
```

Если папки нет — пересобери:
```bash
cd ~/beatstore-bot/client
npm run build
docker-compose restart app
```

---

## 📊 Мониторинг

### Использование ресурсов

```bash
# Использование CPU и RAM контейнерами
docker stats

# Использование диска
df -h

# Размер Docker образов
docker images
```

### Проверка S3

Загрузи тестовый бит через интерфейс — файлы должны появиться в S3:
```
https://beatstore-files.s3.ru-7.storage.selcloud.ru/audio/...
```

---

## 🔒 Безопасность (опционально)

### Настройка firewall

```bash
apt install ufw -y
ufw allow 22/tcp   # SSH
ufw allow 8080/tcp # HTTP
ufw enable
ufw status
```

---

## 💰 Стоимость

- **HostVDS (VPS):** 349₽/месяц
- **Selectel S3:** ~20₽/месяц (на старте)
- **ИТОГО:** ~369₽/месяц

---

## 📞 Нужна помощь?

Если что-то не работает:
1. Проверь логи: `docker logs -f beatstore-app`
2. Проверь `.env`: `cat server/.env`
3. Проверь контейнеры: `docker ps`
4. Напиши мне с логами ошибки
