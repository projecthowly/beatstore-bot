-- Add viewed_producer_id column to users table for guest mode functionality
-- NULL = normal mode, producer_id = viewing that producer's beatstore

ALTER TABLE users ADD COLUMN viewed_producer_id INTEGER DEFAULT NULL;

-- Add foreign key constraint to ensure integrity
ALTER TABLE users
  ADD CONSTRAINT fk_viewed_producer
  FOREIGN KEY (viewed_producer_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN users.viewed_producer_id IS 'ID продюсера, чей битстор просматривает пользователь (guest mode). NULL = обычный режим';
