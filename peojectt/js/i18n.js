/* Переключатель RU / EN, выбранный язык сохраняется между страницами. */
const I18N = (() => {
  const en = {
    'Главная':'Home','Меню':'Menu','Бронь':'Reserve','Бронь стола':'Reserve a table','О нас':'About us','Мой кабинет':'My account','Кабинет':'Account','Админ':'Admin','Корзина':'Cart','Войти':'Log in','Выйти':'Log out','Регистрация':'Sign up','Навигация':'Navigation','Контакты':'Contacts','Конфиденциальность':'Privacy','Условия':'Terms','Авторская грузинская кухня в Алматы. Рецепты, которые передаются из поколения в поколение.':'Authentic Georgian cuisine in Almaty. Recipes passed down through generations.','когда любовь становится вкусом':'where love becomes flavour','Авторская кухня · Алматы':'Authentic cuisine · Almaty','С любовью.':'Made with love.','Рецепты, которые передаются из поколения в поколение.':'Recipes passed down through generations.','Открыть меню':'View menu','Забронировать стол':'Reserve a table','Горячие блюда':'Hot dishes','Хачапури, хинкали, шашлык':'Khachapuri, khinkali, shashlik','Грузинские вина':'Georgian wines','Саперави и другие':'Saperavi and more','Бронь столика':'Table reservation','Выберите дату и время':'Choose date and time','Заказ и оплата':'Order and payment','Любимое гостей':'Guest favourites','Популярные':'Popular','блюда':'dishes','Всё меню':'Full menu','Просто и быстро':'Simple and quick','Как это':'How it','работает':'works','Войдите в аккаунт':'Log in to your account','Выберите блюда':'Choose dishes','Получите подтверждение':'Get confirmation','Проголодались?':'Feeling hungry?','С возвращением':'Welcome back','Войдите, чтобы заказывать и бронировать столы.':'Log in to order and reserve tables.','Пароль':'Password','Нет аккаунта?':'No account?','Зарегистрироваться':'Sign up','Демо-доступ':'Demo access','Гость:':'Guest:','Создать':'Create','аккаунт':'an account','Это займёт меньше минуты.':'It takes less than a minute.','Имя':'First name','Фамилия':'Last name','Повторите пароль':'Repeat password','Телефон':'Phone','Дата рождения':'Date of birth','Сохранить':'Save','Выйти из аккаунта':'Log out','Мои заказы':'My orders','Мои брони':'My reservations','Новый заказ':'New order','Наше меню':'Our menu','Выбери':'Choose','своё':'yours','Поиск по меню...':'Search the menu...','Любая цена':'Any price','до 2 000 ₸':'under ₸2,000','от 3 000 ₸':'over ₸3,000','Ничего не найдено':'Nothing found','Вам понравится':'You may like','Похожие':'Similar','Ваш выбор':'Your selection','Очистить':'Clear','Оформление':'Checkout','Ваш':'Your','заказ':'order','Номер стола':'Table number','Введите номер стола':'Enter table number','Ваш официант':'Your waiter','Комментарий к заказу':'Order notes','Пожелания, аллергии...':'Requests, allergies...','Отправить заказ':'Place order','← Вернуться в корзину':'← Back to cart','Оплата':'Payment','способ':'method','К оплате':'Amount due','Сумма заказа':'Order total','На главную':'Home','Онлайн бронь':'Online reservation','Забронируй':'Reserve a','стол':'table','Ваше имя':'Your name','Имя и фамилия':'First and last name','Дата':'Date','Кол-во гостей':'Guests','Время':'Time','Комментарий':'Comment','Мы свяжемся для подтверждения':'We will contact you to confirm','Документы':'Documents','Политика':'Privacy','конфиденциальности':'policy','использования':'of use','Какие данные мы храним':'What data we store','Пароли':'Passwords','Удаление данных':'Deleting data','Заказы':'Orders','Учебный проект':'Educational project','Подтверждение':'Confirmation','Блюдо':'Dish','Подробнее →':'Details →','В корзину':'Add to cart','← Назад в меню':'← Back to menu','Корзина пуста':'Your cart is empty','Добавьте что-нибудь из меню':'Add something from the menu','Итого':'Total','Позиций':'Items','Оформить заказ →':'Checkout →','← Продолжить выбор':'← Continue shopping','Состав заказа':'Order summary','Наличными официанту':'Cash to waiter','Все':'All','Блюда':'Dishes','Напитки':'Drinks','Десерты':'Desserts','Комбо':'Combos','Сезонное':'Seasonal','Хачапури по-аджарски':'Adjarian khachapuri','Хинкали (5 шт)':'Khinkali (5 pcs)','Чахохбили':'Chakhokhbili','Шашлык из баранины':'Lamb shashlik','Лобио в горшочке':'Lobio in a pot','Харчо':'Kharcho','Салат «Тбилиси»':'Tbilisi salad','Хачапури по-имеретински':'Imeretian khachapuri','Лимонад «Тархун»':'Tarragon lemonade','Чай с мятой':'Mint tea','Саперави (бокал)':'Saperavi (glass)','Боржоми':'Borjomi','Пахлава':'Baklava','Чурчхела':'Churchkhela','Комбо «Тбилиси»':'Tbilisi combo','Тыквенный суп':'Pumpkin soup'
  };
  Object.assign(en, {
    'Лодочка из тонкого теста с сулугуни, маслом и яйцом. Подаётся горячей.':'A boat-shaped pastry with suluguni, butter and egg. Served hot.',
    'Сочные хинкали с говядиной и бараниной, зеленью и бульоном внутри.':'Juicy khinkali with beef, lamb, herbs and broth inside.',
    'Тушёная курица с томатами, луком и грузинскими специями.':'Slow-cooked chicken with tomatoes, onions and Georgian spices.',
    'Баранина на мангале с маринованным луком и соусом ткемали.':'Charcoal-grilled lamb with pickled onions and tkemali sauce.',
    'Красная фасоль с орехами, кинзой и специями. Подаётся с мчади.':'Red beans with walnuts, cilantro and spices. Served with mchadi.',
    'Наваристый суп из говядины с рисом, ткемали и орехами.':'Hearty beef soup with rice, tkemali and walnuts.',
    'Помидоры, огурцы, красный лук, кинза и грецкий орех.':'Tomatoes, cucumbers, red onion, cilantro and walnuts.',
    'Круглая лепёшка с имеретинским сыром.':'Round flatbread filled with Imeretian cheese.',
    'Домашний лимонад с эстрагоном и лаймом.':'House-made lemonade with tarragon and lime.',
    'Чайник чёрного чая со свежей мятой и мёдом.':'A pot of black tea with fresh mint and honey.',
    'Красное сухое вино из Кахетии.':'Dry red wine from Kakheti.',
    'Минеральная вода из Грузии.':'Mineral water from Georgia.',
    'Слоёный десерт с орехами и мёдом.':'Layered dessert with walnuts and honey.',
    'Орехи в виноградном соке — национальная сладость.':'Nuts in grape juice — a traditional sweet.',
    'Хинкали, салат «Тбилиси» и лимонад — выгоднее, чем по отдельности.':'Khinkali, Tbilisi salad and lemonade — better value together.',
    'Крем-суп из тыквы со сливками и семенами.':'Creamy pumpkin soup with cream and seeds.'
  });
  const language = () => localStorage.getItem('ola_language') || 'ru';
  const t = value => language() === 'en' ? (en[value] || value) : value;
  function apply() {
    const english = language() === 'en'; document.documentElement.lang = english ? 'en' : 'ru';
    if (english) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => { const raw = node.nodeValue, value = raw.trim(); if (en[value]) node.nodeValue = raw.replace(value, en[value]); });
      document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder','aria-label','title'].forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, t(el.getAttribute(a))); }));
      document.title = t(document.title.replace(' · Ola Cafe', '')) + ' · Ola Cafe';
    }
    const user = document.querySelector('.tuser');
    if (user && !document.querySelector('.language-switcher')) {
      const box = document.createElement('div'); box.className = 'language-switcher';
      box.innerHTML = `<button type="button" class="${english ? '' : 'active'}" data-language="ru">RU</button><button type="button" class="${english ? 'active' : ''}" data-language="en">EN</button>`;
      box.addEventListener('click', event => { const next = event.target.dataset.language; if (next) { localStorage.setItem('ola_language', next); location.reload(); } });
      user.prepend(box);
    }
  }
  return { apply, t };
})();
document.addEventListener('DOMContentLoaded', I18N.apply);
