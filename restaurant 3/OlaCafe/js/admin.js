/**
 * admin.js — панель администратора Ola Cafe.
 * Обзор · Заказы (смена статуса) · Меню (CRUD) · Брони · Пользователи · Возвраты · Официанты.
 * Доступ — только для пользователей с ролью admin (см. guard в auth.js).
 */
const TABS = ['overview', 'orders', 'menu', 'reservations', 'users', 'returns', 'waiters'];
let menu = DB.all('menu');

const userName = id => { const u = DB.find('users', id); return u ? esc(u.first + ' ' + u.last) : 'Гость'; };
const emptyHTML = msg => `<div style="padding:44px 20px;text-align:center;color:var(--muted);font-family:'Cormorant Garamond',serif;font-size:20px">${msg}</div>`;

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((t, i) => t.classList.toggle('active', TABS[i] === tab));
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  $('tab-' + tab).classList.add('active');
  ({ overview: loadOverview, orders: loadOrders, menu: loadMenuAdmin, reservations: loadReservations, users: loadUsers, returns: loadReturns, waiters: loadWaiters })[tab]();
}

/* ── Обзор ── */
function loadOverview() {
  const O = DB.all('orders'), today = O.filter(o => o.daily_date === dayStr() && o.status !== 'cancelled');
  const card = (n, l) => `<div class="stat-card"><div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`;
  $('overviewWrap').innerHTML = `<div class="stats-grid stats3">${card(DB.all('users').length, 'Пользователей')}${card(DB.all('menu').length, 'Блюд в меню')}${card(O.length, 'Заказов')}${card(DB.all('reservations').length, 'Броней')}${card(DB.all('reservations').filter(r => r.status === 'new').length, 'Новых броней')}${card(money(today.reduce((s, o) => s + o.total, 0)), 'Выручка сегодня')}</div>`;
}

/* ── Заказы по дням + смена статуса ── */
function loadOrders() {
  const data = DB.all('orders').sort((a, b) => b.id - a.id), wrap = $('ordersWrap');
  if (!data.length) { wrap.innerHTML = emptyHTML('Заказов пока нет'); return; }
  const groups = {};
  data.forEach(o => (groups[o.daily_date] = groups[o.daily_date] || []).push(o));
  wrap.innerHTML = Object.entries(groups).map(([date, orders]) => {
    const dayTotal = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    const cards = orders.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
      const lines = o.items.map(it => `${esc(it.name)} × ${it.qty}${it.comment ? ` <span style="color:var(--sage);font-size:11px">(${esc(it.comment)})</span>` : ''}`).join(' · ');
      return `<div class="order-card"><div class="order-card-head"><div class="order-card-num">#${o.id}</div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:var(--sage)">👤 ${esc(o.waiter_name)}</span><div class="order-card-time">${time}</div></div></div>
        <div class="order-table">Стол ${esc(o.table_num)}</div> <span class="order-guest">Гость: ${userName(o.userId)}</span>
        <div class="order-items-text">${lines}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div class="order-total">${money(o.total)}</div>
          <div class="order-actions"><select class="status-select status-${o.status}" onchange="setOrderStatus(${o.id},this.value)">${Object.entries(ORDER_STATUS).map(([k, v]) => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="act act-edit" onclick="openReturnModal(${o.id},'${esc(o.table_num)}',${o.total})">↩ Возврат</button></div></div>
        ${o.comment ? `<div class="order-comment-text">${esc(o.comment)}</div>` : ''}</div>`;
    }).join('');
    return `<div class="day-group"><div class="day-label"><span>${fmtDate(date)}</span><span class="day-total">${money(dayTotal)}</span></div>${cards}</div>`;
  }).join('');
}
function setOrderStatus(id, status) { DB.update('orders', id, { status }); toast('Статус обновлён: ' + ORDER_STATUS[status], 'ok'); loadOrders(); }

/* ── Официанты ── */
function loadWaiters() {
  const data = DB.all('orders').filter(o => o.status !== 'cancelled'), wrap = $('waitersWrap');
  if (!data.length) { wrap.innerHTML = emptyHTML('Заказов пока нет'); return; }
  const totals = {}; data.forEach(o => totals[o.waiter_name] = (totals[o.waiter_name] || 0) + o.total);
  wrap.innerHTML = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([name, sum], i) => `<div class="waiter-card"><div style="display:flex;align-items:center;gap:12px"><div class="waiter-rank">${i + 1}</div><div><div class="waiter-name">${esc(name)}</div><div style="font-size:11px;color:var(--muted)">Всё время</div></div></div><div class="waiter-total">${money(sum)}</div></div>`).join('');
}

/* ── Возвраты ── */
function openReturnModal(orderId, tableNum, orderTotal) {
  $('returnOrderId').value = orderId; $('returnTableNum').value = tableNum; $('returnMaxAmt').value = orderTotal;
  ['returnAmount', 'returnReason', 'returnItems'].forEach(i => { $(i).value = ''; V.clear($(i)); });
  openModal('returnModal');
}
function submitReturn() {
  const max = +$('returnMaxAmt').value;
  const ok = V.run({
    returnAmount: v => !/^\d+$/.test(v) || +v <= 0 ? 'Укажите сумму — целое число больше 0' : +v > max ? `Максимум ${money(max)}` : '',
    returnReason: v => v.length < 3 ? 'Укажите причину возврата' : '',
  });
  if (!ok) return;
  const items = $('returnItems').value.trim();
  DB.add('returns', { order_id: $('returnOrderId').value || null, table_num: $('returnTableNum').value, items: items ? [{ description: items }] : [], reason: $('returnReason').value.trim(), amount: +$('returnAmount').value, created_at: new Date().toISOString() });
  closeModal('returnModal'); toast(`Возврат ${money($('returnAmount').value)} оформлен`, 'ok'); loadReturns();
}
function loadReturns() {
  const data = DB.all('returns').sort((a, b) => b.id - a.id), wrap = $('returnsWrap');
  if (!data.length) { wrap.innerHTML = emptyHTML('Возвратов нет'); return; }
  wrap.innerHTML = data.map(r => `<div class="return-card"><div class="order-card-head"><div class="order-card-num">Возврат #${r.id}</div><div class="return-amount">−${money(r.amount)}</div></div><div style="font-size:12px;color:var(--muted);line-height:1.8"><div>Стол: <strong style="color:var(--text)">${esc(r.table_num || '—')}</strong></div><div>Причина: <strong style="color:var(--text)">${esc(r.reason)}</strong></div><div>${new Date(r.created_at).toLocaleString('ru')}</div></div></div>`).join('');
}

/* ── Меню: создание, чтение, изменение, удаление (CRUD) ── */
function loadMenuAdmin() { menu = DB.all('menu'); renderMenuAdmin(); }
function renderMenuAdmin() {
  const list = $('menuList');
  if (!menu.length) { list.innerHTML = emptyHTML('Блюд нет — нажмите «+ Добавить»'); return; }
  list.innerHTML = menu.map(d => `<div class="dish-row">
    ${d.photo_url ? `<img class="dish-row-img" src="${esc(d.photo_url)}" alt=""/>` : `<div class="dish-row-emo">${d.emoji || '🍽'}</div>`}
    <div><div class="dish-row-name">${esc(d.name)}</div><div class="dish-row-meta">${money(d.price)} · ${esc(d.weight || '—')} · ${esc(catLabel(d.category))}</div></div>
    <div class="dish-row-actions"><button class="act act-edit" onclick="editDish(${d.id})">✏️ Изменить</button><button class="act act-sm ${d.visible !== false ? 'active' : ''}" onclick="toggleVis(${d.id})">${d.visible !== false ? 'Показано' : 'Скрыто'}</button><button class="act act-del" onclick="deleteDish(${d.id})">🗑 Удалить</button></div></div>`).join('');
}
const catLabel = k => (CATS.find(c => c.key === k) || {}).label || k;
function toggleVis(id) { const d = DB.find('menu', id); DB.update('menu', id, { visible: d.visible === false }); loadMenuAdmin(); toast(d.visible === false ? 'Блюдо показано' : 'Блюдо скрыто'); }
function deleteDish(id) { if (!confirm('Удалить блюдо из меню?')) return; DB.remove('menu', id); loadMenuAdmin(); toast('Блюдо удалено'); }

function openAddDish() { resetDishForm(); $('dishFormTitle').textContent = 'Новое блюдо'; openModal('dishModal'); }
function editDish(id) {
  const d = DB.find('menu', id); if (!d) return;
  resetDishForm(); $('dishFormTitle').textContent = 'Редактировать блюдо';
  $('editDishId').value = id; $('fName').value = d.name; $('fDesc').value = d.description || ''; $('fPrice').value = d.price; $('fWeight').value = d.weight || ''; $('fEmoji').value = d.emoji || ''; $('fCat').value = d.category; $('fFeatures').value = (d.features || []).join(', '); $('existingPhoto').value = d.photo_url || '';
  if (d.photo_url) { $('photoPreview').src = d.photo_url; $('photoPreview').classList.add('show'); $('photoUploadContent').style.display = 'none'; }
  openModal('dishModal');
}
function resetDishForm() {
  ['editDishId', 'fName', 'fDesc', 'fPrice', 'fWeight', 'fEmoji', 'fFeatures', 'existingPhoto', 'photoInput'].forEach(i => { $(i).value = ''; });
  ['fName', 'fDesc', 'fPrice', 'fFeatures'].forEach(i => V.clear($(i)));
  $('fCat').value = 'dishes'; $('photoPreview').classList.remove('show'); $('photoUploadContent').style.display = '';
}
function onPhotoSelected(input) {
  if (!input.files[0]) return;
  $('photoPreview').src = URL.createObjectURL(input.files[0]); $('photoPreview').classList.add('show'); $('photoUploadContent').style.display = 'none';
}
/* фото сжимается и сохраняется прямо в браузере (data URL) */
function readImage(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 640 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = im.width * k; c.height = im.height * k; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .78)); }; im.onerror = rej; im.src = r.result; };
    r.onerror = rej; r.readAsDataURL(file);
  });
}
async function saveDish() {
  const ok = V.run({
    fName:  v => v.length < 2 ? 'Введите название (минимум 2 символа)' : '',
    fPrice: v => !/^\d+$/.test(v) || +v <= 0 ? 'Цена — целое число больше 0' : '',
    fDesc:  v => v.length > 200 ? 'Описание не длиннее 200 символов' : '',
  });
  if (!ok) return;
  const btn = $('saveDishBtn'); btn.disabled = true; btn.textContent = 'Сохраняем...';
  try {
    let photo = $('existingPhoto').value || '';
    const f = $('photoInput').files[0]; if (f) photo = await readImage(f);
    const row = { name: $('fName').value.trim(), description: $('fDesc').value.trim(), price: +$('fPrice').value, weight: $('fWeight').value.trim(), emoji: $('fEmoji').value.trim(), category: $('fCat').value, features: $('fFeatures').value.split(',').map(s => s.trim()).filter(Boolean), photo_url: photo };
    const id = $('editDishId').value;
    if (id) { DB.update('menu', id, row); toast('Блюдо обновлено', 'ok'); }
    else { DB.add('menu', { ...row, visible: true, hit: false, sort_order: DB.all('menu').length }); toast('Блюдо добавлено', 'ok'); }
    closeModal('dishModal'); loadMenuAdmin();
  } catch (e) { console.error(e); toast('Не удалось сохранить (возможно, фото слишком большое)', 'err'); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
}

/* ── Брони ── */
function loadReservations() {
  const data = DB.all('reservations').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), wrap = $('reservationsWrap');
  if (!data.length) { wrap.innerHTML = emptyHTML('Броней пока нет'); return; }
  const groups = {}; data.forEach(r => (groups[r.date] = groups[r.date] || []).push(r));
  wrap.innerHTML = Object.entries(groups).map(([date, list]) => `<div class="day-group"><div class="day-label"><span>${fmtDate(date)}</span><span style="color:var(--muted);letter-spacing:0">${list.length} шт.</span></div>${list.map(r => `<div class="res-card"><div class="res-card-head"><div class="res-name">#${r.id} · ${esc(r.name)}</div><div class="res-status ${r.status}">${RES_STATUS[r.status]}</div></div>
    <div class="res-info"><div>📞 <strong>${esc(r.phone)}</strong></div><div>🕐 <strong>${r.time}</strong> · 👥 <strong>${r.people_count} чел.</strong>${r.table_num ? ` · Стол <strong>${esc(r.table_num)}</strong>` : ''}</div>${r.comment ? `<div>💬 ${esc(r.comment)}</div>` : ''}</div>
    <div class="res-actions">${r.status !== 'confirmed' ? `<button class="act act-edit" onclick="setResStatus(${r.id},'confirmed')">✓ Подтвердить</button>` : ''}${r.status !== 'cancelled' ? `<button class="act act-del" onclick="setResStatus(${r.id},'cancelled')">✕ Отменить</button>` : ''}<button class="act act-sm" onclick="deleteRes(${r.id})">🗑 Удалить</button></div></div>`).join('')}</div>`).join('');
}
function setResStatus(id, status) { DB.update('reservations', id, { status }); toast(status === 'confirmed' ? 'Бронь подтверждена' : 'Бронь отменена', status === 'confirmed' ? 'ok' : ''); loadReservations(); }
function deleteRes(id) { if (!confirm('Удалить бронь?')) return; DB.remove('reservations', id); loadReservations(); }

/* ── Пользователи ── */
function loadUsers() {
  const users = DB.all('users'), O = DB.all('orders'), R = DB.all('reservations');
  $('usersWrap').innerHTML = `<div class="tw"><table><tr><th>Имя</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Заказов</th><th>Броней</th><th></th></tr>${users.map(u => `<tr><td>${esc(u.first + ' ' + u.last)}</td><td>${esc(u.email)}</td><td>${esc(u.phone || '—')}</td><td>${u.role === 'admin' ? 'админ' : 'гость'}</td><td>${O.filter(o => o.userId === u.id).length}</td><td>${R.filter(r => r.userId === u.id).length}</td><td>${u.id !== me().id ? `<button class="act act-edit" onclick="toggleRole(${u.id})">${u.role === 'admin' ? 'Сделать гостем' : 'Сделать админом'}</button> <button class="act act-del" onclick="deleteUser(${u.id})">Удалить</button>` : '(вы)'}</td></tr>`).join('')}</table></div>`;
}
function toggleRole(id) { const u = DB.find('users', id); DB.update('users', id, { role: u.role === 'admin' ? 'user' : 'admin' }); loadUsers(); }
function deleteUser(id) { if (!confirm('Удалить пользователя?')) return; DB.remove('users', id); toast('Пользователь удалён'); loadUsers(); }

/* ── Модальные окна ── */
function openModal(id) { $(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(id).classList.remove('open'); document.body.style.overflow = ''; }
function handleBg(e, id) { if (e.target === $(id)) closeModal(id); }

if (!STOP) switchTab('overview');
