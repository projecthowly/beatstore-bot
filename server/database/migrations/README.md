# Миграции базы данных

## Применение миграций на сервере

### Способ 1: Применить все миграции сразу

```bash
cd /path/to/beatstore-bot/server/database/migrations
psql -U beatstore_user -d beatstore_db -f 001_add_plan_to_users.sql
psql -U beatstore_user -d beatstore_db -f 002_add_store_name_to_users.sql
psql -U beatstore_user -d beatstore_db -f 003_add_licenses_to_users.sql
```

### Способ 2: Через psql интерактивно

```bash
# Подключись к базе
psql -U beatstore_user -d beatstore_db

# Выполни миграции
\i /path/to/001_add_plan_to_users.sql
\i /path/to/002_add_store_name_to_users.sql
\i /path/to/003_add_licenses_to_users.sql
```

## Установить план PRO для себя

### Шаг 1: Узнай свой telegram_id

```sql
-- Подключись к базе
psql -U beatstore_user -d beatstore_db

-- Найди свой telegram_id
SELECT id, telegram_id, username, plan FROM users;
```

### Шаг 2: Обнови план на 'pro'

```sql
-- Замени 123456789 на свой реальный telegram_id
UPDATE users SET plan = 'pro' WHERE telegram_id = 123456789;

-- Проверь результат
SELECT telegram_id, username, plan FROM users WHERE telegram_id = 123456789;
```

## Или используй готовый скрипт

Отредактируй файл `set_user_plan.sql` - замени `123456789` на свой telegram_id, затем выполни:

```bash
psql -U beatstore_user -d beatstore_db -f set_user_plan.sql
```

## Проверка после миграций

```sql
-- Проверь что поля добавлены
\d users

-- Проверь своего пользователя
SELECT * FROM users WHERE telegram_id = ТВОЙ_ID;
```

## Что добавляют миграции:

1. **001_add_plan_to_users.sql** - добавляет поле `plan` ('free', 'basic', 'pro')
2. **002_add_store_name_to_users.sql** - добавляет поле `store_name` (никнейм продюсера)
3. **003_add_licenses_to_users.sql** - добавляет поле `licenses` (JSONB для кастомных лицензий)
