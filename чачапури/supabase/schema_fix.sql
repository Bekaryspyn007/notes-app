-- ═══════════════════════════════════════════════════
--  ЧАЧАПУРИ — schema_fix.sql
--  Выполни в SQL Editor ПОСЛЕ schema.sql
-- ═══════════════════════════════════════════════════

-- 1. Добавляем официанта в заказы
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT DEFAULT '';

-- 2. Разрешаем anon писать в меню (нужно чтобы админка работала без serviceRoleKey)
DROP POLICY IF EXISTS "anon write menu" ON menu;
CREATE POLICY "anon write menu" ON menu
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Уже должны быть из schema.sql, но на всякий случай:
DROP POLICY IF EXISTS "anon all orders"       ON orders;
DROP POLICY IF EXISTS "anon all reservations" ON reservations;
DROP POLICY IF EXISTS "anon all returns"      ON returns;

CREATE POLICY "anon all orders"       ON orders       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all reservations" ON reservations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon all returns"      ON returns      FOR ALL TO anon USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════
--  Storage Policy (выполни в Storage → Policies)
--  Или через SQL:
-- ═══════════════════════════════════════════════════

-- Разрешаем всем загружать фото (для работы админки)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('menu-photos', 'menu-photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "allow anon upload" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'menu-photos');

CREATE POLICY "allow anon update" ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'menu-photos');

CREATE POLICY "allow public read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'menu-photos');
