-- Применить все миграции
-- Выполни этот файл на сервере через psql:
-- psql -U beatstore_user -d beatstore_db -f apply_all.sql

\i 001_add_plan_to_users.sql
\i 002_add_store_name_to_users.sql
\i 003_add_licenses_to_users.sql

SELECT '🎉 Все миграции успешно применены!' AS status;
