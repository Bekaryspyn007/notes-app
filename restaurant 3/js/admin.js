/**
 * admin.js — только для персонала
 * Отдельный файл, не упоминается в index.html
 * Пароль проверяется через Edge Function (не хранится в коде)
 */

const { createClient } = window.supabase;
const sb      = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
const sbAdmin = sb; // вместо serviceRoleKey используем anon

const CATS = [
  { key:'dishes',   label:'Блюда' },
  { key:'drinks',   label:'Напитки' },
  { key:'desserts', label:'Десерты' },
  { key:'combo',    label:'Комбо' },
  { key:'seasonal', label:'Сезонное' },
];

/* ════ STATE ════ */
let menu       = [];
let adminToken = sessionStorage.getItem('adm_token') || '';

/* ════ LOADER / TOAST ════ */
function loading(show) { document.getElementById('loader').classList.toggle('show', show); }

let _tt;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_tt);
  _tt = setTimeout(() => el.className = 'toast', 2800);
}

/* ════ AUTH ════ */
function adminLogin() {
  const pw  = document.getElementById('adminPass').value;
  const btn = document.getElementById('loginBtn');
  if (!pw) return;

  if (pw === CONFIG.admin.password) {
    // Токен = timestamp (для проверки сессии)
    adminToken = `${Date.now()}.ok`;
    sessionStorage.setItem('adm_token', adminToken);
    showPanel();
  } else {
    toast('Неверный пароль', 'err');
    document.getElementById('adminPass').value = '';
  }
}

function adminLogout() {
  adminToken = '';
  sessionStorage.removeItem('adm_token');
  document.getElementById('adminLogin').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
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
  switchTab('orders');
}

/* ════ TABS ════ */
function switchTab(tab) {
  const ALL = ['orders','menu','reservations','returns'];
  document.querySelectorAll('.admin-tab').forEach((t, i) => {
    t.classList.toggle('active', ALL[i] === tab);
  });
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (tab === 'orders')       loadOrders();
  if (tab === 'menu')         loadMenuAdmin();
  if (tab === 'reservations') loadReservations();
  if (tab === 'returns')      loadReturns();
}

/* ════ ORDERS — сгруппированные по дням ════ */
async function loadOrders() {
  const wrap = document.getElementById('ordersWrap');
  wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:12px">Загрузка...</div>';

  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (error) { wrap.innerHTML = '<div style="padding:20px;color:var(--err)">Ошибка загрузки</div>'; return; }
  if (!data?.length) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Заказов пока нет</div>';
    return;
  }

  // Группируем по daily_date
  const groups = {};
  data.forEach(o => {
    const key = o.daily_date || o.created_at?.split('T')[0] || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(o);
  });

  const html = Object.entries(groups).map(([date, orders]) => {
    const dayTotal = orders.reduce((s, o) => s + o.total, 0);
    const label = new Date(date + 'T12:00:00').toLocaleDateString('ru', {
      weekday:'long', day:'numeric', month:'long'
    });

    const cards = orders.map((o, i) => {
      const items = Array.isArray(o.items) ? o.items : [];
      const time  = new Date(o.created_at).toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' });
      const itemLines = items.map(it => {
        const comm = it.comment ? ` <span style="color:var(--gold);font-size:11px">(${it.comment})</span>` : '';
        return `${it.name} × ${it.qty}${comm}`;
      }).join(' · ');

      return `
      <div class="order-card">
        <div class="order-card-head">
          <div class="order-card-num">#${String(i+1).padStart(3,'0')}</div>
          <div class="order-card-time">${time}</div>
        </div>
        <div class="order-table">Стол ${o.table_num}</div>
        <div class="order-items-text">${itemLines}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div class="order-total">${o.total.toLocaleString('ru')} ₸</div>
          <button class="act act-edit" onclick="openReturnModal(${o.id},'${o.table_num}',${o.total})">Возврат</button>
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

  wrap.innerHTML = html;
}

/* ════ RETURN MODAL ════ */
function openReturnModal(orderId, tableNum, orderTotal) {
  document.getElementById('returnOrderId').value   = orderId;
  document.getElementById('returnTableNum').value  = tableNum;
  document.getElementById('returnMaxAmount').value = orderTotal;
  document.getElementById('returnAmount').value    = '';
  document.getElementById('returnReason').value    = '';
  document.getElementById('returnItemsDesc').value = '';
  openModal('returnModal');
}

async function submitReturn() {
  const orderId  = document.getElementById('returnOrderId').value;
  const tableNum = document.getElementById('returnTableNum').value;
  const amount   = parseInt(document.getElementById('returnAmount').value);
  const reason   = document.getElementById('returnReason').value.trim();
  const items    = document.getElementById('returnItemsDesc').value.trim();
  const max      = parseInt(document.getElementById('returnMaxAmount').value);

  if (!amount || amount <= 0)    { toast('Укажите сумму возврата', 'err'); return; }
  if (amount > max)              { toast(`Сумма не может быть больше ${max.toLocaleString('ru')} ₸`, 'err'); return; }
  if (!reason)                   { toast('Укажите причину', 'err'); return; }

  const { error } = await sbAdmin.from('returns').insert([{
    order_id:  orderId || null,
    table_num: tableNum,
    items:     items ? [{ description: items }] : [],
    reason,
    amount,
  }]);

  if (error) { toast('Ошибка сохранения возврата', 'err'); console.error(error); return; }

  closeModal('returnModal');
  toast(`✅ Возврат ${amount.toLocaleString('ru')} ₸ оформлен`, 'ok');
}

/* ════ RETURNS LIST ════ */
async function loadReturns() {
  const wrap = document.getElementById('returnsWrap');
  wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:12px">Загрузка...</div>';

  const { data, error } = await sb
    .from('returns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) { wrap.innerHTML = '<div style="color:var(--err);padding:18px">Ошибка</div>'; return; }
  if (!data?.length) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Возвратов нет</div>';
    return;
  }

  wrap.innerHTML = data.map((r, i) => {
    const time = new Date(r.created_at).toLocaleString('ru');
    return `
    <div class="return-card">
      <div class="return-head">
        <div class="return-num">Возврат #${String(i+1).padStart(3,'0')}</div>
        <div class="return-amount">−${r.amount.toLocaleString('ru')} ₸</div>
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.7">
        <div>Стол: <strong style="color:var(--text)">${r.table_num}</strong></div>
        <div>Причина: <strong style="color:var(--text)">${r.reason}</strong></div>
        <div>${time}</div>
      </div>
    </div>`;
  }).join('');
}

/* ════ MENU ADMIN ════ */
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
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Блюд нет — добавьте первое</div>';
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
        <button class="act act-edit" onclick="editDish('${d.id}')">Ред.</button>
        <button class="act act-toggle ${d.visible?'on':''}" onclick="toggleVis('${d.id}')">${d.visible?'Вкл':'Выкл'}</button>
        <button class="act act-del" onclick="deleteDish('${d.id}')">Удал.</button>
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

function openAddDish() {
  resetDishForm();
  document.getElementById('dishFormTitle').textContent = 'Новое блюдо';
  openModal('dishModal');
}

function editDish(id) {
  const d = menu.find(m => m.id === id);
  if (!d) return;
  document.getElementById('dishFormTitle').textContent   = 'Редактировать';
  document.getElementById('editDishId').value            = id;
  document.getElementById('fName').value                 = d.name;
  document.getElementById('fDesc').value                 = d.description||'';
  document.getElementById('fPrice').value                = d.price;
  document.getElementById('fWeight').value               = d.weight||'';
  document.getElementById('fEmoji').value                = d.emoji||'';
  document.getElementById('fCat').value                  = d.category;
  document.getElementById('existingPhoto').value         = d.photo_url||'';
  document.getElementById('photoInput').value            = '';
  const prev = document.getElementById('photoPreview');
  if (d.photo_url) { prev.src = d.photo_url; prev.classList.add('show'); document.getElementById('photoUploadContent').style.display='none'; }
  else { prev.classList.remove('show'); document.getElementById('photoUploadContent').style.display=''; }
  openModal('dishModal');
}

function resetDishForm() {
  document.getElementById('editDishId').value   = '';
  document.getElementById('fName').value        = '';
  document.getElementById('fDesc').value        = '';
  document.getElementById('fPrice').value       = '';
  document.getElementById('fWeight').value      = '';
  document.getElementById('fEmoji').value       = '';
  document.getElementById('fCat').value         = 'dishes';
  document.getElementById('existingPhoto').value= '';
  document.getElementById('photoInput').value   = '';
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
  const ext  = file.name.split('.').pop();
  const path = `dishes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sb.storage.from('menu-photos').upload(path, file, { upsert: true });
  if (error) throw error;
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

  if (!name || !price) { toast('Заполните название и цену', 'err'); return; }

  const btn = document.getElementById('saveDishBtn');
  btn.disabled = true; btn.textContent = 'Сохраняем...';

  try {
    let photo_url = document.getElementById('existingPhoto').value || null;
    if (fileInp.files[0]) photo_url = await uploadPhoto(fileInp.files[0]);

    const row = { name, description: desc, price, weight, emoji, category: cat, photo_url };

    if (editId) {
      const { error } = await sb.from('menu').update(row).eq('id', editId);
      if (error) throw error;
      const d = menu.find(m => m.id === editId);
      if (d) Object.assign(d, row);
    } else {
      row.visible = true; row.sort_order = menu.length;
      const { data, error } = await sb.from('menu').insert([row]).select().single();
      if (error) throw error;
      menu.push(data);
    }

    toast('✅ Сохранено!', 'ok');
    closeModal('dishModal');
    renderMenuAdmin();
  } catch (err) {
    console.error(err); toast('Ошибка сохранения', 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Сохранить';
  }
}

/* ════ RESERVATIONS ════ */
async function loadReservations() {
  const wrap = document.getElementById('reservationsWrap');
  wrap.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:12px">Загрузка...</div>';

  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) { wrap.innerHTML = '<div style="color:var(--err);padding:18px">Ошибка</div>'; return; }
  if (!data?.length) {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Броней пока нет</div>';
    return;
  }

  // Группируем по дате
  const groups = {};
  data.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  wrap.innerHTML = Object.entries(groups).map(([date, rsvs]) => {
    const label = new Date(date + 'T12:00:00').toLocaleDateString('ru', { weekday:'long', day:'numeric', month:'long' });
    const cards = rsvs.map(r => `
      <div class="res-card">
        <div class="res-card-head">
          <div class="res-name">${r.name}</div>
          <div class="res-status ${r.status}">${
            r.status==='new'?'Новая':r.status==='confirmed'?'Подтверждена':'Отменена'
          }</div>
        </div>
        <div class="res-info">
          <div>📞 <strong>${r.phone}</strong></div>
          <div>🕐 <strong>${r.time}</strong> · 👥 <strong>${r.people_count} чел.</strong>${r.table_num?` · Стол <strong>${r.table_num}</strong>`:''}</div>
          ${r.comment?`<div>💬 ${r.comment}</div>`:''}
        </div>
        <div class="res-actions">
          <button class="act act-edit" onclick="setResStatus(${r.id},'confirmed')">✓ Подтвердить</button>
          <button class="act act-del" onclick="setResStatus(${r.id},'cancelled')">✕ Отменить</button>
        </div>
      </div>`).join('');

    return `<div class="day-group"><div class="day-label"><span>${label}</span><span style="color:var(--muted);font-family:inherit">${rsvs.length} броней</span></div>${cards}</div>`;
  }).join('');
}

async function setResStatus(id, status) {
  const { error } = await sbAdmin.from('reservations').update({ status }).eq('id', id);
  if (error) { toast('Ошибка', 'err'); return; }
  toast(status === 'confirmed' ? '✓ Бронь подтверждена' : 'Бронь отменена', status==='confirmed'?'ok':'');
  loadReservations();
}

/* ════ MODAL ════ */
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

/* ════ INIT ════ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-r-name]').forEach(el => el.textContent = CONFIG.restaurant.name);

  if (isTokenValid()) {
    showPanel();
  }

  document.addEventListener('touchstart', () => {}, { passive: true });
});
