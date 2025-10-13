# 🗄️ База данных PostgreSQL для Beatstore Bot

Этот проект использует **PostgreSQL** в **Docker контейнере** для хранения данных.

---

## 📋 Оглавление

- [Быстрый старт](#-быстрый-старт)
- [Что установлено](#-что-установлено)
- [Управление Docker контейнерами](#-управление-docker-контейнерами)
- [Подключение к pgAdmin](#-подключение-к-pgadmin)
- [Как работать с базой данных](#-как-работать-с-базой-данных)
- [Деплой на сервер](#-деплой-на-сервер)
- [Решение проблем](#-решение-проблем)

---

## 🚀 Быстрый старт

### 1. Запустить все сервисы

```bash
docker compose up -d --build
```

Эта команда:
- Скачает образы PostgreSQL, pgAdmin и Node.js (при первом запуске)
- Соберет Docker образ вашего Node.js сервера
- Создаст и запустит 3 контейнера: `beatstore-postgres`, `beatstore-pgadmin`, `beatstore-server`
- Выполнит файл `server/database/init.sql` для инициализации БД
- Создаст Docker volumes для сохранения данных

### 2. Проверить, что контейнеры запущены

```bash
docker ps
```

Вы должны увидеть 3 контейнера:
- `beatstore-postgres` - база данных PostgreSQL
- `beatstore-pgadmin` - веб-интерфейс для управления БД
- `beatstore-server` - Node.js сервер (Telegram бот + API)

### 3. Проверить логи (опционально)

```bash
docker-compose logs postgres
docker-compose logs pgadmin
```

---

## 📦 Что установлено

### PostgreSQL
- **Версия**: 16-alpine (легкий образ)
- **Порт**: 5432 (localhost:5432)
- **База данных**: `beatstore_db`
- **Пользователь**: `beatstore_user`
- **Пароль**: `simple123`

### pgAdmin (веб-интерфейс)
- **Порт**: 5050 (http://localhost:5050)
- **Email**: admin@beatstore.com
- **Пароль**: admin112444

### Node.js Server
- **Порт**: 8080 (localhost:8080)
- **Автоматически подключается** к PostgreSQL через Docker сеть

---

## 🎮 Управление Docker контейнерами

### Запустить базу данных
```bash
docker-compose up -d
```
Флаг `-d` запускает контейнеры в фоновом режиме (detached).

### Остановить базу данных
```bash
docker-compose down
```
⚠️ Данные **НЕ удалятся** - они сохраняются в Docker volumes.

### Остановить и удалить все данные
```bash
docker-compose down -v
```
⚠️ **ВНИМАНИЕ**: Флаг `-v` удалит volumes с данными БД!

### Перезапустить контейнеры
```bash
docker-compose restart
```

### Посмотреть статус контейнеров
```bash
docker ps                    # Запущенные контейнеры
docker ps -a                 # Все контейнеры (включая остановленные)
```

### Посмотреть логи
```bash
docker-compose logs -f postgres    # логи PostgreSQL (с подпиской на новые)
docker-compose logs -f pgadmin     # логи pgAdmin
docker-compose logs -f             # логи всех сервисов
```

---

## 🌐 Подключение к pgAdmin

1. **Откройте браузер**: http://localhost:5050

2. **Войдите в систему**:
   - Email: `admin@beatstore.com`
   - Пароль: `admin123`

3. **Добавьте сервер PostgreSQL**:
   - Правый клик на "Servers" → "Register" → "Server..."
   - Вкладка "General":
     - Name: `Beatstore Server` (любое название)
   - Вкладка "Connection":
     - Host name/address: `beatstore-postgres` (имя контейнера в Docker Compose)
     - Port: `5432`
     - Maintenance database: `beatstore_db`
     - Username: `beatstore_user`
     - Password: `simple123`
     - ✅ Save password
   - Нажмите "Save"

4. **Готово!** Теперь вы можете просматривать таблицы, выполнять SQL запросы и управлять БД через веб-интерфейс.

---

## 💻 Как работать с базой данных

### Из Node.js приложения

```typescript
import { testConnection, pool } from "./db.js";

// Проверить подключение
await testConnection();

// Выполнить запрос
const result = await pool.query("SELECT * FROM test_connection");
console.log(result.rows);
```

### Из командной строки (psql)

```bash
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db
```

Полезные команды в psql:
```sql
\dt              -- Показать все таблицы
\d table_name    -- Описание таблицы
\q               -- Выход
```

### Выполнить SQL файл

```bash
docker exec -i beatstore-postgres psql -U beatstore_user -d beatstore_db < path/to/file.sql
```

---

## 🚢 Деплой на сервер

### На сервере с Docker

1. **Скопируйте файлы проекта** на сервер

2. **Обновите пароли** в `docker-compose.yml` (для продакшена используйте сильные пароли!)

3. **Запустите контейнеры**:
   ```bash
   docker-compose up -d
   ```

4. **Настройте .env** на сервере с правильными параметрами подключения

5. **Готово!** База данных работает на сервере.

### Бэкап базы данных

```bash
# Создать бэкап
docker exec beatstore-postgres pg_dump -U beatstore_user beatstore_db > backup.sql

# Восстановить из бэкапа
docker exec -i beatstore-postgres psql -U beatstore_user -d beatstore_db < backup.sql
```

### Автоматический бэкап (cron на сервере)

```bash
# Добавить в crontab (crontab -e)
0 2 * * * docker exec beatstore-postgres pg_dump -U beatstore_user beatstore_db > /backups/beatstore_$(date +\%Y\%m\%d).sql
```

---

## 🔧 Решение проблем

### Контейнер не запускается

```bash
# Посмотреть логи
docker-compose logs postgres

# Проверить, не занят ли порт 5432
# Windows
netstat -ano | findstr :5432

# Linux/Mac
lsof -i :5432
```

### Не могу подключиться из Node.js

1. Проверьте, что контейнеры запущены: `docker ps`
2. Проверьте параметры в `server/.env`
3. **Важно**: Из Docker контейнера используйте `DB_HOST=beatstore-postgres`, из локальной машины - `localhost`
4. Проверьте логи сервера: `docker logs beatstore-server`
5. Протестируйте подключение: `docker exec beatstore-server npx tsx test-db.ts`

### Забыл пароль от pgAdmin

Удалите контейнер и volume pgAdmin, затем пересоздайте:
```bash
docker-compose down
docker volume rm beatstore-bot_pgadmin_data
docker-compose up -d
```

### Нужно пересоздать базу данных

```bash
# ВНИМАНИЕ: Удалит все данные!
docker-compose down -v
docker-compose up -d
```

### Изменить init.sql после первого запуска

Файл `init.sql` выполняется **только при первом запуске**. Чтобы применить изменения:

```bash
# Удалить volume с данными
docker-compose down -v

# Запустить заново (init.sql выполнится)
docker-compose up -d
```

---

## 📚 Полезные ссылки

- [Docker Compose документация](https://docs.docker.com/compose/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)
- [pgAdmin документация](https://www.pgadmin.org/docs/)
- [node-postgres (pg) документация](https://node-postgres.com/)

---

## 🎯 Следующие шаги

1. ✅ Запустить Docker контейнеры: `docker-compose up -d`
2. ✅ Проверить подключение через pgAdmin: http://localhost:5050
3. ✅ Описать финальную структуру БД в `server/database/init.sql`
4. 🔄 Интегрировать запросы к БД в `server/src/index.ts`
5. 🚀 Протестировать загрузку и получение битов через API

---

**Удачи с настройкой базы данных! 🚀**
