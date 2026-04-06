/**
 * menu.js — Клиентская часть
 * Только просмотр меню. Без корзины, заказа, оплаты.
 */

const { createClient } = window.supabase;
const sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

const CATS = [
  { key:'all',      label:'Все' },
  { key:'dishes',   label:'Блюда' },
  { key:'drinks',   label:'Напитки' },
  { key:'desserts', label:'Десерты' },
  { key:'combo',    label:'Комбо' },
  { key:'seasonal', label:'Сезонное' },
];

let menu      = [];
let curCat    = 'all';
let curSearch = '';

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

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${id}`).classList.add('active');
  document.querySelector(`.bnav-item[data-page="${id}"]`)?.classList.add('active');

  if (id === 'menu') renderMenu();
  window.scrollTo(0, 0);
}

/* ── MENU ── */
async function loadMenu() {
  loading(true);
  const { data, error } = await sb
    .from('menu')
    .select('*')
    .eq('visible', true)
    .order('sort_order');
  loading(false);

  if (error) { toast('Ошибка загрузки меню', 'err'); return; }
  menu = data || [];
  renderMenu();
}

function renderMenu() {
  // Tabs
  document.getElementById('catTabs').innerHTML = CATS.map(c =>
    `<button class="cat-btn ${curCat===c.key?'active':''}" onclick="setCat('${c.key}')">${c.label}</button>`
  ).join('');

  const q   = curSearch.toLowerCase().trim();
  const vis = menu.filter(d => {
    if (curCat !== 'all' && d.category !== curCat) return false;
    if (q && !d.name.toLowerCase().includes(q) && !(d.description||'').toLowerCase().includes(q)) return false;
    return true;
  });

  const grid  = document.getElementById('menuGrid');
  const empty = document.getElementById('menuEmpty');

  empty.classList.toggle('show', vis.length === 0);
  grid.style.display = vis.length === 0 ? 'none' : '';

  grid.innerHTML = vis.map(d => `
    <div class="dish-card">
      ${d.photo_url
        ? `<img class="dish-img" src="${d.photo_url}" alt="${d.name}" loading="lazy"/>`
        : `<div class="dish-placeholder">${d.emoji||'🍽'}</div>`}
      <div class="dish-body">
        <span class="dish-cat">${CATS.find(c=>c.key===d.category)?.label||d.category}</span>
        <div class="dish-name">${d.name}</div>
        <div class="dish-desc">${d.description||''}</div>
        <div class="dish-meta">
          <div>
            <div class="dish-price">${d.price.toLocaleString('ru')} ₸</div>
            <div class="dish-weight">${d.weight||''}</div>
          </div>
        </div>
      </div>
    </div>`).join('');
}

function setCat(k) { curCat = k; renderMenu(); }
function filterMenu() { curSearch = document.getElementById('searchInput').value; renderMenu(); }

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  // Имя заведения
  document.querySelectorAll('[data-r-name]').forEach(el => {
    el.textContent = CONFIG.restaurant.name;
  });
  document.querySelectorAll('[data-r-tagline]').forEach(el => {
    el.textContent = CONFIG.restaurant.tagline;
  });

  // Hero фото
  const bg = document.getElementById('heroBg');
  if (bg) bg.style.backgroundImage = `url('${CONFIG.restaurant.heroImage}')`;

  // Контакты
  const ph = document.getElementById('contactPhone');
  if (ph) { ph.href = `tel:${CONFIG.restaurant.phone}`; ph.querySelector('.contact-val').textContent = CONFIG.restaurant.phone; }

  const ig = document.getElementById('contactInsta');
  if (ig) {
    if (CONFIG.restaurant.instagram) {
      ig.href = `https://instagram.com/${CONFIG.restaurant.instagram.replace('@','')}`;
      ig.querySelector('.contact-val').textContent = CONFIG.restaurant.instagram;
    } else {
      ig.style.display = 'none';
    }
  }

  loadMenu();
  document.addEventListener('touchstart', () => {}, { passive: true });
});
