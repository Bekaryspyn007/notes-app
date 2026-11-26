/**
 * auth.js — сессия, защита страниц, регистрация, вход, личный кабинет.
 * Пользователи лежат в localStorage (таблица users), текущий пользователь — ключ ola_session.
 */
const ROOT = document.body.dataset.root || '';
let STOP = false;   // true, если страницу закрыли и идёт перенаправление

const me = () => DB.find('users', LS.get('ola_session'));
function logout() { localStorage.removeItem('ola_session'); location.href = ROOT + 'index.html'; }

/* Защита страниц: data-auth="user" — только для вошедших, data-auth="admin" — только для админа */
(function guard() {
  const need = document.body.dataset.auth, u = me();
  if (need && !u) { STOP = true; sessionStorage.setItem('ola_next', location.href); location.href = ROOT + 'login.html'; }
  else if (need === 'admin' && u.role !== 'admin') { STOP = true; location.href = ROOT + 'index.html'; }
})();

/* ---------- Регистрация ---------- */
const regForm = $('regForm');
if (regForm) regForm.addEventListener('submit', e => {
  e.preventDefault();
  const users = DB.all('users');
  const ok = V.run({
    regFirst:   v => !v ? 'Введите имя' : v.length < 2 ? 'Имя слишком короткое' : '',
    regLast:    v => !v ? 'Введите фамилию' : v.length < 2 ? 'Фамилия слишком короткая' : '',
    regEmail:   v => !v ? 'Введите email' : !V.email(v) ? 'Введите корректный email, например name@mail.com' : users.some(u => u.email === v.toLowerCase()) ? 'Этот email уже зарегистрирован' : '',
    regPass:    v => !v ? 'Введите пароль' : v.length < 6 ? 'Пароль должен быть не короче 6 символов' : '',
    regConfirm: v => v !== $('regPass').value ? 'Пароли не совпадают' : '',
    regPhone:   v => v && !V.phone(v) ? 'Неверный номер телефона' : '',
    regDob:     v => v && v > dayStr() ? 'Дата рождения не может быть в будущем' : '',
  });
  if (!ok) return;
  DB.add('users', { first: $('regFirst').value.trim(), last: $('regLast').value.trim(), email: $('regEmail').value.trim().toLowerCase(), pass: hash($('regPass').value), phone: $('regPhone').value.trim(), dob: $('regDob').value, role: 'user' });
  location.href = 'login.html?reg=1';
});

/* ---------- Вход ---------- */
const logForm = $('logForm');
if (logForm) {
  if (location.search.includes('reg=1')) $('note').innerHTML = '<div class="info-box green">Аккаунт создан! Теперь войдите.</div>';
  logForm.addEventListener('submit', e => {
    e.preventDefault();
    const users = DB.all('users'); let u;
    const ok = V.run({
      logEmail: v => { if (!v) return 'Введите email'; if (!V.email(v)) return 'Введите корректный email'; u = users.find(x => x.email === v.toLowerCase()); return u ? '' : 'Пользователь с таким email не найден'; },
      logPass:  v => !v ? 'Введите пароль' : (u && u.pass !== hash(v)) ? 'Неверный пароль' : '',
    });
    if (!ok) return;
    LS.set('ola_session', u.id);
    const next = sessionStorage.getItem('ola_next'); sessionStorage.removeItem('ola_next');
    location.href = next || 'index.html';
  });
}

/* ---------- Личный кабинет ---------- */
if ($('pInfo') && !STOP) {
  const cancelRes = id => {
    if (!confirm('Отменить бронь?')) return;
    DB.update('reservations', id, { status: 'cancelled' }); toast('Бронь отменена'); draw();
  };
  window.cancelRes = cancelRes;

  function draw() {
    const u = me();
    const orders = DB.all('orders').filter(o => o.userId === u.id).sort((a, b) => b.id - a.id);
    const rsv = DB.all('reservations').filter(r => r.userId === u.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    $('pAvatar').textContent = (u.first[0] + u.last[0]).toUpperCase();
    $('pInfo').innerHTML = `<h2 class="p-name">${esc(u.first)} ${esc(u.last)}</h2><p>${esc(u.email)}</p><p>📞 ${esc(u.phone || 'не указан')}</p><p>🎂 ${esc(u.dob || 'не указана')}</p>`;
    const spent = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
    $('pKpis').innerHTML = `<div class="stat-card"><div class="stat-num">${orders.length}</div><div class="stat-label">Заказов</div></div><div class="stat-card"><div class="stat-num">${rsv.length}</div><div class="stat-label">Броней</div></div><div class="stat-card"><div class="stat-num">${money(spent)}</div><div class="stat-label">Потрачено</div></div>`;
    $('pOrders').innerHTML = orders.length
      ? `<div class="tw"><table><tr><th>№</th><th>Дата</th><th>Стол</th><th>Сумма</th><th>Статус</th></tr>${orders.map(o => `<tr><td><a href="pages/confirmation.html?type=order&id=${o.id}">#${o.id}</a></td><td>${fmtDate(o.daily_date)}</td><td>${esc(o.table_num)}</td><td>${money(o.total)}</td><td><span class="status-badge status-${o.status}">${ORDER_STATUS[o.status]}</span></td></tr>`).join('')}</table></div>`
      : '<div class="info-box">Заказов пока нет. <a class="lnk" href="pages/menu.html">Открыть меню</a></div>';
    $('pRes').innerHTML = rsv.length
      ? `<div class="tw"><table><tr><th>№</th><th>Дата</th><th>Время</th><th>Гостей</th><th>Статус</th><th></th></tr>${rsv.map(r => `<tr><td><a href="pages/confirmation.html?type=reservation&id=${r.id}">#${r.id}</a></td><td>${fmtDate(r.date)}</td><td>${r.time}</td><td>${r.people_count}</td><td><span class="res-status ${r.status}">${RES_STATUS[r.status]}</span></td><td>${r.status !== 'cancelled' && r.date >= dayStr() ? `<button class="act act-del" onclick="cancelRes(${r.id})">Отменить</button>` : ''}</td></tr>`).join('')}</table></div>`
      : '<div class="info-box">Броней пока нет. <a class="lnk" href="pages/reserve.html">Забронировать стол</a></div>';
  }

  $('editBtn').onclick = () => {
    const u = me();
    $('efFirst').value = u.first; $('efLast').value = u.last; $('efPhone').value = u.phone; $('efDob').value = u.dob;
    $('editForm').classList.toggle('hidden');
  };
  $('editForm').addEventListener('submit', e => {
    e.preventDefault();
    const ok = V.run({
      efFirst: v => v ? '' : 'Введите имя',
      efLast:  v => v ? '' : 'Введите фамилию',
      efPhone: v => v && !V.phone(v) ? 'Неверный номер телефона' : '',
      efDob:   v => v && v > dayStr() ? 'Дата рождения не может быть в будущем' : '',
    });
    if (!ok) return;
    DB.update('users', me().id, { first: $('efFirst').value.trim(), last: $('efLast').value.trim(), phone: $('efPhone').value.trim(), dob: $('efDob').value });
    $('editForm').classList.add('hidden'); toast('Профиль обновлён', 'ok'); draw();
  });
  draw();
}
