/**
 * config.js — ПЛАН "МЕНЮ"
 * Заполни 3 блока — и больше ничего не трогай
 */

const CONFIG = {

  /* ── 1. SUPABASE ─────────────────────────────
     Supabase Dashboard → Settings → API         */
  supabase: {
    url:     "PASTE_SUPABASE_URL",      // https://xxxx.supabase.co
    anonKey: "PASTE_SUPABASE_ANON_KEY", // eyJh...
  },

  /* ── 2. ЗАВЕДЕНИЕ ────────────────────────────
     Меняй под каждого клиента            */
  restaurant: {
    name:      "Название заведения",
    tagline:   "Ваш слоган",
    city:      "Алматы",
    phone:     "+7 777 000 00 00",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    instagram: "",   // @nickname — оставь пустым если нет
  },

  /* ── 3. ПАРОЛЬ АДМИНКИ ───────────────────────*/
  admin: {
    password: "menu2025",  // ← поменяй на свой
  },

};
