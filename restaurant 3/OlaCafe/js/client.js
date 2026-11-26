/**
 * client.js — логика гостя: меню · карточка блюда · корзина · заказ · оплата · бронь · подтверждение.
 * (Перенесено из Ola Cafe; вместо Supabase используется DB из db.js.)
 */
let menu = DB.all('menu'), cart = LS.get('ola_cart', []), curCat = 'all', curSearch = '', curPrice = '', selTime = '';

const TIME_SLOTS = ['11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'];
const catLabel = k => (CATS.find(c => c.key === k) || {}).label || k;
const visibleMenu = () => menu.filter(d => d.visible !== false);
const param = k => new URLSearchParams(location.search).get(k);

/* ── Корзина ── */
function saveCart() { LS.set('ola_cart', cart); updateBadge(); }
function updateBadge() {
  const n = cart.reduce((s, c) => s + c.qty, 0);
  document.querySelectorAll('.cart-count').forEach(b => { b.textContent = n; b.classList.toggle('show', n > 0); });
}
function cartTotal() { return cart.reduce((s, c) => { const d = menu.find(m => m.id === c.id); return s + (d ? d.price * c.qty : 0); }, 0); }
function addToCart(id) {
  const dish = menu.find(d => d.id === id); if (!dish) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty++; else cart.push({ id, qty: 1, comment: '' });
  saveCart(); refreshCards();
  toast(`${dish.emoji || '✓'} ${dish.name} — добавлено`, 'ok');
}
function changeQty(id, delta) {
  const i = cart.findIndex(c => c.id === id); if (i < 0) return;
  cart[i].qty += delta; if (cart[i].qty <= 0) cart.splice(i, 1);
  saveCart(); renderCart();
}
function updateDishComment(id, val) { const c = cart.find(c => c.id === id); if (c) { c.comment = val; LS.set('ola_cart', cart); } }
function clearCart() { cart = []; saveCart(); renderCart(); }
function refreshCards() { if ($('menuGrid')) renderMenu(); if ($('popular')) renderHome(); }

/* ── Карточка блюда (стиль Ola Cafe) ── */
function dishCard(d) {
  const inCart = cart.find(c => c.id === d.id);
  const pic = d.photo_url ? `<img class="dish-img" src="${esc(d.photo_url)}" alt="${esc(d.name)}" loading="lazy"/>` : `<div class="dish-placeholder">${d.emoji || '🍽'}</div>`;
  return `<article class="dish-card" onclick="location.href='${ROOT}pages/dish.html?id=${d.id}'">
    ${pic}${inCart ? `<span class="in-cart-badge show">× ${inCart.qty}</span>` : ''}
    <div class="dish-body">
      <span class="dish-cat">${esc(catLabel(d.category))}</span>
      <div class="dish-name">${esc(d.name)}</div>
      <div class="dish-desc">${esc(d.description || '')}</div>
      <div class="dish-meta">
        <div><div class="dish-price">${money(d.price)}</div><div class="dish-weight">${esc(d.weight || '')}</div></div>
        <button class="dish-add ${inCart ? 'in-cart' : ''}" aria-label="Добавить в корзину" onclick="event.stopPropagation();addToCart(${d.id})">+</button>
      </div>
      <a class="dish-more" href="${ROOT}pages/dish.html?id=${d.id}" onclick="event.stopPropagation()">Подробнее →</a>
    </div></article>`;
}

/* ── Главная ── */
function renderHome() {
  $('popular').innerHTML = visibleMenu().filter(d => d.hit).slice(0, 4).map(dishCard).join('');
}

/* ── Меню: поиск + категория + цена ── */
const priceOk = p => !curPrice || (curPrice === 'lt' && p < 2000) || (curPrice === 'mid' && p >= 2000 && p <= 3000) || (curPrice === 'gt' && p > 3000);
function renderMenu() {
  $('catTabs').innerHTML = CATS.map(c => `<button class="cat-btn ${curCat === c.key ? 'active' : ''}" onclick="setCat('${c.key}')">${c.label}</button>`).join('');
  const q = curSearch.toLowerCase().trim();
  const vis = visibleMenu().filter(d => (curCat === 'all' || d.category === curCat) && (!q || (d.name + ' ' + (d.description || '')).toLowerCase().includes(q)) && priceOk(d.price));
  $('menuEmpty').classList.toggle('show', vis.length === 0);
  $('menuGrid').style.display = vis.length ? '' : 'none';
  $('menuCount').textContent = `Найдено блюд: ${vis.length}`;
  $('menuGrid').innerHTML = vis.map(dishCard).join('');
}
function setCat(k) { curCat = k; renderMenu(); }
function filterMenu() { curSearch = $('searchInput').value; curPrice = $('priceSel').value; renderMenu(); }

/* ── Страница блюда ── */
function renderDish() {
  const d = menu.find(x => x.id == param('id'));
  if (!d) { $('dish').innerHTML = '<div class="info-box">Блюдо не найдено. <a class="lnk" href="menu.html">Вернуться в меню</a></div>'; return; }
  const pic = d.photo_url ? `<img src="${esc(d.photo_url)}" alt="${esc(d.name)}"/>` : `<span>${d.emoji || '🍽'}</span>`;
  $('dish').innerHTML = `<div class="dish-photo">${pic}</div><div class="dish-info">
    <div class="eyebrow">${esc(catLabel(d.category))}</div><h1 class="sec-title">${esc(d.name)}</h1>
    <p class="dish-long">${esc(d.description || '')}</p>
    <ul class="feat-list">${(d.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    <div class="dish-price-row"><span class="price-big">${money(d.price)}</span><span class="dish-weight">${esc(d.weight || '')}</span></div>
    <div class="dish-actions"><button class="btn btn-primary" onclick="addToCart(${d.id})">В корзину</button><a class="btn btn-line" href="reserve.html">Забронировать стол</a></div>
    <a class="lnk" href="menu.html">← Назад в меню</a></div>`;
  const rel = visibleMenu().filter(x => x.category === d.category && x.id !== d.id).slice(0, 4);
  $('related').innerHTML = rel.map(dishCard).join('');
  $('relatedWrap').classList.toggle('hidden', !rel.length);
}

/* ── Корзина ── */
function renderCart() {
  const wrap = $('cartContent'), clearBtn = $('clearCartBtn');
  cart = cart.filter(c => menu.some(m => m.id === c.id));   // убрать удалённые блюда
  if (!cart.length) {
    clearBtn.style.display = 'none';
    wrap.innerHTML = `<div class="cart-empty"><div style="font-size:56px;opacity:.18">🛒</div><div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--muted)">Корзина пуста</div><div style="font-size:13px;color:var(--muted);opacity:.8;margin-top:5px">Добавьте что-нибудь из меню</div><a class="btn btn-primary" style="margin-top:18px" href="menu.html">Открыть меню</a></div>`;
    return;
  }
  clearBtn.style.display = '';
  const items = cart.map(c => {
    const d = menu.find(m => m.id === c.id);
    const img = d.photo_url ? `<img class="cart-img" src="${esc(d.photo_url)}" alt=""/>` : `<div class="cart-placeholder">${d.emoji || '🍽'}</div>`;
    return `<div class="cart-item"><div class="cart-item-top">${img}<div><div class="cart-item-name">${esc(d.name)}</div><div class="cart-item-price">${money(d.price * c.qty)}</div></div>
      <div class="qty-ctrl"><button class="qty-btn" aria-label="Меньше" onclick="changeQty(${d.id},-1)">−</button><span class="qty-num">${c.qty}</span><button class="qty-btn" aria-label="Больше" onclick="changeQty(${d.id},1)">+</button></div></div>
      <div class="dish-comment-wrap"><input class="dish-comment-input" type="text" maxlength="80" placeholder="Без лука, больше соуса..." value="${esc(c.comment || '')}" oninput="updateDishComment(${d.id},this.value)"/></div></div>`;
  }).join('');
  wrap.innerHTML = `<div class="cart-items">${items}</div><div class="divider"></div>
    <div class="total-row"><span class="total-label">Итого</span><span class="total-val">${money(cartTotal())}</span></div>
    <div class="total-row"><span class="total-label">Позиций</span><span style="font-size:13px;color:var(--muted)">${cart.reduce((s, c) => s + c.qty, 0)} шт.</span></div>
    <a class="btn btn-primary btn-full" href="order.html">Оформить заказ →</a><a class="btn btn-ghost" style="display:flex" href="menu.html">← Продолжить выбор</a>`;
}

/* ── Оформление заказа ── */
function renderOrderPage() {
  cart = cart.filter(c => menu.some(m => m.id === c.id));
  const el = $('orderSummary');
  if (!cart.length) {
    el.innerHTML = '<div style="text-align:center;padding:18px;color:var(--muted);font-size:13px">Корзина пуста. <a class="lnk" href="menu.html">Открыть меню</a></div>';
  } else {
    const rows = cart.map(c => { const d = menu.find(m => m.id === c.id); const comm = c.comment ? `<span style="font-size:11px;color:var(--sage);margin-left:4px">(${esc(c.comment)})</span>` : ''; return `<div class="order-sum-row"><span>${esc(d.name)} × ${c.qty}${comm}</span><span>${money(d.price * c.qty)}</span></div>`; }).join('');
    el.innerHTML = `<div class="order-sum-label">Состав заказа</div>${rows}<div class="order-sum-row total"><span>Итого</span><span>${money(cartTotal())}</span></div>`;
  }
  $('waiterBtns').innerHTML = CONFIG.waiters.map(w => `<button type="button" class="waiter-btn" onclick="selectWaiter('${w}',this)">${w}</button>`).join('');
}
function selectWaiter(name, el) {
  document.querySelectorAll('.waiter-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active'); $('waiterSelect').value = name; V.clear($('waiterSelect'));
}

/* ── Telegram (необязательно: работает, если заполнен CONFIG.telegram) ── */
async function sendTelegram(text) {
  const { token, chatId } = CONFIG.telegram;
  if (!token || !chatId) return;
  try {
    await Promise.race([
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }) }),
      new Promise(r => setTimeout(r, 3000)),
    ]);
  } catch (e) { console.warn('Telegram:', e); }
}

async function submitOrder() {
  if (!cart.length) { toast('Корзина пуста', 'err'); return; }
  const ok = V.run({
    tableNum:     v => !v ? 'Введите номер стола' : !/^\d+$/.test(v) || +v < 1 || +v > 99 ? 'Номер стола — целое число от 1 до 99' : '',
    waiterSelect: v => v ? '' : 'Выберите официанта',
    orderComment: v => v.length > 200 ? 'Комментарий не длиннее 200 символов' : '',
  });
  if (!ok) return;
  const btn = $('submitOrderBtn'); btn.disabled = true; btn.textContent = 'Отправка...';
  const items = cart.map(c => { const d = menu.find(m => m.id === c.id); return { id: c.id, name: d.name, qty: c.qty, price: d.price, comment: c.comment || '' }; });
  const total = cartTotal(), table = $('tableNum').value.trim(), waiter = $('waiterSelect').value, comment = $('orderComment').value.trim();
  const o = DB.add('orders', { userId: me().id, table_num: table, items, total, comment, waiter_name: waiter, daily_date: dayStr(), created_at: new Date().toISOString(), status: 'new' });
  const lines = items.map(i => `  • ${i.name} × ${i.qty} — ${money(i.price * i.qty)}${i.comment ? ` (${i.comment})` : ''}`).join('\n');
  await sendTelegram(`🍽 Новый заказ #${o.id} — ${CONFIG.restaurant.name}\n\n🪑 Стол: ${table}   👤 Официант: ${waiter}\n🕐 ${new Date().toLocaleString('ru', { timeZone: 'Asia/Almaty' })}\n\n${lines}\n\n💰 ${money(total)}${comment ? `\n\n💬 ${comment}` : ''}`);
  cart = []; saveCart();
  location.href = `confirmation.html?type=order&id=${o.id}`;
}

/* ── Бронь ── */
function initReserve() {
  const u = me(), inp = $('resDate');
  $('resName').value = u.first + ' ' + u.last; $('resPhone').value = u.phone || '';
  inp.min = dayStr(); if (!inp.value) inp.value = dayStr();
  inp.addEventListener('change', () => { if (V.past(inp.value, selTime)) { selTime = ''; $('resTimeView').value = ''; } renderTimeSlots(); });
  renderTimeSlots();
}
function renderTimeSlots() {
  const d = $('resDate').value;
  $('timeSlots').innerHTML = TIME_SLOTS.map(t => {
    const off = V.past(d, t);
    return `<button type="button" class="time-slot ${selTime === t ? 'active' : ''} ${off ? 'off' : ''}" ${off ? 'disabled' : ''} onclick="selectTime('${t}')">${t}</button>`;
  }).join('');
}
function selectTime(t) { selTime = t; $('resTimeView').value = t; V.clear($('resTimeView')); renderTimeSlots(); }

async function submitReservation() {
  const ok = V.run({
    resName:     v => !v ? 'Введите имя' : v.length < 2 ? 'Имя слишком короткое' : '',
    resPhone:    v => !v ? 'Введите телефон' : !V.phone(v) ? 'Неверный номер телефона' : '',
    resDate:     v => !v ? 'Выберите дату' : v < dayStr() ? 'Дата не может быть в прошлом' : '',
    resPeople:   v => !/^\d+$/.test(v) || +v < 1 || +v > 50 ? 'Количество гостей — целое число от 1 до 50' : '',
    resTimeView: v => !v ? 'Выберите время' : V.past($('resDate').value, v) ? 'Это время уже прошло' : '',
    resTable:    v => v.length > 20 ? 'Не больше 20 символов' : '',
    resComment:  v => v.length > 200 ? 'Комментарий не длиннее 200 символов' : '',
  });
  if (!ok) return;
  const btn = $('submitResBtn'); btn.disabled = true; btn.textContent = 'Отправка...';
  const r = DB.add('reservations', { userId: me().id, name: $('resName').value.trim(), phone: $('resPhone').value.trim(), date: $('resDate').value, time: selTime, people_count: +$('resPeople').value, table_num: $('resTable').value.trim(), comment: $('resComment').value.trim(), status: 'new', created_at: new Date().toISOString() });
  await sendTelegram(`📅 Новая бронь #${r.id} — ${CONFIG.restaurant.name}\n\n👤 ${r.name}\n📞 ${r.phone}\n📆 ${fmtDate(r.date)} в ${r.time}\n👥 Гостей: ${r.people_count}${r.table_num ? `\n🪑 Стол: ${r.table_num}` : ''}${r.comment ? `\n\n💬 ${r.comment}` : ''}`);
  location.href = `confirmation.html?type=reservation&id=${r.id}`;
}

/* ── Подтверждение ── */
function renderConfirmation() {
  const type = param('type'), isOrder = type === 'order', rec = DB.find(isOrder ? 'orders' : 'reservations', param('id')), u = me();
  if (!rec || (rec.userId !== u.id && u.role !== 'admin')) { $('conf').innerHTML = '<div class="info-box">Запись не найдена. <a class="lnk" href="../profile.html">Мой кабинет</a></div>'; return; }
  const rows = isOrder
    ? [['Номер заказа', '#' + rec.id], ['Дата', fmtDate(rec.daily_date)], ['Стол', rec.table_num], ['Официант', rec.waiter_name], ['Позиций', rec.items.reduce((s, i) => s + i.qty, 0)], ['Сумма', money(rec.total)], ['Статус', ORDER_STATUS[rec.status]]]
    : [['Номер брони', '#' + rec.id], ['Дата', fmtDate(rec.date)], ['Время', rec.time], ['Гостей', rec.people_count], ['Стол', rec.table_num || 'на усмотрение ресторана'], ['Статус', RES_STATUS[rec.status]]];
  $('conf').innerHTML = `<div class="conf-ok">✓</div><h2 class="sec-title" style="text-align:center">${isOrder ? 'Заказ <em>принят</em>!' : 'Бронь <em>принята</em>!'}</h2>
    <p class="conf-sub">${isOrder ? 'Официант уже получил ваш заказ.' : 'Мы свяжемся с вами для подтверждения.'}</p>
    <dl class="conf-list">${rows.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
    ${isOrder ? `<a class="btn btn-primary btn-full" href="payment.html?id=${rec.id}">Перейти к оплате</a>` : ''}
    <a class="btn ${isOrder ? 'btn-ghost' : 'btn-primary btn-full'}" style="display:flex;${isOrder ? '' : ''}" href="../profile.html">${isOrder ? 'Мои заказы и брони' : 'Мои заказы и брони'}</a>
    <a class="lnk center-lnk" href="../index.html">На главную</a>`;
}

/* ── Оплата ── */
function renderPayment() {
  const o = DB.find('orders', param('id')), u = me();
  if (!o || (o.userId !== u.id && u.role !== 'admin')) { $('payBox').innerHTML = '<div class="info-box">Заказ не найден. <a class="lnk" href="../profile.html">Мой кабинет</a></div>'; return; }
  $('payTotal').textContent = money(o.total);
  $('paymentGrid').innerHTML = CONFIG.payments.map(p => p.link
    ? `<a href="${esc(p.link)}" target="_blank" rel="noopener" class="pay-method-btn" style="--pay-color:${p.color}"><div class="pay-method-icon">${p.icon}</div><div class="pay-method-name">${esc(p.name)}</div><div class="pay-method-arrow">→</div></a>`
    : `<div class="pay-method-btn" style="--pay-color:${p.color}"><div class="pay-method-icon">${p.icon}</div><div class="pay-method-name">${esc(p.name)}</div><div class="pay-method-arrow">✓</div></div>`).join('');
}

/* ── Запуск ── */
function init() {
  const R = CONFIG.restaurant;
  document.querySelectorAll('[data-r]').forEach(el => el.textContent = R[el.dataset.r]);
  document.querySelectorAll('[data-tel]').forEach(el => el.href = 'tel:' + R.phone.replace(/[^+\d]/g, ''));
  document.querySelectorAll('[data-mail]').forEach(el => el.href = 'mailto:' + R.email);
  const bg = $('heroBg'); if (bg && R.heroImage) bg.style.backgroundImage = `url('${R.heroImage}')`;
  const hi = $('hello'); if (hi && me()) hi.textContent = `Добро пожаловать, ${me().first}! `;
  if ($('popular')) renderHome();
  if ($('menuGrid')) renderMenu();
  if ($('dish')) renderDish();
  if ($('cartContent')) renderCart();
  if ($('orderSummary')) renderOrderPage();
  if ($('timeSlots')) initReserve();
  if ($('conf')) renderConfirmation();
  if ($('paymentGrid')) renderPayment();
  updateBadge();
}
if (!STOP) init();
