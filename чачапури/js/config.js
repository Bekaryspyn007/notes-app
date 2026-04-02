/**
 * config.js — ВСЕ НАСТРОЙКИ ЗДЕСЬ
 */

const CONFIG = {

  supabase: {
    url:     "PASTE_SUPABASE_URL",
    anonKey: "PASTE_SUPABASE_ANON_KEY",
  },

  telegram: {
    token:  "PASTE_BOT_TOKEN",
    chatId: "PASTE_CHAT_ID",
  },

  restaurant: {
    name:      "Чачапури",
    tagline:   "Вкусно как дома",
    city:      "Алматы",
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
    password: "chachapuri2025",
  },

};
