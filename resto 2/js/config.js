/**
 * ╔══════════════════════════════════════╗
 *  config.js — заполни и деплой
 * ╚══════════════════════════════════════╝
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

  /* ── РЕСТОРАН ── */
  restaurant: {
    name:      "Чачапури",
    tagline:   "Вкусно как дома",
    tagline_kz:"Үйдегідей дәмді",
    tagline_en:"Tastes like home",
    city:      "Алматы",
    phone:     "+7 777 000 00 00",
    instagram: "@chachapuri_almaty",
    heroImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80",
    tableCount: 20, // кол-во столов
  },

  /* ── ОПЛАТА ── */
  payments: [
    { id:"kaspi",   name:"Kaspi QR",    icon:"💳", color:"#EE3124", link:"https://kaspi.kz/pay/ССЫЛКА" },
    { id:"halyk",   name:"Halyk Bank",  icon:"🏦", color:"#00A651", link:"https://pay.halykbank.kz/ССЫЛКА" },
    { id:"freedom", name:"Freedom Pay", icon:"🔵", color:"#0066CC", link:"https://pay.freedomfinance.kz/ССЫЛКА" },
  ],

  /* ── ОФИЦИАНТЫ ── */
  waiters: ["Нино","Тамара","Гиорги","Лука","Мариам"],

  /* ── ЯЗЫКИ ── */
  defaultLang: "ru", // ru | kz | en

  /* ── ПАРОЛЬ АДМИНКИ ── */
  admin: { password: "resto2025" },

};

/* ── i18n тексты интерфейса ── */
const I18N = {
  ru: {
    home:"Главная", menu:"Меню", cart:"Корзина",
    order:"Заказ", reserve:"Бронь", contacts:"Контакты",
    openMenu:"Открыть меню", bookTable:"Забронировать стол",
    callWaiter:"Вызвать официанта",
    callWaiterMsg:"Официант уже спешит к вам 👋",
    addToCart:"Добавить", inCart:"В корзине",
    cartEmpty:"Корзина пуста", addSomething:"Добавьте что-нибудь из меню",
    popular:"Хит", isNew:"Новое", stopList:"Нет в наличии",
    cookTime:"мин", allergens:"Аллергены",
    tableNum:"Номер стола", chooseWaiter:"Выберите официанта",
    orderComment:"Комментарий к заказу", sendOrder:"Отправить заказ",
    payTitle:"Выберите способ оплаты", payAfter:"После оплаты покажите чек официанту",
    resTitle:"Забронируй стол", resName:"Ваше имя", resPhone:"Телефон",
    resDate:"Дата", resPeople:"Гостей", resTable:"Предпочтительный стол",
    resComment:"Пожелания", resSubmit:"Забронировать",
    resSuccess:"Бронь принята! Мы свяжемся с вами.",
    searchPlaceholder:"Поиск по меню...",
    all:"Все", dishes:"Блюда", drinks:"Напитки",
    desserts:"Десерты", combo:"Комбо", seasonal:"Сезонное",
    total:"Итого", items:"позиций",
    dishComment:"Без лука, extra соус...",
    continueMenu:"← Продолжить выбор",
    backToCart:"← Вернуться в корзину",
    toHome:"На главную",
    workHours:"10:00 — 23:00, ежедневно",
    enterTable:"Введите номер стола",
  },
  kz: {
    home:"Басты", menu:"Мәзір", cart:"Себет",
    order:"Тапсырыс", reserve:"Брондау", contacts:"Байланыс",
    openMenu:"Мәзірді ашу", bookTable:"Үстел брондау",
    callWaiter:"Даяшыны шақыру",
    callWaiterMsg:"Даяшы сізге келе жатыр 👋",
    addToCart:"Қосу", inCart:"Себетте",
    cartEmpty:"Себет бос", addSomething:"Мәзірден бірдеңе қосыңыз",
    popular:"Хит", isNew:"Жаңа", stopList:"Қазір жоқ",
    cookTime:"мин", allergens:"Аллергендер",
    tableNum:"Үстел нөмірі", chooseWaiter:"Даяшыны таңдаңыз",
    orderComment:"Тапсырысқа түсініктеме", sendOrder:"Тапсырыс жіберу",
    payTitle:"Төлем тәсілін таңдаңыз", payAfter:"Төлемнен кейін чекті көрсетіңіз",
    resTitle:"Үстел брондау", resName:"Атыңыз", resPhone:"Телефон",
    resDate:"Күні", resPeople:"Қонақтар", resTable:"Қалаған үстел",
    resComment:"Тілектер", resSubmit:"Брондау",
    resSuccess:"Брондалды! Сізбен хабарласамыз.",
    searchPlaceholder:"Мәзірден іздеу...",
    all:"Барлығы", dishes:"Тағамдар", drinks:"Сусындар",
    desserts:"Тәттілер", combo:"Комбо", seasonal:"Маусымдық",
    total:"Барлығы", items:"дана",
    dishComment:"Пиязсыз, extra соус...",
    continueMenu:"← Мәзірге оралу",
    backToCart:"← Себетке оралу",
    toHome:"Басты бетке",
    workHours:"10:00 — 23:00, күн сайын",
    enterTable:"Үстел нөмірін енгізіңіз",
  },
  en: {
    home:"Home", menu:"Menu", cart:"Cart",
    order:"Order", reserve:"Reserve", contacts:"Contacts",
    openMenu:"Open menu", bookTable:"Book a table",
    callWaiter:"Call waiter",
    callWaiterMsg:"Your waiter is on the way 👋",
    addToCart:"Add", inCart:"In cart",
    cartEmpty:"Cart is empty", addSomething:"Add something from the menu",
    popular:"Popular", isNew:"New", stopList:"Unavailable",
    cookTime:"min", allergens:"Allergens",
    tableNum:"Table number", chooseWaiter:"Choose your waiter",
    orderComment:"Order notes", sendOrder:"Place order",
    payTitle:"Choose payment method", payAfter:"Show receipt to your waiter after payment",
    resTitle:"Book a table", resName:"Your name", resPhone:"Phone",
    resDate:"Date", resPeople:"Guests", resTable:"Preferred table",
    resComment:"Special requests", resSubmit:"Book now",
    resSuccess:"Reservation confirmed! We will contact you.",
    searchPlaceholder:"Search menu...",
    all:"All", dishes:"Food", drinks:"Drinks",
    desserts:"Desserts", combo:"Combo", seasonal:"Seasonal",
    total:"Total", items:"items",
    dishComment:"No onion, extra sauce...",
    continueMenu:"← Continue shopping",
    backToCart:"← Back to cart",
    toHome:"Go home",
    workHours:"10:00 — 23:00, daily",
    enterTable:"Enter table number",
  },
};
