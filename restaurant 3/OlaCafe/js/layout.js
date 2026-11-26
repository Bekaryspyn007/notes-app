/**
 * layout.js — общая «рамка» сайта: верхняя панель (логотип, меню, пользователь),
 * нижняя навигация для телефона (стиль Ola Cafe) и футер. Строится один раз для всех страниц.
 */
(function () {
  if (STOP) return;
  const u = me(), P = document.body.dataset.page || '', R = CONFIG.restaurant;
  const cartN = LS.get('ola_cart', []).reduce((s, c) => s + c.qty, 0);
  // какая вкладка подсвечена на каждой странице
  const act = k => (({ dish: 'menu', order: 'cart', payment: 'cart', confirm: 'cart' })[P] || P) === k ? 'active' : '';

  const L = [['index.html', 'Главная', 'home'], ['pages/menu.html', 'Меню', 'menu'], ['pages/reserve.html', 'Бронь', 'reserve'], ['pages/about.html', 'О нас', 'about']];
  if (u) L.push(['profile.html', 'Мой кабинет', 'profile']);
  if (u && u.role === 'admin') L.push(['admin.html', 'Админ', 'admin']);

  const tnav = L.map(([h, t, k]) => `<a class="${act(k)}" href="${ROOT + h}">${t}</a>`).join('')
    + `<a class="${act('cart')}" href="${ROOT}pages/cart.html">Корзина <span class="bnav-badge tbadge cart-count ${cartN ? 'show' : ''}">${cartN}</span></a>`
    + (u ? `<a class="only-m" href="${ROOT}login.html" onclick="logout();return false">Выйти</a>`
         : `<a class="only-m ${act('login')}" href="${ROOT}login.html">Войти</a><a class="only-m ${act('register')}" href="${ROOT}register.html">Регистрация</a>`);

  const user = u
    ? `<a class="chip-user" href="${ROOT}profile.html"><span class="ava">${esc((u.first[0] + u.last[0]).toUpperCase())}</span>${esc(u.first)}</a><button class="btn-sm" onclick="logout()">Выйти</button>`
    : `<a class="btn-sm ${act('login')}" href="${ROOT}login.html">Войти</a><a class="btn-sm solid" href="${ROOT}register.html">Регистрация</a>`;

  $('top').className = 'topbar';
  $('top').innerHTML = `<div class="topbar-in"><a class="brand" href="${ROOT}index.html"><span class="brand-mark">✦</span>${esc(R.name.split(' ')[0])} <em>${esc(R.name.split(' ').slice(1).join(' '))}</em></a><nav class="tnav" id="tnav">${tnav}</nav><div class="tuser">${user}</div><button class="tburger" aria-label="Меню" onclick="$('tnav').classList.toggle('open')">☰</button></div>`;

  const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">${p}</svg>`;
  const B = [
    ['index.html', 'home', 'Главная', ic('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>')],
    ['pages/menu.html', 'menu', 'Меню', ic('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')],
    ['pages/cart.html', 'cart', 'Корзина', ic('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>') + `<span class="bnav-badge cart-count ${cartN ? 'show' : ''}">${cartN}</span>`],
    ['pages/reserve.html', 'reserve', 'Бронь', ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>')],
    [u ? 'profile.html' : 'login.html', u ? 'profile' : 'login', u ? 'Кабинет' : 'Войти', ic('<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1"/>')],
  ];
  $('bnav').className = 'bnav';
  $('bnav').innerHTML = B.map(([h, k, t, svg]) => `<a class="bnav-item ${act(k)}" href="${ROOT + h}">${svg}${t}</a>`).join('');

  $('foot').innerHTML = `<div class="foot-in"><div class="foot-grid">
    <div><div class="brand foot-brand"><span class="brand-mark">✦</span>${esc(R.name)}</div><p>Авторская грузинская кухня в Алматы. Рецепты, которые передаются из поколения в поколение.</p></div>
    <div><h4>Навигация</h4><a href="${ROOT}index.html">Главная</a><a href="${ROOT}pages/menu.html">Меню</a><a href="${ROOT}pages/reserve.html">Бронь стола</a><a href="${ROOT}pages/about.html">О нас</a></div>
    <div><h4>Контакты</h4><a href="https://maps.google.com/?q=${encodeURIComponent(R.address)}" target="_blank" rel="noopener">${esc(R.address)}</a><a href="tel:${R.phone.replace(/[^+\d]/g, '')}">${esc(R.phone)}</a><a href="mailto:${esc(R.email)}">${esc(R.email)}</a><a href="${ROOT}pages/about.html#hours">${esc(R.hours)}</a></div></div>
    <div class="foot-bottom"><span>© 2026 ${esc(R.name)} — учебный проект</span><span class="flinks"><a href="${ROOT}pages/about.html">О нас</a><a href="${ROOT}pages/about.html#contact">Контакты</a><a href="${ROOT}pages/privacy.html">Конфиденциальность</a><a href="${ROOT}pages/terms.html">Условия</a></span></div>
    <div class="foot-bottom"><span class="flinks"><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a><a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a><a href="https://t.me" target="_blank" rel="noopener">Telegram</a></span></div></div>`;
})();
