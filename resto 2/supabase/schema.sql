-- ═══════════════════════════════════════════════
--  RESTO — полная схема базы данных
--  Выполни в Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════════

-- Меню
CREATE TABLE IF NOT EXISTS menu (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ru      TEXT NOT NULL,
  name_kz      TEXT DEFAULT '',
  name_en      TEXT DEFAULT '',
  desc_ru      TEXT DEFAULT '',
  desc_kz      TEXT DEFAULT '',
  desc_en      TEXT DEFAULT '',
  price        INTEGER NOT NULL,
  weight       TEXT DEFAULT '',
  emoji        TEXT DEFAULT '🍽',
  category     TEXT NOT NULL DEFAULT 'dishes',
  photo_url    TEXT,
  visible      BOOLEAN DEFAULT true,
  is_popular   BOOLEAN DEFAULT false,  -- 🔥 хит
  is_new       BOOLEAN DEFAULT false,  -- ✨ новинка
  stop_list    BOOLEAN DEFAULT false,  -- нет в наличии
  cook_time    INTEGER DEFAULT 0,      -- минуты приготовления
  allergens    TEXT[] DEFAULT '{}',    -- ['gluten','dairy','nuts']
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Заказы
CREATE TABLE IF NOT EXISTS orders (
  id           BIGSERIAL PRIMARY KEY,
  table_num    TEXT NOT NULL,
  items        JSONB NOT NULL DEFAULT '[]',
  total        INTEGER NOT NULL DEFAULT 0,
  comment      TEXT DEFAULT '',
  waiter_name  TEXT DEFAULT '',
  status       TEXT DEFAULT 'new' CHECK (status IN ('new','cooking','ready','served','cancelled')),
  daily_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Брони
CREATE TABLE IF NOT EXISTS reservations (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  date         DATE NOT NULL,
  time         TEXT NOT NULL,
  people_count INTEGER NOT NULL DEFAULT 2,
  table_num    TEXT DEFAULT '',
  comment      TEXT DEFAULT '',
  status       TEXT DEFAULT 'new' CHECK (status IN ('new','confirmed','cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Возвраты
CREATE TABLE IF NOT EXISTS returns (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  table_num    TEXT NOT NULL,
  items        JSONB DEFAULT '[]',
  reason       TEXT NOT NULL,
  amount       INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Вызовы официанта
CREATE TABLE IF NOT EXISTS waiter_calls (
  id           BIGSERIAL PRIMARY KEY,
  table_num    TEXT NOT NULL,
  message      TEXT DEFAULT 'Вызов официанта',
  answered     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_updated_at
  BEFORE UPDATE ON menu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────
ALTER TABLE menu          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiter_calls  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all menu"         ON menu         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "all orders"       ON orders       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "all reservations" ON reservations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "all returns"      ON returns      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "all calls"        ON waiter_calls FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Storage ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
  VALUES ('menu-photos', 'menu-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "upload photos" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'menu-photos');
CREATE POLICY "update photos" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'menu-photos');
CREATE POLICY "read photos" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'menu-photos');

-- ── Начальные данные ──────────────────────────────
INSERT INTO menu (name_ru, name_kz, name_en, desc_ru, desc_kz, desc_en, price, weight, emoji, category, is_popular, cook_time, allergens, sort_order) VALUES
  ('Хачапури по-аджарски','Аджарлық хачапури','Adjarian Khachapuri','Горячий хлеб с яйцом, маслом и сыром сулугуни','Жұмыртқа мен сырмен пісірілген нан','Warm bread with egg, butter and suluguni cheese',2200,'350 г','🫕','dishes',true,20,ARRAY['gluten','dairy'],1),
  ('Хинкали с мясом','Ет хинкали','Meat Khinkali','Говядина и свинина, специи, ручная лепка','Сиыр және шошқа еті, қолмен жасалған','Beef and pork, handmade dumplings',1800,'5 шт','🥟','dishes',true,15,ARRAY['gluten'],2),
  ('Мцвади (шашлык)','Мцвади (шашлық)','Mtsvadi (BBQ)','Свинина на углях, маринад из вина и специй','Шарапта маринадталған шошқа еті',  'Pork marinated in wine and spices',3200,'300 г','🍖','dishes',false,25,ARRAY[],3),
  ('Сациви','Сациви','Satsivi','Курица в ореховом соусе, грузинские специи','Жаңғақ соусындағы тауық еті','Chicken in walnut sauce with Georgian spices',2400,'280 г','🍗','dishes',false,20,ARRAY['nuts'],4),
  ('Лобиани','Лобиани','Lobiani','Хлеб с фасолью, лук, кинза','Бұршақпен пісірілген нан','Bread stuffed with spiced beans',1600,'300 г','🫓','dishes',false,15,ARRAY['gluten'],5),
  ('Вино Саперави','Саперави шарабы','Saperavi Wine','Грузинское красное вино, полусухое','Грузин қызыл шарабы','Georgian red wine, semi-dry',900,'150 мл','🍷','drinks',false,0,ARRAY[],6),
  ('Лимонад тархун','Тархун лимонады','Tarragon Lemonade','Домашний, мята, лимон, тархун','Үй жасаған, жалбыз, лимон','Homemade with mint and lemon',700,'400 мл','🥤','drinks',true,5,ARRAY[],7),
  ('Пахлава','Пахлава','Baklava','Ореховая начинка, медовый сироп','Жаңғақты бал сироп','Walnut filling with honey syrup',800,'150 г','🍰','desserts',false,0,ARRAY['gluten','nuts','dairy'],8),
  ('Чурчхела','Шыршхела','Churchkhela','Грецкий орех в виноградной пастиле','Жаңғақты жүзім пастиласы','Walnuts in grape paste',600,'100 г','🍇','desserts',false,0,ARRAY['nuts'],9),
  ('Комбо «Грузия»','Грузия комбо','Georgia Combo','Хачапури + Хинкали 3шт + Лимонад','Хачапури + 3 хинкали + лимонад','Khachapuri + 3 Khinkali + Lemonade',3800,'—','🇬🇪','combo',true,25,ARRAY['gluten','dairy'],10)
ON CONFLICT DO NOTHING;
