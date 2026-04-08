/**
 * config.js — ВСЕ НАСТРОЙКИ ЗДЕСЬ
 */

const CONFIG = {
  
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

  restaurant: {
    name:      "Ola Cafe",
    tagline:   "когда любовь становится вкусом",
    city:      "📍Ул. Толе Би, 101",
    heroImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    phone:     "+7 777 000 00 00",
  },

  payments: [
    {
      id:    "kaspi",
      name:  "Kaspi QR",
      icon:  "💳",
      color: "#EE3124",
      link:  "https://kaspi.kz/pay/ВАША_ССЫЛКА",
    },
    {
      id:    "halyk",
      name:  "Halyk Bank",
      icon:  "🏦",
      color: "#00A651",
      link:  "https://pay.halykbank.kz/ВАША_ССЫЛКА",
    },
    {
      id:    "freedom",
      name:  "Freedom Pay",
      icon:  "🔵",
      color: "#0066CC",
      link:  "https://pay.freedomfinance.kz/ВАША_ССЫЛКА",
    },
  ],

  waiters: [
    "Нино",
    "Тамара",
    "Гиорги",
    "Лука",
    "Мариам",
  ],

  admin: {
    password: "123",
  },

};
