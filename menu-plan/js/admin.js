/**
 * admin.js — Админская часть
 * Добавление, редактирование, удаление блюд + загрузка фото через Supabase Storage
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

/* ── UTILS ── */
function loading(show) {
  document.getElementById('loader').classList.toggle('show', show);
}

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

  setTimeout(() => {
    if (pw === CONFIG.admin.password) {
      adminToken = `${Date.now()}.ok`;
      sessionStorage.setItem('adm_token', adminToken);
      showPanel();
    } else {
      toast('Неверный пароль', 'err');
      document.getElementById('adminPass').value = '';
    }
    btn.disabled = false; btn.textContent = 'Войти';
  }, 300);
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
  loadMenuAdmin();
}

/* ── MENU ADMIN ── */
async function loadMenuAdmin() {
  loading(true);
  const { data, error } = await sb
    .from('menu')
    .select('*')
    .order('sort_order');
  loading(false);

  if (error) { toast('Ошибка загрузки', 'err'); return; }
  menu = data || [];
  renderMenuAdmin();
}

function renderMenuAdmin() {
  const list = document.getElementById('menuList');

  if (!menu.length) {
    list.innerHTML = `
      <div style="padding:44px 20px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px;opacity:.3">🍽</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--muted)">
          Меню пустое — добавьте первое блюдо
        </div>
      </div>`;
    return;
  }

  list.innerHTML = menu.map(d => `
    <div class="dish-row">
      ${d.photo_url
        ? `<img class="dish-row-img" src="${d.photo_url}" alt="${d.name}"/>`
        : `<div class="dish-row-emo">${d.emoji||'🍽'}</div>`}
      <div>
        <div class="dish-row-name">${d.name}</div>
        <div class="dish-row-meta">${d.price.toLocaleString('ru')} ₸${d.weight ? ' · ' + d.weight : ''}</div>
      </div>
      <div class="dish-row-actions">
        <button class="act act-edit" onclick="editDish('${d.id}')">✏️</button>
        <button class="act act-toggle ${d.visible?'on':''}" onclick="toggleVis('${d.id}')">
          ${d.visible?'Вкл':'Выкл'}
        </button>
        <button class="act act-del" onclick="deleteDish('${d.id}')">🗑</button>
      </div>
    </div>`).join('');
}

async function toggleVis(id) {
  const d = menu.find(m => m.id === id);
  if (!d) return;
  d.visible = !d.visible;

  const { error } = await sb.from('menu').update({ visible: d.visible }).eq('id', id);
  if (error) {
    toast('Ошибка обновления', 'err');
    d.visible = !d.visible;
    return;
  }

  renderMenuAdmin();
  toast(d.visible ? '✓ Блюдо включено' : 'Блюдо скрыто из меню');
}

async function deleteDish(id) {
  if (!confirm('Удалить это блюдо?')) return;

  const { error } = await sb.from('menu').delete().eq('id', id);
  if (error) { toast('Ошибка удаления', 'err'); return; }

  menu = menu.filter(d => d.id !== id);
  renderMenuAdmin();
  toast('Блюдо удалено');
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

  document.getElementById('dishFormTitle').textContent = 'Редактировать блюдо';
  document.getElementById('editDishId').value          = id;
  document.getElementById('fName').value               = d.name;
  document.getElementById('fDesc').value               = d.description || '';
  document.getElementById('fPrice').value              = d.price;
  document.getElementById('fWeight').value             = d.weight || '';
  document.getElementById('fEmoji').value              = d.emoji || '';
  document.getElementById('fCat').value                = d.category || 'dishes';
  document.getElementById('existingPhoto').value       = d.photo_url || '';
  document.getElementById('photoInput').value          = '';

  const prev = document.getElementById('photoPreviewImg');
  const cont = document.getElementById('photoUploadContent');

  if (d.photo_url) {
    prev.src = d.photo_url;
    prev.classList.add('show');
    cont.style.display = 'none';
  } else {
    prev.classList.remove('show');
    cont.style.display = '';
  }

  openModal('dishModal');
}

function resetDishForm() {
  ['editDishId','fName','fDesc','fPrice','fWeight','fEmoji','existingPhoto'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fCat').value = 'dishes';
  document.getElementById('photoInput').value = '';
  document.getElementById('photoPreviewImg').classList.remove('show');
  document.getElementById('photoUploadContent').style.display = '';
}

function onPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;

  const prev = document.getElementById('photoPreviewImg');
  prev.src = URL.createObjectURL(file);
  prev.classList.add('show');
  document.getElementById('photoUploadContent').style.display = 'none';
}

async function uploadPhoto(file) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `dishes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await sb.storage
    .from('menu-photos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Ошибка загрузки фото: ${error.message}`);

  return sb.storage.from('menu-photos').getPublicUrl(path).data.publicUrl;
}

async function saveDish() {
  const name   = document.getElementById('fName').value.trim();
  const desc   = document.getElementById('fDesc').value.trim();
  const price  = parseInt(document.getElementById('fPrice').value);
  const weight = document.getElementById('fWeight').value.trim();
  const emoji  = document.getElementById('fEmoji').value.trim() || '🍽';
  const cat    = document.getElementById('fCat').value;
  const editId = document.getElementById('editDishId').value;
  const fileInp= document.getElementById('photoInput');

  // Валидация
  if (!name)           { toast('Введите название блюда', 'err'); return; }
  if (!price || price <= 0) { toast('Введите корректную цену', 'err'); return; }

  const btn = document.getElementById('saveDishBtn');
  btn.disabled = true;
  btn.textContent = 'Сохраняем...';

  try {
    // Загружаем фото если выбрано новое
    let photo_url = document.getElementById('existingPhoto').value || null;

    if (fileInp.files && fileInp.files[0]) {
      btn.textContent = 'Загружаем фото...';
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
      // Обновляем существующее блюдо
      const { error } = await sb.from('menu').update(row).eq('id', editId);
      if (error) throw new Error(`Ошибка обновления: ${error.message}`);

      // Обновляем в локальном массиве
      const d = menu.find(m => m.id === editId);
      if (d) Object.assign(d, row);

      toast('✅ Блюдо обновлено!', 'ok');
    } else {
      // Добавляем новое блюдо
      row.visible    = true;
      row.sort_order = menu.length;

      const { data, error } = await sb
        .from('menu')
        .insert([row])
        .select()
        .single();

      if (error) throw new Error(`Ошибка добавления: ${error.message}`);

      menu.push(data);
      toast('✅ Блюдо добавлено!', 'ok');
    }

    closeModal('dishModal');
    resetDishForm();
    renderMenuAdmin();

  } catch (err) {
    console.error('saveDish:', err);
    toast(err.message || 'Ошибка сохранения', 'err');
  } finally {
    btn.disabled   = false;
    btn.textContent = 'Сохранить';
  }
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

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-r-name]').forEach(el => {
    el.textContent = CONFIG.restaurant.name;
  });

  if (isTokenValid()) showPanel();

  document.addEventListener('touchstart', () => {}, { passive: true });
});
