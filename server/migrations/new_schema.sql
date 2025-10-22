-- ============================================
-- Beatstore Bot — clean schema (v1)
-- ============================================

-- safety
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- ENUMS
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('artist','producer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_method') THEN
    CREATE TYPE pay_method AS ENUM ('TON','Stars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending','paid','failed','refunded','cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    CREATE TYPE offer_status AS ENUM ('open','counter','accepted','declined','expired','cancelled');
  END IF;
END$$;

-- =========================
-- USERS & PROFILES
-- =========================
CREATE TABLE users (
  id               BIGSERIAL PRIMARY KEY,
  telegram_id      BIGINT NOT NULL UNIQUE,
  username         VARCHAR(255),
  display_name     VARCHAR(255),
  avatar_url       TEXT,
  role             user_role NOT NULL,
  bio              TEXT,
  contact_username VARCHAR(255),

  instagram_url    TEXT,
  youtube_url      TEXT,
  soundcloud_url   TEXT,
  spotify_url      TEXT,
  other_links      JSONB,

  balance          NUMERIC(12,2) NOT NULL DEFAULT 0.00,

  -- viewer mode (guest view of producer store)
  viewed_producer_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

  -- producer defaults
  free_download_default BOOLEAN NOT NULL DEFAULT FALSE,

  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tg ON users(telegram_id);

-- =========================
-- PLANS & USER PLAN
-- =========================
CREATE TABLE plans (
  id                 SMALLSERIAL PRIMARY KEY,
  code               VARCHAR(20) UNIQUE NOT NULL,   -- Free / Basic / Pro
  name               VARCHAR(50) NOT NULL,
  description        TEXT,
  price              NUMERIC(10,2) NOT NULL DEFAULT 0.00,

  -- хранить фичи явными столбцами (по твоему решению)
  max_beats          INTEGER,            -- NULL = безлимит
  custom_licenses    BOOLEAN NOT NULL DEFAULT FALSE,  -- можно ли создавать/редактировать/удалять
  analytics          BOOLEAN NOT NULL DEFAULT FALSE,
  can_rename_lic     BOOLEAN NOT NULL DEFAULT FALSE,  -- можно менять имя/описание/состав
  default_license_count SMALLINT NOT NULL DEFAULT 2,  -- Free=2, Basic/Pro=3

  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO plans (code,name,description,price,max_beats,custom_licenses,analytics,can_rename_lic,default_license_count)
VALUES
('Free','Free','Стартовый план',0,10,false,false,false,2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE user_plan (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan_id      SMALLINT NOT NULL REFERENCES plans(id),
  started_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMP,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_user_plan_user ON user_plan(user_id);

-- =========================
-- DEEPLINKS
-- =========================
CREATE TABLE deeplinks (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  custom_name  VARCHAR(100) NOT NULL UNIQUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deeplinks_name ON deeplinks(custom_name);

-- =========================
-- BEATS
-- =========================
CREATE TABLE beats (
  id                 BIGSERIAL PRIMARY KEY,
  user_id            BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- producer

  title              VARCHAR(255) NOT NULL,
  bpm                INTEGER,
  key_sig            VARCHAR(10),
  genre              VARCHAR(100),
  tags               TEXT[],

  cover_url          TEXT,
  mp3_tagged_url     TEXT, -- для прослушивания/фри-скачивания
  mp3_untagged_url   TEXT, -- для продажи
  wav_url            TEXT,
  stems_url          TEXT,

  free_download      BOOLEAN NOT NULL DEFAULT FALSE,
  free_dl_count      INTEGER NOT NULL DEFAULT 0,

  views_count        INTEGER NOT NULL DEFAULT 0,
  sales_count        INTEGER NOT NULL DEFAULT 0,

  created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beats_user ON beats(user_id);
CREATE INDEX idx_beats_created ON beats(created_at DESC);

-- =========================
-- LICENSES (producer-owned)
-- =========================
-- ВАЖНО: это единая таблица лицензий, принадлежащих продюсеру.
-- Здесь живут и "дефолтные" (создаются автоматически), и кастомные.
CREATE TABLE licenses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- владелец (producer)

  lic_key       VARCHAR(50) NOT NULL,       -- basic / premium / unlimited / custom_xxx
  name          VARCHAR(100) NOT NULL,
  description   TEXT,

  -- состав файлов, выдаваемых покупателю
  incl_mp3      BOOLEAN NOT NULL DEFAULT TRUE,
  incl_wav      BOOLEAN NOT NULL DEFAULT FALSE,
  incl_stems    BOOLEAN NOT NULL DEFAULT FALSE,

  -- видимость (когда подписка истекла кастомные скрываются)
  is_hidden     BOOLEAN NOT NULL DEFAULT FALSE,

  -- цены:
  default_price NUMERIC(12,2),              -- дефолтная цена (для автоподстановки)
  min_price     NUMERIC(12,2),              -- минимальная цена для "предложить свою"

  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, lic_key)
);

CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_visible ON licenses(user_id, is_hidden);

-- =========================
-- BEAT-LEVEL PRICE OVERRIDES
-- =========================
-- Локальные цены на конкретный бит (override).
-- price NULL или 0 => лицензия для этого бита не доступна.
CREATE TABLE bl_prices (
  beat_id     BIGINT NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  license_id  BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  price       NUMERIC(12,2),

  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),

  PRIMARY KEY (beat_id, license_id)
);

CREATE INDEX idx_blp_beat ON bl_prices(beat_id);
CREATE INDEX idx_blp_license ON bl_prices(license_id);

-- =========================
-- EFFECTIVE PRICES VIEW
-- =========================
-- Финальная цена для показа в UI: COALESCE(override, default).
CREATE OR REPLACE VIEW v_effective_prices AS
SELECT
  b.id                      AS beat_id,
  l.id                      AS license_id,
  l.user_id                 AS producer_id,
  l.lic_key,
  l.name,
  l.description,
  l.incl_mp3, l.incl_wav, l.incl_stems,
  l.is_hidden,
  l.default_price,
  l.min_price,
  blp.price                 AS override_price,
  COALESCE(blp.price, l.default_price) AS final_price,
  (blp.price IS NOT NULL)   AS is_override
FROM licenses l
JOIN beats b
  ON b.user_id = l.user_id
LEFT JOIN bl_prices blp
  ON blp.beat_id = b.id AND blp.license_id = l.id;

-- =========================
-- CART
-- =========================
CREATE TABLE cart (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- покупатель (artist)
  beat_id     BIGINT NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  license_id  BIGINT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  added_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, beat_id, license_id)
);

CREATE INDEX idx_cart_user ON cart(user_id);

-- =========================
-- ORDERS & ORDER ITEMS (multi-item checkout)
-- =========================
CREATE TABLE orders (
  id              BIGSERIAL PRIMARY KEY,
  buyer_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  method          pay_method,        -- выбранный способ оплаты
  status          order_status NOT NULL DEFAULT 'pending',
  payment_ref     JSONB,             -- гибкое поле для charge_id / tx_hash и т.п.
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMP
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  beat_id         BIGINT NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
  seller_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT, -- продюсер
  license_id      BIGINT NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,

  unit_price      NUMERIC(12,2) NOT NULL,      -- зафиксированная цена в момент покупки
  includes        JSONB NOT NULL,              -- снимок прав (набор файлов) в момент покупки

  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_seller ON order_items(seller_id);

-- =========================
-- PURCHASE SHORTCUT (по одному item'у; опциональная таблица)
-- Если удобно, можешь не использовать purchases и работать через orders+order_items.
CREATE TABLE purchases (
  id              BIGSERIAL PRIMARY KEY,
  buyer_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  beat_id         BIGINT NOT NULL REFERENCES beats(id) ON DELETE RESTRICT,
  license_id      BIGINT NOT NULL REFERENCES licenses(id) ON DELETE RESTRICT,

  amount          NUMERIC(12,2) NOT NULL,
  method          pay_method NOT NULL,
  payment_ref     JSONB,                   -- charge_id / tx_hash и т.п.

  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchases_buyer ON purchases(buyer_id);
CREATE INDEX idx_purchases_seller ON purchases(seller_id);
CREATE INDEX idx_purchases_beat ON purchases(beat_id);

-- =========================
-- DOWNLOADS (детальный лог)
-- =========================
-- Логируем скачивания. Хочешь сохранять от Telegram: фото, имя, юзернейм на момент скачивания.
-- Если username скрыт — храним 'hidden'.
CREATE TABLE downloads (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- кто скачал
  beat_id       BIGINT NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  order_item_id BIGINT REFERENCES order_items(id) ON DELETE SET NULL,     -- NULL если free
  is_free       BOOLEAN NOT NULL DEFAULT FALSE,

  file_type     VARCHAR(10) NOT NULL CHECK (file_type IN ('mp3','wav','stems')),

  tg_username   VARCHAR(255),                   -- 'hidden' если скрыт
  tg_name       VARCHAR(255),
  tg_photo_url  TEXT,

  downloaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_downloads_beat ON downloads(beat_id);
CREATE INDEX idx_downloads_time ON downloads(downloaded_at DESC);

-- =========================
-- VIEWS (просмотры)
-- =========================
CREATE TABLE beat_views (
  id          BIGSERIAL PRIMARY KEY,
  beat_id     BIGINT NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,  -- может быть NULL
  viewed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_views_beat ON beat_views(beat_id);
CREATE INDEX idx_views_time ON beat_views(viewed_at DESC);

-- =========================
-- OFFERS (переговоры по цене, в т.ч. эксклюзив и обычные лицензии)
-- =========================
CREATE TABLE offers (
  id            BIGSERIAL PRIMARY KEY,
  beat_id       BIGINT NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  license_id    BIGINT REFERENCES licenses(id) ON DELETE SET NULL, -- NULL для 'exclusive' если отдельно трактовать
  buyer_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  ask_price     NUMERIC(12,2),  -- предложение покупателя
  min_price     NUMERIC(12,2),  -- снимок min_price лицензии на момент создания (для истории)
  status        offer_status NOT NULL DEFAULT 'open',

  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_beat ON offers(beat_id);
CREATE INDEX idx_offers_status ON offers(status);

-- =========================
-- PAYOUTS (выплаты продюсеру)
-- =========================
CREATE TABLE payouts (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- продюсер
  amount        NUMERIC(12,2) NOT NULL,
  method        pay_method NOT NULL,   -- TON | Stars (по твоему решению)
  status        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/completed/failed
  details       JSONB,                 -- реквизиты, кошелёк и пр.

  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMP
);

CREATE INDEX idx_payouts_user ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- =========================
-- SIMPLE TRIGGERS (timestamps)
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_users_u BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER t_beats_u BEFORE UPDATE ON beats
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER t_licenses_u BEFORE UPDATE ON licenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER t_bl_prices_u BEFORE UPDATE ON bl_prices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================
-- SEED: планы (минимум)
-- =========================
INSERT INTO plans (code,name,description,price,max_beats,custom_licenses,analytics,can_rename_lic,default_license_count)
VALUES
('Basic','Basic','Базовый план',0,false,true,true,3,3),   -- цену подставишь сам
('Pro','Pro','Профессиональный план',0,NULL,true,true,true,3)
ON CONFLICT (code) DO NOTHING;

-- =========================
-- HELPER VIEW для UI редактирования цен по конкретному биту
-- Возвращает только лицензии владельца этого бита и их итоговые цены.
-- =========================
CREATE OR REPLACE VIEW v_beat_licenses AS
SELECT
  b.id              AS beat_id,
  l.id              AS license_id,
  l.lic_key,
  l.name            AS license_name,
  l.description,
  l.incl_mp3, l.incl_wav, l.incl_stems,
  l.is_hidden,
  l.default_price,
  l.min_price,
  blp.price         AS override_price,
  COALESCE(blp.price, l.default_price) AS final_price
FROM beats b
JOIN licenses l
  ON l.user_id = b.user_id
LEFT JOIN bl_prices blp
  ON blp.beat_id = b.id AND blp.license_id = l.id;
