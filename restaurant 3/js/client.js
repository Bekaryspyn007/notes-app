/**
 * client.js — клиентский сайт
 * Supabase + Telegram напрямую. Edge Functions не нужны.
 */

const { createClient } = window.supabase;
const sb      = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
const sbAdmin = sb; // вместо serviceRoleKey используем anon

const CATS = [
  { key:'all',      label:'Все' },
  { key:'dishes',   label:'Блюда' },
  { key:'drinks',   label:'Напитки' },
  { key:'desserts', label:'Десерты' },
  { key:'combo',    label:'Комбо' },
  { key:'seasonal', label:'Сезонное' },
];

const TIME_SLOTS = [
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30',
  '19:00','19:30','20:00','20:30','21:00',
];

let menu     = [];
let cart     = loadCart();
let curCat   = 'all';
let curSearch= '';
let selTime  = '';

function loadCart() {
  try { return JSON.parse(localStorage.getItem('r_cart') || '[]'); } catch { return []; }
}
function saveCart() {
  localStorage.setItem('r_cart', JSON.stringify(cart));
  updateBadge();
}
function loading(show) { document.getElementById('loader').classList.toggle('show', show); }

let _tt;
function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `toast show ${type}`;
  clearTimeout(_tt); _tt = setTimeout(() => el.className='toast', 2800);
}

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${id}`).classList.add('active');
  document.querySelector(`.bnav-item[data-page="${id}"]`)?.classList.add('active');
  if (id==='menu')    renderMenu();
  if (id==='cart')    renderCart();
  if (id==='order')   renderOrderSummary();
  if (id==='reserve') initReserve();
  window.scrollTo(0,0);
}

async function sendTelegram(text) {
  const { token, chatId } = CONFIG.telegram;
  if (!token || !chatId || token.includes('PASTE')) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: chatId, text, parse_mode:'Markdown' }),
    });
  } catch(e) { console.warn('TG:', e); }
}

async function loadMenu() {
  loading(true);
  const { data, error } = await sb.from('menu').select('*').order('sort_order');
  loading(false);
  if (error) { toast('Ошибка загрузки меню','err'); return; }
  menu = data || [];
  renderMenu(); updateBadge();
}

function renderMenu() {
  document.getElementById('catTabs').innerHTML = CATS.map(c =>
    `<button class="cat-btn ${curCat===c.key?'active':''}" onclick="setCat('${c.key}')">${c.label}</button>`
  ).join('');

  const q = curSearch.toLowerCase().trim();
  const vis = menu.filter(d => {
    if (!d.visible) return false;
    if (curCat!=='all' && d.category!==curCat) return false;
    if (q && !d.name.toLowerCase().includes(q) && !(d.description||'').toLowerCase().includes(q)) return false;
    return true;
  });

  const grid=document.getElementById('menuGrid'), empty=document.getElementById('menuEmpty');
  empty.classList.toggle('show', vis.length===0);
  grid.style.display = vis.length===0 ? 'none' : '';

  grid.innerHTML = vis.map(d => {
    const inCart = cart.find(c=>c.id===d.id);
    return `
    <div class="dish-card" onclick="addToCart('${d.id}')">
      ${d.photo_url ? `<img class="dish-img" src="${d.photo_url}" alt="${d.name}" loading="lazy"/>` : `<div class="dish-placeholder">${d.emoji||'🍽'}</div>`}
      ${inCart ? `<span class="in-cart-badge show">× ${inCart.qty}</span>` : '<span class="in-cart-badge"></span>'}
      <div class="dish-body">
        <span class="dish-cat">${CATS.find(c=>c.key===d.category)?.label||d.category}</span>
        <div class="dish-name">${d.name}</div>
        <div class="dish-desc">${d.description||''}</div>
        <div class="dish-meta">
          <div><div class="dish-price">${d.price.toLocaleString('ru')} ₸</div><div class="dish-weight">${d.weight||''}</div></div>
          <div class="dish-add" onclick="event.stopPropagation();addToCart('${d.id}')">+</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function setCat(k) { curCat=k; renderMenu(); }
function filterMenu() { curSearch=document.getElementById('searchInput').value; renderMenu(); }

function addToCart(id) {
  const dish=menu.find(d=>d.id===id); if(!dish) return;
  const ex=cart.find(c=>c.id===id);
  if(ex) ex.qty++; else cart.push({id, qty:1, comment:''});
  saveCart(); toast(`${dish.emoji||'✓'} ${dish.name} добавлено`, 'ok');
}

function changeQty(id, delta) {
  const i=cart.findIndex(c=>c.id===id); if(i<0) return;
  cart[i].qty+=delta; if(cart[i].qty<=0) cart.splice(i,1);
  saveCart(); renderCart();
}

function updateDishComment(id, val) {
  const c=cart.find(c=>c.id===id); if(c) c.comment=val;
  localStorage.setItem('r_cart', JSON.stringify(cart));
}

function clearCart() { cart=[]; saveCart(); renderCart(); }

function updateBadge() {
  const n=cart.reduce((s,c)=>s+c.qty,0);
  const b=document.getElementById('cartBadge');
  b.textContent=n; b.classList.toggle('show', n>0);
}

function cartTotal() {
  return cart.reduce((s,c)=>{
    const d=menu.find(m=>m.id===c.id);
    return s+(d?d.price*c.qty:0);
  },0);
}

function renderCart() {
  const wrap=document.getElementById('cartContent');
  document.getElementById('clearCartBtn').style.display=cart.length?'':'none';

  if(!cart.length) {
    wrap.innerHTML=`
      <div class="cart-empty">
        <div style="font-size:56px;opacity:.18">🛒</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--muted)">Корзина пуста</div>
        <div style="font-size:13px;color:var(--muted);opacity:.6;margin-top:5px">Добавьте что-нибудь из меню</div>
        <button class="btn btn-primary" style="margin-top:18px" onclick="goPage('menu')">Открыть меню</button>
      </div>`; return;
  }

  const items=cart.map(c=>{
    const d=menu.find(m=>m.id===c.id); if(!d) return '';
    const img=d.photo_url?`<img class="cart-img" src="${d.photo_url}" alt="${d.name}"/>`:`<div class="cart-placeholder">${d.emoji||'🍽'}</div>`;
    return `
    <div class="cart-item">
      <div class="cart-item-top">
        ${img}
        <div>
          <div class="cart-item-name">${d.name}</div>
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
          placeholder="Комментарий к блюду (без лука, extra соус...)"
          value="${c.comment||''}"
          oninput="updateDishComment('${d.id}',this.value)"/>
      </div>
    </div>`;
  }).join('');

  wrap.innerHTML=`
    <div class="cart-items">${items}</div>
    <div class="divider"></div>
    <div class="total-row"><span class="total-label">Итого</span><span class="total-val">${cartTotal().toLocaleString('ru')} ₸</span></div>
    <div class="total-row"><span class="total-label">Позиций</span><span style="font-size:13px;color:var(--muted)">${cart.reduce((s,c)=>s+c.qty,0)} шт.</span></div>
    <button class="btn btn-primary btn-full" onclick="goPage('order')">Оформить заказ →</button>
    <button class="btn-ghost" onclick="goPage('menu')">← Продолжить выбор</button>`;
}

function renderOrderSummary() {
  const el=document.getElementById('orderSummary');
  if(!cart.length) { el.innerHTML='<div style="text-align:center;padding:18px;color:var(--muted);font-size:13px">Корзина пуста</div>'; return; }
  const rows=cart.map(c=>{
    const d=menu.find(m=>m.id===c.id); if(!d) return '';
    const comm=c.comment?`<span style="font-size:11px;color:var(--gold);margin-left:4px">(${c.comment})</span>`:'';
    return `<div class="order-sum-row"><span>${d.name} × ${c.qty}${comm}</span><span>${(d.price*c.qty).toLocaleString('ru')} ₸</span></div>`;
  }).join('');
  el.innerHTML=`<div class="order-sum-label">Состав заказа</div>${rows}<div class="order-sum-row total"><span>Итого</span><span>${cartTotal().toLocaleString('ru')} ₸</span></div>`;
}

async function submitOrder() {
  const table=document.getElementById('tableNum').value.trim();
  const comment=document.getElementById('orderComment').value.trim();
  if(!cart.length) { toast('Корзина пуста!','err'); return; }
  if(!table)       { toast('Введите номер стола','err'); return; }

  const btn=document.getElementById('submitOrderBtn');
  btn.disabled=true; btn.textContent='Отправка...';

  const items=cart.map(c=>{
    const d=menu.find(m=>m.id===c.id);
    return {id:c.id, name:d?.name||'?', qty:c.qty, price:d?.price||0, comment:c.comment||''};
  });
  const total=cartTotal();

  try {
    const {error}=await sbAdmin.from('orders').insert([{
      table_num:table, items, total, comment,
      daily_date: new Date().toISOString().split('T')[0],
    }]);
    if(error) throw error;

    const lines=items.map(i=>{
      const comm=i.comment?` _(${i.comment})_`:'';
      return `  • ${i.name} × ${i.qty} — ${(i.price*i.qty).toLocaleString('ru')} ₸${comm}`;
    }).join('\n');
    const time=new Date().toLocaleString('ru',{timeZone:'Asia/Almaty'});

    await sendTelegram(
      `🍽 *Новый заказ — ${CONFIG.restaurant.name}*\n\n`+
      `🪑 Стол: *${table}*\n🕐 ${time}\n\n${lines}\n\n━━━━━━━━━━━\n`+
      `💰 *${total.toLocaleString('ru')} ₸*`+
      (comment?`\n\n💬 _${comment}_`:'')
    );

    cart=[]; saveCart(); renderCart();
    document.getElementById('tableNum').value='';
    document.getElementById('orderComment').value='';
    showPayment(total);

  } catch(err) {
    console.error(err); toast('Ошибка при отправке. Попробуйте ещё раз.','err');
  } finally {
    btn.disabled=false; btn.textContent='Отправить заказ';
  }
}

function showPayment(total) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-payment').classList.add('active');
  document.getElementById('payTotal').textContent=`${total.toLocaleString('ru')} ₸`;
  const link=CONFIG.restaurant.kaspiLink;
  document.getElementById('kaspiQR').src=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}`;
  document.getElementById('kaspiBtn').href=link;
  window.scrollTo(0,0);
}

function initReserve() {
  const inp=document.getElementById('resDate');
  const today=new Date().toISOString().split('T')[0];
  inp.min=today; if(!inp.value) inp.value=today;
  renderTimeSlots();
}

function renderTimeSlots() {
  document.getElementById('timeSlots').innerHTML=TIME_SLOTS.map(t=>
    `<div class="time-slot ${selTime===t?'active':''}" onclick="selectTime('${t}')">${t}</div>`
  ).join('');
}

function selectTime(t) { selTime=t; renderTimeSlots(); document.getElementById('resTimeView').value=t; }

async function submitReservation() {
  const name=document.getElementById('resName').value.trim();
  const phone=document.getElementById('resPhone').value.trim();
  const date=document.getElementById('resDate').value;
  const people=document.getElementById('resPeople').value;
  const tableN=document.getElementById('resTable').value.trim();
  const comment=document.getElementById('resComment').value.trim();

  if(!name)    {toast('Введите имя','err');return;}
  if(!phone)   {toast('Введите телефон','err');return;}
  if(!date)    {toast('Выберите дату','err');return;}
  if(!selTime) {toast('Выберите время','err');return;}
  if(!people)  {toast('Укажите кол-во гостей','err');return;}

  const btn=document.getElementById('submitResBtn');
  btn.disabled=true; btn.textContent='Отправка...';

  try {
    const {error}=await sbAdmin.from('reservations').insert([{
      name, phone, date, time:selTime,
      people_count:parseInt(people), table_num:tableN, comment,
    }]);
    if(error) throw error;

    const dateStr=new Date(date+'T12:00:00').toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});
    await sendTelegram(
      `📅 *Новая бронь — ${CONFIG.restaurant.name}*\n\n`+
      `👤 *${name}*\n📞 ${phone}\n`+
      `📆 ${dateStr} в *${selTime}*\n`+
      `👥 Гостей: *${people}*`+
      (tableN?`\n🪑 Стол: ${tableN}`:'')+
      (comment?`\n\n💬 _${comment}_`:'')
    );

    ['resName','resPhone','resComment','resTable'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('resPeople').value='2';
    selTime=''; renderTimeSlots();
    document.getElementById('resTimeView').value='';
    toast('✅ Бронь принята! Мы свяжемся с вами.','ok');
    setTimeout(()=>goPage('home'), 2000);

  } catch(err) {
    console.error(err); toast('Ошибка при отправке. Попробуйте ещё раз.','err');
  } finally {
    btn.disabled=false; btn.textContent='Забронировать стол';
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-r-name]').forEach(el=>el.textContent=CONFIG.restaurant.name);
  document.querySelectorAll('[data-r-tagline]').forEach(el=>el.textContent=CONFIG.restaurant.tagline);
  const bg=document.getElementById('heroBg');
  if(bg) bg.style.backgroundImage=`url('${CONFIG.restaurant.heroImage}')`;
  const ph=document.getElementById('resPhone2');
  if(ph){ph.href=`tel:${CONFIG.restaurant.phone}`;ph.textContent=CONFIG.restaurant.phone;}
  loadMenu();
  document.addEventListener('touchstart',()=>{},{passive:true});
});
