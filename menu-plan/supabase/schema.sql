-- ════════════════════════════════════════════
--  ПЛАН "МЕНЮ" — schema.sql
--  Выполни в Supabase → SQL Editor → New query
-- ════════════════════════════════════════════

-- Таблица меню
CREATE TABLE IF NOT EXISTS menu (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  weight      TEXT,
  emoji       TEXT DEFAULT '🍽',
  category    TEXT NOT NULL DEFAULT 'dishes',
  photo_url   TEXT,
  visible     BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_updated_at
  BEFORE UPDATE ON menu
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────
ALTER TABLE menu ENABLE ROW LEVEL SECURITY;

-- Все могут читать (клиенты смотрят меню)
CREATE POLICY "public read menu"
  ON menu FOR SELECT TO anon USING (true);

-- Все могут писать (нет backend — anon пишет напрямую)
CREATE POLICY "public write menu"
  ON menu FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Storage ──────────────────────────────────
-- Создай bucket "menu-photos" (Public) в Storage → New bucket
-- Затем выполни:

INSERT INTO storage.buckets (id, name, public)
  VALUES ('menu-photos', 'menu-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "public upload photos" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'menu-photos');

CREATE POLICY "public update photos" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'menu-photos');

CREATE POLICY "public read photos" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'menu-photos');

-- ── Начальные блюда (пример) ─────────────────
INSERT INTO menu (name, description, price, weight, emoji, category, sort_order) VALUES
  ('Хачапури по-аджарски',  'Горячий хлеб с яйцом и маслом',         2200, '350 г', '🫕', 'dishes',   1),
  ('Хинкали с мясом',       '5 штук. Говядина и свинина, специи',     1800, '5 шт',  '🥟', 'dishes',   2),
  ('Мцвади (шашлык)',       'Свинина на углях, маринад из вина',       3200, '300 г', '🍖', 'dishes',   3),
  ('Лобиани',               'Хлеб с фасолью и специями',               1600, '300 г', '🫓', 'dishes',   4),
  ('Сациви',                'Курица в ореховом соусе',                 2400, '280 г', '🍗', 'dishes',   5),
  ('Грузинское вино красное','Саперави, полусухое, 150 мл',             900,  '150 мл','🍷', 'drinks',   6),
  ('Лимонад тархун',        'Домашний, с мятой и лимоном',             700,  '400 мл','🥤', 'drinks',   7),
  ('Чай с чабрецом',        'Горный чай, мёд',                         500,  '400 мл','🍵', 'drinks',   8),
  ('Пахлава',               'Ореховая начинка, медовый сироп',         800,  '150 г', '🍰', 'desserts', 9),
  ('Чурчхела',              'Грецкий орех в виноградной пастиле',      600,  '100 г', '🍇', 'desserts', 10)
ON CONFLICT DO NOTHING;
