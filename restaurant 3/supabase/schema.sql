-- ═══════════════════════════════════════════════════
--  RESTAURANT — Supabase Schema
--  Выполни в SQL Editor → New query
-- ═══════════════════════════════════════════════════

-- Меню
CREATE TABLE IF NOT EXISTS menu (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  weight      TEXT,
  emoji       TEXT DEFAULT '🍽',
  category    TEXT NOT NULL CHECK (category IN ('dishes','drinks','desserts','combo','seasonal')),
  photo_url   TEXT,
  visible     BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Заказы (items содержит [{id,name,qty,price,comment}])
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  table_num   TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  total       INTEGER NOT NULL DEFAULT 0,
  comment     TEXT DEFAULT '',
  status      TEXT DEFAULT 'new' CHECK (status IN ('new','in_progress','done','cancelled')),
  daily_date  DATE NOT NULL DEFAULT CURRENT_DATE,  -- для группировки по дням
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Возвраты
CREATE TABLE IF NOT EXISTS returns (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  table_num   TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',  -- что возвращают
  reason      TEXT NOT NULL,
  amount      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Бронирование столиков
CREATE TABLE IF NOT EXISTS reservations (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  date         DATE NOT NULL,
  time         TEXT NOT NULL,
  people_count INTEGER NOT NULL CHECK (people_count > 0 AND people_count <= 50),
  table_num    TEXT,
  comment      TEXT DEFAULT '',
  status       TEXT DEFAULT 'new' CHECK (status IN ('new','confirmed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Автообновление updated_at для меню
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_updated_at
  BEFORE UPDATE ON menu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ───────────────────────────────────────────
ALTER TABLE menu         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Меню: клиент только читает
CREATE POLICY "anon read menu"    ON menu FOR SELECT TO anon USING (true);
-- Меню: запись только service_role (через Edge Function)
CREATE POLICY "service write menu" ON menu FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Заказы: клиент вставляет, читать нельзя (только service_role)
CREATE POLICY "anon insert order"   ON orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service all orders"  ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Возвраты: только service_role
CREATE POLICY "service all returns" ON returns FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Бронь: клиент вставляет, читать нельзя (только service_role)
CREATE POLICY "anon insert reservation"  ON reservations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service all reservations" ON reservations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── Начальные данные ──────────────────────────────
INSERT INTO menu (name, description, price, weight, emoji, category, sort_order) VALUES
  ('Рибай на кости',     'Мраморная говядина, розмарин, чесночное масло',   5800, '400 г',  '🥩', 'dishes',   1),
  ('Паста карбонара',    'Гуанчале, пармезан, желток, свежий перец',         2400, '320 г',  '🍝', 'dishes',   2),
  ('Лосось на гриле',    'Норвежский лосось, соус терияки, кунжут',          3600, '280 г',  '🐟', 'dishes',   3),
  ('Бургер Velour',      'Чёрная булочка, бри, говядина, трюфельный айоли', 2900, '350 г',  '🍔', 'dishes',   4),
  ('Цезарь с курицей',   'Ромейн, пармезан, крутоны, авторский соус',        1900, '250 г',  '🥗', 'dishes',   5),
  ('Авторский лимонад',  'Клубника, базилик, лимон, содовая',                900,  '400 мл', '🍹', 'drinks',   6),
  ('Эспрессо двойной',   'Двойная порция свежемолотого кофе',                600,  '60 мл',  '☕', 'drinks',   7),
  ('Тирамису',           'Маскарпоне, дамские пальчики, кофейный сироп',    1400, '180 г',  '🍰', 'desserts', 8),
  ('Бизнес-ланч',        'Суп + горячее + напиток + десерт',                 3200, '—',      '🍱', 'combo',    9)
ON CONFLICT DO NOTHING;
