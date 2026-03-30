/**
 * ╔══════════════════════════════════════════════╗
 *  config.js — ВСЕ НАСТРОЙКИ ЗДЕСЬ
 *  Заполни 4 блока ниже и больше ничего не трогай
 * ╚══════════════════════════════════════════════╝
 */

const CONFIG = {

  /* ── 1. SUPABASE ──────────────────────────────
     Supabase Dashboard → Settings → API          */
  supabase: {
    url:            "https://ybxleibiaoxpumpzshyw.supabase.co",       // https://xxxx.supabase.co
    anonKey:        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieGxlaWJpYW94cHVtcHpzaHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDgyNDYsImV4cCI6MjA5MDQyNDI0Nn0.nRhYTLprRmg6MBEI3mC813dYrFgw5jpoigr-XfFt63Q",  // eyJh... (anon public key)
  },

  /* ── 2. TELEGRAM ──────────────────────────────
     @BotFather → /newbot → скопируй токен
     Затем: api.telegram.org/bot<TOKEN>/getUpdates → найди chat id */
  telegram: {
    token:  "8688518430:AAEe5eCcPi0QIw4x_MTeRx6MILXt5T2LbGs",    // 7123456789:AAHxxxxxx
    chatId: "1153365718",      // 123456789
  },

  /* ── 3. РЕСТОРАН ──────────────────────────────
     Меняй под каждого клиента                    */
  restaurant: {
    name:      "Чачапура",
    tagline:   "Ваш слоган",
    city:      "Алматы",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    kaspiLink: "https://kaspi.kz/pay/ВАША_ССЫЛКА",
    phone:     "+7 777 000 00 00",
  },

  /* ── 4. АДМИНКА ───────────────────────────────
     Пароль для входа в admin.html                */
  admin: {
    password: "123",  // ← поменяй на свой пароль
  },

};
