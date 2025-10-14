# Администрирование базы данных

## Быстрые команды через SSH

### 1. Подключиться к PostgreSQL
```bash
ssh root@31.56.27.5
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db
```

### 2. Основные SQL запросы

#### Посмотреть всех пользователей
```sql
SELECT id, telegram_id, username, role, created_at FROM users ORDER BY created_at DESC;
```

#### Посмотреть конкретного пользователя (твой Telegram ID)
```sql
SELECT * FROM users WHERE telegram_id = YOUR_TELEGRAM_ID;
```

#### Удалить себя из БД (чтобы модалка появилась снова)
```sql
DELETE FROM users WHERE telegram_id = YOUR_TELEGRAM_ID;
```

#### Посмотреть все биты
```sql
SELECT id, title, artist, bpm, price, seller_id FROM beats ORDER BY created_at DESC LIMIT 10;
```

#### Посмотреть все покупки
```sql
SELECT p.id, p.beat_id, p.buyer_id, p.amount, p.license_type, p.created_at, b.title
FROM purchases p
JOIN beats b ON p.beat_id = b.id
ORDER BY p.created_at DESC LIMIT 10;
```

#### Посмотреть статистику по продавцу
```sql
SELECT
  u.username,
  COUNT(b.id) as total_beats,
  COUNT(p.id) as total_sales,
  SUM(p.amount) as total_revenue
FROM users u
LEFT JOIN beats b ON u.id = b.seller_id
LEFT JOIN purchases p ON b.id = p.beat_id
WHERE u.telegram_id = YOUR_TELEGRAM_ID
GROUP BY u.username;
```

#### Выйти из psql
```sql
\q
```

---

## Альтернатива: pgAdmin (графический интерфейс)

### Установка на Windows:
1. Скачай pgAdmin: https://www.pgadmin.org/download/
2. Установи и запусти
3. Подключись к БД:
   - Host: 31.56.27.5
   - Port: 5432
   - Database: beatstore_db
   - Username: beatstore_user
   - Password: BeatStore_Secure_2025!

⚠️ **Важно:** Сначала нужно открыть порт 5432 на сервере (сейчас он закрыт для безопасности)

---

## Скрипты для администрирования

Создам несколько bash-скриптов на сервере для быстрого доступа:

### ~/db-users.sh - Показать всех пользователей
```bash
#!/bin/bash
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db -c "SELECT id, telegram_id, username, role, created_at FROM users ORDER BY created_at DESC;"
```

### ~/db-beats.sh - Показать все биты
```bash
#!/bin/bash
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db -c "SELECT id, title, artist, bpm, price, seller_id FROM beats ORDER BY created_at DESC LIMIT 20;"
```

### ~/db-reset-me.sh - Удалить себя из БД (для тестов)
```bash
#!/bin/bash
echo "Введи свой Telegram ID:"
read TG_ID
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db -c "DELETE FROM users WHERE telegram_id = $TG_ID;"
echo "✅ Пользователь удалён! Теперь модалка появится снова."
```

---

## Самый быстрый способ проверить БД прямо сейчас:

```bash
ssh root@31.56.27.5
docker exec -it beatstore-postgres psql -U beatstore_user -d beatstore_db -c "SELECT id, telegram_id, username, role, created_at FROM users;"
```
