/**
 * admin.js — Чачапури Admin
 * Заказы по дням · Меню (фото + блюда) · Брони · Возвраты · Официанты
 */

const { createClient } = window.supabase;
const sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

const CATS = [
  { key:'dishes',   label:'Блюда' },
  { key:'drinks',   label:'Напитки' },
  { key:'desserts', label:'Десерты' },
  { key:'combo',    label:'Комбо' },
  { key:'seasonal', label:'Сезонное' },
];

let menu       = [];
let adminToken = sessionStorage.getItem('adm_token') || '';

/* ── LOADER / TOAST ── */
function loading(show) { document.getElementById('loader').classList.toggle('show', show); }

let _tt;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = 'toast', 2800);
}

/* ── AUTH ── */
function adminLogin() {
  const pw  = document.getElementById('adminPass').value;
  const btn = document.getElementById('loginBtn');
  if (!pw) return;

  btn.disabled = true; btn.textContent = 'Проверка...';

  if (pw === CONFIG.admin.password) {
    adminToken = `${Date.now()}.ok`;
    sessionStorage.setItem('adm_token', adminToken);
    showPanel();
  } else {
    toast('Неверный пароль', 'err');
    document.getElementById('adminPass').value = '';
  }

  btn.disabled = false; btn.textContent = 'Войти';
}

function adminLogout() {
  adminToken = '';
  sessionStorage.removeItem('adm_token');
  document.getElementById('adminLogin').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  document.getElementById('adminPass').value = '';
}

function isTokenValid() {
  if (!adminToken) return false;
  const ts = parseInt(adminToken.split('.')[0]);
  return !isNaN(ts) && Date.now() - ts < 8 * 3600 * 1000;
}

function showPanel() {
  document.getElementById('adminLogin').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
  switchTab('orders');
}

/* ── TABS ── */
function switchTab(tab) {
  const ALL = ['orders','menu','reservations','returns','waiters'];
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    t.classList.toggle('active', ALL[i] === tab);
  });
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'orders')       loadOrders();
  if (tab === 'menu')         loadMenuAdmin();
  if (tab === 'reservations') loadReservations();
  if (tab === 'returns')      loadReturns();
  if (tab === 'waiters')      loadWaiters();
}

/* ── ORDERS grouped by day ── */
async function loadOrders() {
  const wrap = document.getElementById('ordersWrap');
  wrap.innerHTML = loadingHTML();

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) { wrap.innerHTML = errHTML('Ошибка загрузки заказов'); return; }
  if (!data?.length) { wrap.innerHTML = emptyHTML('Заказов пока нет'); return; }

  const groups = {};
  data.forEach(o => {
    const key = o.daily_date || o.created_at?.split('T')[0] || '—';
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  wrap.innerHTML = Object.entries(groups).map(([date, orders]) => {
    const dayTotal = orders.reduce((s, o) => s + o.total, 0);
    const label = new Date(date + 'T12:00:00').toLocaleDateString('ru', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    const cards = orders.map((o, i) => {
      const items    = Array.isArray(o.items) ? o.items : [];
      const time     = new Date(o.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
      const itemLines = items.map(it => {
        const comm = it.comment ? ` <span style="color:var(--green3);font-size:11px">(${it.comment})</span>` : '';
        return `${it.name} × ${it.qty}${comm}`;
      }).join(' · ');

      return `
      <div class="order-card">
        <div class="order-card-head">
          <div class="order-card-num">#${String(i+1).padStart(3,'0')}</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${o.waiter_name ? `<span style="font-size:11px;color:var(--green3)">👤 ${o.waiter_name}</span>` : ''}
            <div class="order-card-time">${time}</div>
          </div>
        </div>
        <div class="order-table">Стол ${o.table_num}</div>
        <div class="order-items-text">${itemLines}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div class="order-total">${o.total.toLocaleString('ru')} ₸</div>
          <button class="act act-edit" onclick="openReturnModal(${o.id},'${o.table_num}',${o.total})">↩ Возврат</button>
        </div>
        ${o.comment ? `<div class="order-comment-text">${o.comment}</div>` : ''}
      </div>`;
    }).join('');

    return `
    <div class="day-group">
      <div class="day-label">
        <span>${label}</span>
        <span class="day-total">${dayTotal.toLocaleString('ru')} ₸</span>
      </div>
      ${cards}
    </div>`;
  }).join('');
}

/* ── WAITER REPORT ── */
async function loadWaiters() {
  const wrap = document.getElementById('waitersWrap');
  wrap.innerHTML = loadingHTML();

  const { data, error } = await sb
    .from('orders')
    .select('waiter_name, total, daily_date, created_at')
    .order('created_at', { ascending: false });

  if (error) { wrap.innerHTML = errHTML('Ошибка загрузки'); return; }
  if (!data?.length) { wrap.innerHTML = emptyHTML('Заказов пока нет'); return; }

  // Общая выручка по официантам
  const totals = {};
  const byDay  = {};

  data.forEach(o => {
    const name  = o.waiter_name || '—';
    const date  = o.daily_date || o.created_at?.split('T')[0] || '—';
    const key   = `${date}::${name}`;

    totals[name] = (totals[name] || 0) + o.total;
    if (!byDay[date]) byDay[date] = {};
    byDay[date][name] = (byDay[date][name] || 0) + o.total;
  });

  // Общий рейтинг
  const totalCards = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sum], i) => `
    <div class="waiter-card">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="waiter-rank">${i+1}</div>
        <div>
          <div class="waiter-name">${name}</div>
          <div style="font-size:11px;color:var(--muted)">Всё время</div>
        </div>
      </div>
      <div class="waiter-total">${sum.toLocaleString('ru')} ₸</div>
    </div>`).join('');

  // По дням
  const dayCards = Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7) // последние 7 дней
    .map(([date, waiters]) => {
      const label = new Date(date + 'T12:00:00').toLocaleDateString('ru', {
        day: 'numeric', month: 'long'
      });
      const rows = Object.entries(waiters)
        .sort((a, b) => b[1] - a[1])
        .map(([name, sum]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--card2);border-radius:var(--r3);margin-bottom:6px">
          <span style="font-size:13px;color:var(--text)">👤 ${name}</span>
          <span style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:var(--gold2)">${sum.toLocaleString('ru')} ₸</span>
        </div>`).join('');
      return `
      <div class="day-group">
        <div class="day-label"><span>${label}</span></div>
        ${rows}
      </div>`;
    }).join('');

  wrap.innerHTML = `
    <div style="margin-bottom:20px">
      <div class="eyebrow" style="margin-bottom:12px">Общий рейтинг</div>
      ${totalCards}
    </div>
    <div class="eyebrow" style="margin-bottom:12px">По дням (последние 7)</div>
    ${dayCards}`;
}

/* ── RETURN MODAL ── */
function openReturnModal(orderId, tableNum, orderTotal) {
  document.getElementById('returnOrderId').value  = orderId;
  document.getElementById('returnTableNum').value = tableNum;
  document.getElementById('returnMaxAmt').value   = orderTotal;
  document.getElementById('returnAmount').value   = '';
  document.getElementById('returnReason').value   = '';
  document.getElementById('returnItems').value    = '';
  openModal('returnModal');
}

async function submitReturn() {
  const orderId  = document.getElementById('returnOrderId').value;
  const tableNum = document.getElementById('returnTableNum').value;
  const amount   = parseInt(document.getElementById('returnAmount').value);
  const reason   = document.getElementById('returnReason').value.trim();
  const items    = document.getElementById('returnItems').value.trim();
  const max      = parseInt(document.getElementById('returnMaxAmt').value);

  if (!amount || amount <= 0)  { toast('Укажите сумму', 'err'); return; }
  if (amount > max)            { toast(`Максимум ${max.toLocaleString('ru')} ₸`, 'err'); return; }
  if (!reason)                 { toast('Укажите причину', 'err'); return; }

  const { error } = await sb.from('returns').insert([{
    order_id:  orderId || null,
    table_num: tableNum,
    items:     items ? [{ description: items }] : [],
    reason,
    amount,
  }]);

  if (error) { toast('Ошибка сохранения', 'err'); return; }
  closeModal('returnModal');
  toast(`✅ Возврат ${amount.toLocaleString('ru')} ₸ оформлен`, 'ok');
}

/* ── RETURNS LIST ── */
async function loadReturns() {
  const wrap = document.getElementById('returnsWrap');
  wrap.innerHTML = loadingHTML();

  const { data, error } = await sb
    .from('returns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { wrap.innerHTML = errHTML('Ошибка'); return; }
  if (!data?.length) { wrap.innerHTML = emptyHTML('Возвратов нет'); return; }

  wrap.innerHTML = data.map((r, i) => `
    <div class="return-card">
      <div class="return-head">
        <div class="return-num">Возврат #${String(i+1).padStart(3,'0')}</div>
        <div class="return-amount">−${r.amount.toLocaleString('ru')} ₸</div>
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <div>Стол: <strong style="color:var(--text)">${r.table_num}</strong></div>
        <div>Причина: <strong style="color:var(--text)">${r.reason}</strong></div>
        <div>${new Date(r.created_at).toLocaleString('ru')}</div>
      </div>
    </div>`).join('');
}

/* ── MENU ADMIN ── */
async function loadMenuAdmin() {
  loading(true);
  const { data, error } = await sb.from('menu').select('*').order('sort_order');
  loading(false);
  if (error) { toast('Ошибка загрузки', 'err'); return; }
  menu = data || [];
  renderMenuAdmin();
}

function renderMenuAdmin() {
  const list = document.getElementById('menuList');
  if (!menu.length) {
    list.innerHTML = emptyHTML('Блюд нет — нажмите «+ Добавить»');
    return;
  }
  list.innerHTML = menu.map(d => `
    <div class="dish-row">
      ${d.photo_url
        ? `<img class="dish-row-img" src="${d.photo_url}" alt="${d.name}"/>`
        : `<div class="dish-row-emo">${d.emoji||'🍽'}</div>`}
      <div>
        <div class="dish-row-name">${d.name}</div>
        <div class="dish-row-meta">${d.price.toLocaleString('ru')} ₸ · ${d.weight||'—'}</div>
      </div>
      <div class="dish-row-actions">
        <button class="act act-edit" onclick="editDish('${d.id}')">✏️ Ред.</button>
        <button class="act act-toggle ${d.visible?'on':''}" onclick="toggleVis('${d.id}')">${d.visible?'Вкл':'Выкл'}</button>
        <button class="act act-del" onclick="deleteDish('${d.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function toggleVis(id) {
  const d = menu.find(m => m.id === id);
  if (!d) return;
  d.visible = !d.visible;
  const { error } = await sb.from('menu').update({ visible: d.visible }).eq('id', id);
  if (error) { toast('Ошибка', 'err'); d.visible = !d.visible; return; }
  renderMenuAdmin();
  toast(d.visible ? '✓ Включено' : 'Скрыто');
}

async function deleteDish(id) {
  if (!confirm('Удалить позицию?')) return;
  const { error } = await sb.from('menu').delete().eq('id', id);
  if (error) { toast('Ошибка удаления', 'err'); return; }
  menu = menu.filter(d => d.id !== id);
  renderMenuAdmin();
  toast('Удалено');
}

/* ── DISH FORM ── */
function openAddDish() {
  resetDishForm();
  document.getElementById('dishFormTitle').textContent = 'Новое блюдо';
  openModal('dishModal');
}

function editDish(id) {
  const d = menu.find(m => m.id === id);
  if (!d) return;
  document.getElementById('dishFormTitle').textContent = 'Редактировать';
  document.getElementById('editDishId').value          = id;
  document.getElementById('fName').value               = d.name;
  document.getElementById('fDesc').value               = d.description || '';
  document.getElementById('fPrice').value              = d.price;
  document.getElementById('fWeight').value             = d.weight || '';
  document.getElementById('fEmoji').value              = d.emoji || '';
  document.getElementById('fCat').value                = d.category;
  document.getElementById('existingPhoto').value       = d.photo_url || '';
  document.getElementById('photoInput').value          = '';

  const prev = document.getElementById('photoPreview');
  const cont = document.getElementById('photoUploadContent');
  if (d.photo_url) {
    prev.src = d.photo_url; prev.classList.add('show');
    cont.style.display = 'none';
  } else {
    prev.classList.remove('show');
    cont.style.display = '';
  }
  openModal('dishModal');
}

function resetDishForm() {
  document.getElementById('editDishId').value    = '';
  document.getElementById('fName').value         = '';
  document.getElementById('fDesc').value         = '';
  document.getElementById('fPrice').value        = '';
  document.getElementById('fWeight').value       = '';
  document.getElementById('fEmoji').value        = '';
  document.getElementById('fCat').value          = 'dishes';
  document.getElementById('existingPhoto').value = '';
  document.getElementById('photoInput').value    = '';
  document.getElementById('photoPreview').classList.remove('show');
  document.getElementById('photoUploadContent').style.display = '';
}

function onPhotoSelected(input) {
  if (!input.files[0]) return;
  const prev = document.getElementById('photoPreview');
  prev.src = URL.createObjectURL(input.files[0]);
  prev.classList.add('show');
  document.getElementById('photoUploadContent').style.display = 'none';
}

async function uploadPhoto(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `dishes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await sb.storage
    .from('menu-photos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Фото: ${error.message}`);
  return sb.storage.from('menu-photos').getPublicUrl(path).data.publicUrl;
}

async function saveDish() {
  const name   = document.getElementById('fName').value.trim();
  const desc   = document.getElementById('fDesc').value.trim();
  const price  = parseInt(document.getElementById('fPrice').value);
  const weight = document.getElementById('fWeight').value.trim();
  const emoji  = document.getElementById('fEmoji').value.trim();
  const cat    = document.getElementById('fCat').value;
  const editId = document.getElementById('editDishId').value;
  const fileInp= document.getElementById('photoInput');

  if (!name)      { toast('Введите название', 'err'); return; }
  if (!price || price <= 0) { toast('Введите цену', 'err'); return; }

  const btn = document.getElementById('saveDishBtn');
  btn.disabled = true; btn.textContent = 'Сохраняем...';

  try {
    // Загружаем фото если выбрано
    let photo_url = document.getElementById('existingPhoto').value || null;
    if (fileInp.files && fileInp.files[0]) {
      toast('Загружаем фото...', '');
      photo_url = await uploadPhoto(fileInp.files[0]);
    }

    const row = {
      name,
      description: desc,
      price,
      weight,
      emoji,
      category: cat,
      photo_url,
    };

    if (editId) {
      // Обновляем
      const { error } = await sb.from('menu').update(row).eq('id', editId);
      if (error) throw new Error(`Обновление: ${error.message}`);
      const d = menu.find(m => m.id === editId);
      if (d) Object.assign(d, row);
      toast('✅ Блюдо обновлено!', 'ok');
    } else {
      // Добавляем новое
      row.visible    = true;
      row.sort_order = menu.length;
      const { data, error } = await sb.from('menu').insert([row]).select().single();
      if (error) throw new Error(`Добавление: ${error.message}`);
      menu.push(data);
      toast('✅ Блюдо добавлено!', 'ok');
    }

    closeModal('dishModal');
    resetDishForm();
    renderMenuAdmin();

  } catch(err) {
    console.error('saveDish:', err);
    toast(`Ошибка: ${err.message}`, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Сохранить';
  }
}

/* ── RESERVATIONS ── */
async function loadReservations() {
  const wrap = document.getElementById('reservationsWrap');
  wrap.innerHTML = loadingHTML();

  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) { wrap.innerHTML = errHTML('Ошибка'); return; }
  if (!data?.length) { wrap.innerHTML = emptyHTML('Броней пока нет'); return; }

  const groups = {};
  data.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  wrap.innerHTML = Object.entries(groups).map(([date, rsvs]) => {
    const label = new Date(date + 'T12:00:00').toLocaleDateString('ru', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    const cards = rsvs.map(r => `
      <div class="res-card">
        <div class="res-card-head">
          <div class="res-name">${r.name}</div>
          <div class="res-status ${r.status}">${
            r.status==='new' ? 'Новая' : r.status==='confirmed' ? 'Подтверждена' : 'Отменена'
          }</div>
        </div>
        <div class="res-info">
          <div>📞 <strong>${r.phone}</strong></div>
          <div>🕐 <strong>${r.time}</strong> · 👥 <strong>${r.people_count} чел.</strong>${r.table_num?` · Стол <strong>${r.table_num}</strong>`:''}</div>
          ${r.comment ? `<div>💬 ${r.comment}</div>` : ''}
        </div>
        <div class="res-actions">
          ${r.status !== 'confirmed' ? `<button class="act act-edit" onclick="setResStatus(${r.id},'confirmed')">✓ Подтвердить</button>` : ''}
          ${r.status !== 'cancelled' ? `<button class="act act-del" onclick="setResStatus(${r.id},'cancelled')">✕ Отменить</button>` : ''}
        </div>
      </div>`).join('');
    return `
    <div class="day-group">
      <div class="day-label">
        <span>${label}</span>
        <span style="color:var(--muted);font-family:inherit;letter-spacing:0">${rsvs.length} броней</span>
      </div>
      ${cards}
    </div>`;
  }).join('');
}

async function setResStatus(id, status) {
  const { error } = await sb.from('reservations').update({ status }).eq('id', id);
  if (error) { toast('Ошибка', 'err'); return; }
  toast(status === 'confirmed' ? '✓ Подтверждена' : 'Отменена', status==='confirmed'?'ok':'');
  loadReservations();
}

/* ── MODAL ── */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function handleBg(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

/* ── HELPERS ── */
function loadingHTML() {
  return '<div style="padding:32px;text-align:center;color:var(--muted);font-size:12px;letter-spacing:1px">Загрузка...</div>';
}
function emptyHTML(msg) {
  return `<div style="padding:44px 20px;text-align:center;color:var(--muted);font-family:'Cormorant Garamond',serif;font-size:20px">${msg}</div>`;
}
function errHTML(msg) {
  return `<div style="padding:20px;color:var(--err);font-size:13px">${msg}</div>`;
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-r-name]').forEach(el => el.textContent = CONFIG.restaurant.name);

  if (isTokenValid()) showPanel();

  document.addEventListener('touchstart', () => {}, { passive: true });
});
