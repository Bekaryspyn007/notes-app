/**
 * db.js — «база данных» сайта. Всё хранится в localStorage браузера.
 * (В исходном Ola Cafe это была Supabase — здесь она заменена на браузер.)
 *
 * Таблицы: users, menu, orders, reservations, returns.
 * Ключ в localStorage: 'ola_' + имя таблицы.
 */
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

const dayStr = (n = 0) => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4 + n * 864e5).toISOString().slice(0, 10);
const hash   = s => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36) + s.length; }; // учебный хеш, не для продакшена

const DB = {
  all:    t => LS.get('ola_' + t, []),
  save:   (t, rows) => LS.set('ola_' + t, rows),
  find:   (t, id) => DB.all(t).find(r => r.id == id),
  add(t, row) {
    const rows = DB.all(t), base = { orders: 1000, reservations: 2000 }[t] || 0;
    row.id = Math.max(base, ...rows.map(r => r.id)) + 1;
    rows.push(row); DB.save(t, rows); return row;
  },
  update(t, id, patch) { const rows = DB.all(t), r = rows.find(x => x.id == id); if (r) { Object.assign(r, patch); DB.save(t, rows); } return r; },
  remove: (t, id) => DB.save(t, DB.all(t).filter(r => r.id != id)),
};

/* Общие справочники */
const CATS = [
  { key: 'all', label: 'Все' }, { key: 'dishes', label: 'Блюда' }, { key: 'drinks', label: 'Напитки' },
  { key: 'desserts', label: 'Десерты' }, { key: 'combo', label: 'Комбо' }, { key: 'seasonal', label: 'Сезонное' },
];
const ORDER_STATUS = { new: 'Принят', cooking: 'Готовится', ready: 'Готов', served: 'Подан', cancelled: 'Отменён' };
const RES_STATUS   = { new: 'Новая', confirmed: 'Подтверждена', cancelled: 'Отменена' };

/* Стартовые данные (создаются один раз при первом открытии сайта) */
(function seed() {
  if (LS.get('ola_seed') === 2) return;
  const M = [
    ['Хачапури по-аджарски', 'dishes', 2800, '450 г', '🫓', 'Лодочка из тонкого теста с сулугуни, маслом и яйцом. Подаётся горячей.', ['Сулугуни', 'Свежее яйцо', 'Выпекается при вас'], 1],
    ['Хинкали (5 шт)', 'dishes', 2600, '400 г', '🥟', 'Сочные хинкали с говядиной и бараниной, зеленью и бульоном внутри.', ['Ручная лепка', 'Бульон внутри', 'Острый перец отдельно'], 1],
    ['Чахохбили', 'dishes', 3200, '350 г', '🍗', 'Тушёная курица с томатами, луком и грузинскими специями.', ['Без глютена', 'Томлёное мясо', 'Свежая кинза'], 0],
    ['Шашлык из баранины', 'dishes', 4200, '300 г', '🍢', 'Баранина на мангале с маринованным луком и соусом ткемали.', ['Мангал', 'Баранина', 'Соус ткемали'], 1],
    ['Лобио в горшочке', 'dishes', 2200, '300 г', '🫘', 'Красная фасоль с орехами, кинзой и специями. Подаётся с мчади.', ['Вегетарианское', 'Грецкий орех', 'Мчади в комплекте'], 0],
    ['Харчо', 'dishes', 2300, '350 мл', '🍲', 'Наваристый суп из говядины с рисом, ткемали и орехами.', ['Говядина', 'Пряный', 'Горячий'], 0],
    ['Салат «Тбилиси»', 'dishes', 2400, '220 г', '🥗', 'Помидоры, огурцы, красный лук, кинза и грецкий орех.', ['Вегетарианское', 'Свежие овощи', 'Лёгкое'], 0],
    ['Хачапури по-имеретински', 'dishes', 2500, '400 г', '🧀', 'Круглая лепёшка с имеретинским сыром.', ['Сыр', 'Классика', 'Для компании'], 0],
    ['Лимонад «Тархун»', 'drinks', 1200, '400 мл', '🥤', 'Домашний лимонад с эстрагоном и лаймом.', ['Без алкоголя', 'Свежий эстрагон', 'Охлаждённый'], 1],
    ['Чай с мятой', 'drinks', 900, '500 мл', '🫖', 'Чайник чёрного чая со свежей мятой и мёдом.', ['Горячий', 'Мята', 'На двоих'], 0],
    ['Саперави (бокал)', 'drinks', 2800, '150 мл', '🍷', 'Красное сухое вино из Кахетии.', ['Кахетия', 'Сухое', '18+'], 0],
    ['Боржоми', 'drinks', 1000, '500 мл', '💧', 'Минеральная вода из Грузии.', ['Газированная', 'Охлаждённая'], 0],
    ['Пахлава', 'desserts', 1500, '120 г', '🍯', 'Слоёный десерт с орехами и мёдом.', ['Грецкий орех', 'Мёд', 'К чаю'], 0],
    ['Чурчхела', 'desserts', 1300, '100 г', '🌰', 'Орехи в виноградном соке — национальная сладость.', ['Без сахара', 'Орехи', 'Классика'], 0],
    ['Комбо «Тбилиси»', 'combo', 5500, '850 г', '🍽️', 'Хинкали, салат «Тбилиси» и лимонад — выгоднее, чем по отдельности.', ['Экономия 700 ₸', 'На одного', 'Хит'], 1],
    ['Тыквенный суп', 'seasonal', 2100, '300 мл', '🎃', 'Крем-суп из тыквы со сливками и семенами.', ['Сезонное', 'Вегетарианское', 'Крем-суп'], 0],
  ];
  const menu = M.map((a, i) => ({ id: i + 1, name: a[0], category: a[1], price: a[2], weight: a[3], emoji: a[4], description: a[5], features: a[6], hit: !!a[7], photo_url: '', visible: true, sort_order: i }));
  const u = (id, first, last, email, pass, role, phone) => ({ id, first, last, email, pass: hash(pass), phone: phone || '', dob: '', role });
  const users = [u(1, 'Админ', 'Ola', 'admin@olacafe.kz', 'admin123', 'admin'), u(2, 'Айгерим', 'Садыкова', 'aigerim@mail.com', 'demo123', 'user', '+7 701 555 0101'), u(3, 'Данияр', 'Омаров', 'daniyar@mail.com', 'demo123', 'user', '+7 702 555 0202')];
  const it = (id, q, comment = '') => { const m = menu.find(x => x.id === id); return { id, name: m.name, qty: q, price: m.price, comment }; };
  const ord = (uid, ago, table, items, waiter, status) => { const total = items.reduce((s, i) => s + i.price * i.qty, 0); return { userId: uid, table_num: table, items, total, comment: '', waiter_name: waiter, daily_date: dayStr(-ago), created_at: new Date(Date.now() - ago * 864e5).toISOString(), status }; };
  const orders = [
    ord(2, 3, 4, [it(2, 2), it(9, 2)], 'Нино', 'served'),
    ord(3, 1, 7, [it(1, 1), it(4, 1, 'без лука'), it(11, 2)], 'Давид', 'served'),
    ord(2, 0, 2, [it(15, 1), it(13, 1)], 'Тамара', 'cooking'),
  ].map((o, i) => ({ id: 1001 + i, ...o }));
  const res = (id, uid, name, phone, d, time, n, table, status) => ({ id, userId: uid, name, phone, date: dayStr(d), time, people_count: n, table_num: table, comment: '', status, created_at: new Date().toISOString() });
  DB.save('menu', menu); DB.save('users', users); DB.save('orders', orders); DB.save('returns', []);
  DB.save('reservations', [res(2001, 2, 'Айгерим Садыкова', '+7 701 555 0101', 2, '19:00', 4, '5', 'confirmed'), res(2002, 3, 'Данияр Омаров', '+7 702 555 0202', 3, '20:00', 2, '', 'new'), res(2003, 2, 'Айгерим Садыкова', '+7 701 555 0101', -5, '18:30', 2, '', 'confirmed')]);
  LS.set('ola_seed', 2);
})();
