/**
 * config.js — настройки сайта Ola Cafe
 * Здесь меняется название, контакты, список официантов, способы оплаты и Telegram.
 */
const CONFIG = {
  restaurant: {
    name:      'Ola Cafe',
    tagline:   'когда любовь становится вкусом',
    phone:     '+7 700 000 00 00',
    email:     'hello@olacafe.kz',
    address:   'Алматы, пр. Абая 12',
    hours:     'Ежедневно 11:00 – 23:00',
    heroImage: '',            // необязательно: путь к фото, например 'images/hero.jpg'
  },
  waiters: ['Нино', 'Давид', 'Тамара', 'Георгий', 'Мариам', 'Леван'],
  payments: [
    { name: 'Kaspi',                  icon: '🔴', color: '#f14635', link: 'https://kaspi.kz' },
    { name: 'Halyk Bank',             icon: '🟢', color: '#2b9e5b', link: 'https://halykbank.kz' },
    { name: 'Наличными официанту',    icon: '💵', color: '#c9a87c', link: '' },
  ],
  // Уведомления в Telegram (необязательно). Вставьте токен бота и chat id —
  // и каждый новый заказ или бронь придёт в чат. Пока пусто — ничего не отправляется.
  telegram: { token: '', chatId: '' },
};
