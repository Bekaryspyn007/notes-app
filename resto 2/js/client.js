/**
 * client.js — Полный клиентский сайт
 * Меню · Корзина · Заказ · Оплата · Бронь · Контакты
 * Мультиязычность RU/KZ/EN · Вызов официанта · Лайтбокс
 */

const { createClient } = window.supabase;
const sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

/* ── CONSTANTS ── */
const CATS_KEYS = ['all','dishes','drinks','desserts','combo','seasonal'];
const ALLERGEN_LABELS = {
  gluten:'Глютен',dairy:'Молоко',nuts:'Орехи',
  eggs:'Яйца',fish:'Рыба',soy:'Соя',
};
const TIME_SLOTS = [
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00',
];

/* ── STATE ── */
let menu      = [];
let cart      = loadCart();
let curCat    = 'all';
let curSearch = '';
let selTime   = '';
let lang      = localStorage.getItem('resto_lang') || CONFIG.defaultLang || 'ru';

/* ── HELPERS ── */
const t  = key => I18N[lang]?.[key] || I18N.ru[key] || key;
const ld = () => document.getElementById('loader');

function loading(show) { ld()?.classList.toggle('show', show); }

let _tt;
function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show ${type}`;
  clearTimeout(_tt); _tt = setTimeout(() => el.className='toast', 2800);
}

function loadCart() {
  try { return JSON.parse(localStorage.getItem('resto_cart')||'[]'); } catch { return []; }
}
function saveCart() {
  localStorage.setItem('resto_cart', JSON.stringify(cart));
  updateBadge();
}
function updateBadge() {
  const n = cart.reduce((s,c)=>s+c.qty, 0);
  const b = document.getElementById('cartBadge');
  if(b){ b.textContent=n; b.classList.toggle('show', n>0); }
}

/* ── LANGUAGE ── */
function setLang(l) {
  lang = l;
  localStorage.setItem('resto_lang', l);
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === l);
  });
  applyTranslations();
  renderMenu();
}

function applyTranslations() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.dataset.t;
    if(key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-t-ph]').forEach(el => {
    el.placeholder = t(el.dataset.tPh);
  });
  // Hero
  const tagEl = document.getElementById('heroTagline');
  if(tagEl) tagEl.textContent = CONFIG.restaurant[`tagline_${lang}`] || CONFIG.restaurant.tagline;
}

/* ── NAVIGATION ── */
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${id}`)?.classList.add('active');
  document.querySelector(`.bnav-item[data-page="${id}"]`)?.classList.add('active');

  if(id==='menu')    renderMenu();
  if(id==='cart')    renderCart();
  if(id==='order')   renderOrderPage();
  if(id==='reserve') initReserve();
  window.scrollTo(0,0);
}

/* ── TELEGRAM ── */
async function sendTG(text) {
  const {token, chatId} = CONFIG.telegram;
  if(!token || !chatId || token.includes('PASTE')) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id:chatId, text, parse_mode:'Markdown'}),
    });
  } catch(e) { console.warn('TG:', e); }
}

/* ── CALL WAITER ── */
async function callWaiter() {
  const tableNum = prompt('Введите номер вашего стола:');
  if(!tableNum?.trim()) return;

  try {
    await sb.from('waiter_calls').insert([{
      table_num: tableNum.trim(),
      message:   'Вызов официанта',
    }]);

    await sendTG(
      `🔔 *Вызов официанта!*\n\n` +
      `🪑 Стол: *${tableNum.trim()}*\n` +
      `🕐 ${new Date().toLocaleTimeString('ru')}\n` +
      `📍 ${CONFIG.restaurant.name}`
    );

    toast(t('callWaiterMsg'), 'ok');
  } catch(e) {
    console.error(e);
    toast('Ошибка. Попробуйте ещё раз.', 'err');
  }
}

/* ── MENU ── */
async function loadMenu() {
  loading(true);
  const {data, error} = await sb
    .from('menu').select('*').order('sort_order');
  loading(false);
  if(error) { toast('Ошибка загрузки меню','err'); return; }
  menu = data || [];
  renderMenu();
  updateBadge();
}

function renderMenu() {
  // Category tabs
  document.getElementById('catTabs').innerHTML = CATS_KEYS.map(k =>
    `<button class="cat-btn ${curCat===k?'active':''}" onclick="setCat('${k}')">${t(k)}</button>`
  ).join('');

  const q   = curSearch.toLowerCase().trim();
  const vis = menu.filter(d => {
    if(!d.visible) return false;
    if(curCat!=='all' && d.category!==curCat) return false;
    const name = (d[`name_${lang}`]||d.name_ru||'').toLowerCase();
    const desc = (d[`desc_${lang}`]||d.desc_ru||'').toLowerCase();
    if(q && !name.includes(q) && !desc.includes(q)) return false;
    return true;
  });

  const grid  = document.getElementById('menuGrid');
  const empty = document.getElementById('menuEmpty');
  empty.classList.toggle('show', vis.length===0);
  grid.style.display = vis.length===0 ? 'none' : '';

  grid.innerHTML = vis.map(d => {
    const name = d[`name_${lang}`]||d.name_ru||'';
    const desc = d[`desc_${lang}`]||d.desc_ru||'';
    const inCart = cart.find(c=>c.id===d.id);

    const badges = [
      d.is_popular && `<span class="badge badge-popular">🔥 ${t('popular')}</span>`,
      d.is_new     && `<span class="badge badge-new">✨ ${t('isNew')}</span>`,
      d.stop_list  && `<span class="badge badge-stop">⛔ ${t('stopList')}</span>`,
    ].filter(Boolean).join('');

    const allergens = (d.allergens||[]).map(a =>
      `<span class="allergen-tag">${ALLERGEN_LABELS[a]||a}</span>`
    ).join('');

    const cookTime = d.cook_time ? `<div class="dish-cook">⏱ ${d.cook_time} ${t('cookTime')}</div>` : '';

    const imgHtml = d.photo_url
      ? `<img class="dish-img" src="${d.photo_url}" alt="${name}" loading="lazy" onclick="event.stopPropagation();openLightbox('${d.photo_url}')"/>`
      : `<div class="dish-placeholder">${d.emoji||'🍽'}</div>`;

    const addBtn = d.stop_list
      ? `<div class="dish-add" style="background:var(--muted);cursor:not-allowed">✕</div>`
      : `<div class="dish-add ${inCart?'in-cart':''}" onclick="event.stopPropagation();addToCart('${d.id}')">+</div>`;

    return `
    <div class="dish-card ${d.stop_list?'stop-listed':''}" onclick="addToCart('${d.id}')">
      ${imgHtml}
      <div class="dish-badges">${badges}</div>
      ${inCart ? `<span class="in-cart-badge show">× ${inCart.qty}</span>` : '<span class="in-cart-badge"></span>'}
      <div class="dish-body">
        <span class="dish-cat">${t(d.category)||d.category}</span>
        <div class="dish-name">${name}</div>
        <div class="dish-desc">${desc}</div>
        ${allergens ? `<div class="dish-allergens">${allergens}</div>` : ''}
        <div class="dish-meta">
          <div>
            <div class="dish-price">${d.price.toLocaleString('ru')} ₸</div>
            <div class="dish-weight">${d.weight||''}</div>
            ${cookTime}
          </div>
          ${addBtn}
        </div>
      </div>
    </div>`;
  }).join('');
}

function setCat(k) { curCat=k; renderMenu(); }
function filterMenu() { curSearch=document.getElementById('searchInput').value; renderMenu(); }

/* ── LIGHTBOX ── */
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightboxImg').src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── CART ── */
function addToCart(id) {
  const d = menu.find(m=>m.id===id);
  if(!d || d.stop_list) return;
  const ex = cart.find(c=>c.id===id);
  if(ex) ex.qty++;
  else cart.push({id, qty:1, comment:''});
  saveCart();
  const name = d[`name_${lang}`]||d.name_ru||d.name||'';
  toast(`${d.emoji||'✓'} ${name}`, 'ok');
  // Обновляем badge кнопки
  renderMenu();
}

function changeQty(id, delta) {
  const i = cart.findIndex(c=>c.id===id);
  if(i<0) return;
  cart[i].qty += delta;
  if(cart[i].qty<=0) cart.splice(i,1);
  saveCart(); renderCart();
}

function updateDishComment(id, val) {
  const c = cart.find(c=>c.id===id);
  if(c) c.comment=val;
  localStorage.setItem('resto_cart', JSON.stringify(cart));
}

function clearCart() { cart=[]; saveCart(); renderCart(); }

function cartTotal() {
  return cart.reduce((s,c)=>{
    const d=menu.find(m=>m.id===c.id);
    return s+(d?d.price*c.qty:0);
  },0);
}

function renderCart() {
  const wrap = document.getElementById('cartContent');
  document.getElementById('clearCartBtn').style.display = cart.length?'':'none';

  if(!cart.length) {
    wrap.innerHTML=`
      <div class="cart-empty">
        <div style="font-size:54px;opacity:.18">🛒</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:22px;color:var(--muted)">${t('cartEmpty')}</div>
        <div style="font-size:12px;color:var(--muted);opacity:.6;margin-top:5px">${t('addSomething')}</div>
        <button class="btn btn-primary" style="margin-top:18px" onclick="goPage('menu')">${t('openMenu')}</button>
      </div>`; return;
  }

  const items = cart.map(c=>{
    const d=menu.find(m=>m.id===c.id); if(!d) return '';
    const name = d[`name_${lang}`]||d.name_ru||'';
    const img = d.photo_url
      ? `<img class="cart-img" src="${d.photo_url}" alt="${name}"/>`
      : `<div class="cart-placeholder">${d.emoji||'🍽'}</div>`;
    return `
    <div class="cart-item">
      <div class="cart-item-top">
        ${img}
        <div>
          <div class="cart-item-name">${name}</div>
          <div class="cart-item-price">${(d.price*c.qty).toLocaleString('ru')} ₸</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${d.id}',-1)">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="changeQty('${d.id}',1)">+</button>
        </div>
      </div>
      <div class="dish-comment-wrap">
        <input class="dish-comment-input" type="text"
          placeholder="${t('dishComment')}"
          value="${c.comment||''}"
          oninput="updateDishComment('${d.id}',this.value)"/>
      </div>
    </div>`;
  }).join('');

  wrap.innerHTML=`
    <div class="cart-items">${items}</div>
    <div class="divider"></div>
    <div class="total-row">
      <span class="total-label">${t('total')}</span>
      <span class="total-val">${cartTotal().toLocaleString('ru')} ₸</span>
    </div>
    <div class="total-row">
      <span class="total-label">${t('items')}</span>
      <span style="font-size:13px;color:var(--muted)">${cart.reduce((s,c)=>s+c.qty,0)}</span>
    </div>
    <button class="btn btn-primary btn-full" onclick="goPage('order')">${t('sendOrder')} →</button>
    <button class="btn-ghost" onclick="goPage('menu')">${t('continueMenu')}</button>`;
}

/* ── ORDER ── */
function renderOrderPage() {
  const el = document.getElementById('orderSummary');
  if(!cart.length) {
    el.innerHTML=`<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">${t('cartEmpty')}</div>`;
  } else {
    const rows = cart.map(c=>{
      const d=menu.find(m=>m.id===c.id); if(!d) return '';
      const name = d[`name_${lang}`]||d.name_ru||'';
      const comm = c.comment ? `<span style="font-size:10px;color:var(--green3);margin-left:4px">(${c.comment})</span>` : '';
      return `<div class="order-sum-row"><span>${name} × ${c.qty}${comm}</span><span>${(d.price*c.qty).toLocaleString('ru')} ₸</span></div>`;
    }).join('');
    el.innerHTML=`
      <div class="order-sum-label">${t('items')}</div>
      ${rows}
      <div class="order-sum-row total"><span>${t('total')}</span><span>${cartTotal().toLocaleString('ru')} ₸</span></div>`;
  }

  // Официанты
  const grid = document.getElementById('waiterGrid');
  if(grid) {
    grid.innerHTML = CONFIG.waiters.map(w=>
      `<button type="button" class="waiter-btn" onclick="selectWaiter('${w}',this)">${w}</button>`
    ).join('');
  }
}

function selectWaiter(name, el) {
  document.querySelectorAll('.waiter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('waiterVal').value = name;
}

async function submitOrder() {
  const table   = document.getElementById('tableNum').value.trim();
  const comment = document.getElementById('orderComment').value.trim();
  const waiter  = document.getElementById('waiterVal').value;

  if(!cart.length) { toast(t('cartEmpty'),'err'); return; }
  if(!table)       { toast(t('tableNum')+' ?','err'); return; }
  if(!waiter)      { toast(t('chooseWaiter'),'err'); return; }

  const btn=document.getElementById('submitOrderBtn');
  btn.disabled=true; btn.textContent='...';

  const items = cart.map(c=>{
    const d=menu.find(m=>m.id===c.id);
    return {id:c.id, name:d?.name_ru||'?', qty:c.qty, price:d?.price||0, comment:c.comment||''};
  });
  const total = cartTotal();

  try {
    const {error} = await sb.from('orders').insert([{
      table_num:table, items, total, comment,
      waiter_name:waiter,
      daily_date: new Date().toISOString().split('T')[0],
    }]);
    if(error) throw error;

    const lines = items.map(i=>{
      const comm = i.comment?` _(${i.comment})_`:'';
      return `  • ${i.name} × ${i.qty} — ${(i.price*i.qty).toLocaleString('ru')} ₸${comm}`;
    }).join('\n');

    await sendTG(
      `🍽 *Новый заказ — ${CONFIG.restaurant.name}*\n\n`+
      `🪑 Стол: *${table}*  👤 Официант: *${waiter}*\n`+
      `🕐 ${new Date().toLocaleTimeString('ru')}\n\n${lines}\n\n`+
      `━━━━━━━━━━━\n💰 *${total.toLocaleString('ru')} ₸*`+
      (comment?`\n\n💬 _${comment}_`:'')
    );

    cart=[]; saveCart(); renderCart();
    document.getElementById('tableNum').value='';
    document.getElementById('orderComment').value='';
    document.getElementById('waiterVal').value='';
    showPaymentPage(total);

  } catch(err) {
    console.error(err); toast('Ошибка. Попробуйте ещё раз.','err');
  } finally {
    btn.disabled=false; btn.textContent=t('sendOrder');
  }
}

/* ── PAYMENT PAGE ── */
function showPaymentPage(total) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-payment').classList.add('active');
  document.getElementById('payTotal').textContent = `${total.toLocaleString('ru')} ₸`;

  document.getElementById('payGrid').innerHTML = CONFIG.payments.map(p=>`
    <a href="${p.link}" target="_blank" class="pay-btn" style="--pay-color:${p.color}">
      <div class="pay-icon">${p.icon}</div>
      <div class="pay-name">${p.name}</div>
      <div class="pay-arrow">→</div>
    </a>`).join('');

  window.scrollTo(0,0);
}

/* ── RESERVATION ── */
function initReserve() {
  const inp=document.getElementById('resDate');
  const today=new Date().toISOString().split('T')[0];
  inp.min=today; if(!inp.value) inp.value=today;
  renderTimeSlots();
}

function renderTimeSlots() {
  document.getElementById('timeSlots').innerHTML = TIME_SLOTS.map(tm=>
    `<div class="time-slot ${selTime===tm?'active':''}" onclick="selectTime('${tm}')">${tm}</div>`
  ).join('');
}

function selectTime(tm) {
  selTime=tm; renderTimeSlots();
  document.getElementById('resTimeView').value=tm;
}

async function submitReservation() {
  const name    = document.getElementById('resName').value.trim();
  const phone   = document.getElementById('resPhone').value.trim();
  const date    = document.getElementById('resDate').value;
  const people  = document.getElementById('resPeople').value;
  const tableN  = document.getElementById('resTable').value.trim();
  const comment = document.getElementById('resComment').value.trim();

  if(!name)    { toast(t('resName')+' ?','err');   return; }
  if(!phone)   { toast(t('resPhone')+' ?','err');  return; }
  if(!date)    { toast(t('resDate')+' ?','err');   return; }
  if(!selTime) { toast(t('resDate')+' время?','err'); return; }
  if(!people)  { toast(t('resPeople')+' ?','err'); return; }

  const btn=document.getElementById('submitResBtn');
  btn.disabled=true; btn.textContent='...';

  try {
    const {error}=await sb.from('reservations').insert([{
      name, phone, date, time:selTime,
      people_count:parseInt(people), table_num:tableN, comment,
    }]);
    if(error) throw error;

    const dateStr=new Date(date+'T12:00:00').toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});
    await sendTG(
      `📅 *Новая бронь — ${CONFIG.restaurant.name}*\n\n`+
      `👤 *${name}*\n📞 ${phone}\n`+
      `📆 ${dateStr} в *${selTime}*\n`+
      `👥 Гостей: *${people}*`+
      (tableN?`\n🪑 Стол: ${tableN}`:'')+
      (comment?`\n\n💬 _${comment}_`:'')
    );

    ['resName','resPhone','resComment','resTable'].forEach(id=>{document.getElementById(id).value='';});
    document.getElementById('resPeople').value='2';
    selTime=''; renderTimeSlots();
    toast(t('resSuccess'),'ok');
    setTimeout(()=>goPage('home'),2000);

  } catch(err) {
    console.error(err); toast('Ошибка. Попробуйте ещё раз.','err');
  } finally {
    btn.disabled=false; btn.textContent=t('resSubmit');
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  // Имя ресторана
  document.querySelectorAll('[data-r-name]').forEach(el=>el.textContent=CONFIG.restaurant.name);

  // Hero фото
  const bg=document.getElementById('heroBg');
  if(bg) bg.style.backgroundImage=`url('${CONFIG.restaurant.heroImage}')`;

  // Контакты
  const ph=document.getElementById('contactPhone');
  if(ph){ph.href=`tel:${CONFIG.restaurant.phone}`;ph.querySelector('.contact-val').textContent=CONFIG.restaurant.phone;}
  const ig=document.getElementById('contactInsta');
  if(ig&&CONFIG.restaurant.instagram){ig.href=`https://instagram.com/${CONFIG.restaurant.instagram.replace('@','')}`;ig.querySelector('.contact-val').textContent=CONFIG.restaurant.instagram;}else if(ig){ig.style.display='none';}

  // Язык
  setLang(lang);
  applyTranslations();

  loadMenu();
  document.addEventListener('touchstart',()=>{},{passive:true});
});
