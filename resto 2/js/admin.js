/**
 * admin.js — Полная админка
 * Дашборд · Заказы (реал-тайм + статус) · Меню · Брони · Официанты · Возвраты · Вызовы
 */

const { createClient } = window.supabase;
const sb = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

const ALLERGENS = ['gluten','dairy','nuts','eggs','fish','soy'];
const ALLERGEN_LABELS = {
  gluten:'🌾 Глютен', dairy:'🥛 Молоко', nuts:'🥜 Орехи',
  eggs:'🥚 Яйца', fish:'🐟 Рыба', soy:'🫘 Соя',
};
const STATUS_LABELS = {
  new:'Новый', cooking:'Готовится', ready:'Готов', served:'Подан', cancelled:'Отменён'
};

let menu        = [];
let adminToken  = sessionStorage.getItem('adm_token')||'';
let realtimeSub = null;

/* ── UTILS ── */
function loading(show) { document.getElementById('loader').classList.toggle('show', show); }

let _tt;
function toast(msg, type='') {
  const el=document.getElementById('toast');
  el.textContent=msg; el.className=`toast show ${type}`;
  clearTimeout(_tt); _tt=setTimeout(()=>el.className='toast', 2800);
}

function loadingHTML() { return '<div style="padding:32px;text-align:center;color:var(--muted);font-size:12px;letter-spacing:1px">Загрузка...</div>'; }
function emptyHTML(m)  { return `<div style="padding:44px 20px;text-align:center;font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--muted)">${m}</div>`; }
function errHTML(m)    { return `<div style="padding:20px;color:var(--err);font-size:13px">${m}</div>`; }

/* ── AUTH ── */
function adminLogin() {
  const pw=document.getElementById('adminPass').value;
  const btn=document.getElementById('loginBtn');
  if(!pw) return;
  btn.disabled=true; btn.textContent='...';
  setTimeout(()=>{
    if(pw===CONFIG.admin.password) {
      adminToken=`${Date.now()}.ok`;
      sessionStorage.setItem('adm_token', adminToken);
      showPanel();
    } else {
      toast('Неверный пароль','err');
      document.getElementById('adminPass').value='';
    }
    btn.disabled=false; btn.textContent='Войти';
  }, 300);
}

function adminLogout() {
  adminToken=''; sessionStorage.removeItem('adm_token');
  if(realtimeSub) { sb.removeChannel(realtimeSub); realtimeSub=null; }
  document.getElementById('adminLogin').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('logoutBtn').classList.add('hidden');
  document.getElementById('adminPass').value='';
}

function isTokenValid() {
  if(!adminToken) return false;
  const ts=parseInt(adminToken.split('.')[0]);
  return !isNaN(ts) && Date.now()-ts < 8*3600*1000;
}

function showPanel() {
  document.getElementById('adminLogin').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');
  switchTab('dashboard');
  startRealtime();
}

/* ── REALTIME ── */
function startRealtime() {
  if(realtimeSub) return;
  realtimeSub = sb.channel('orders_realtime')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'}, payload => {
      const order = payload.new;
      // Звуковое уведомление
      try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAA==').play(); } catch {}
      toast(`🔔 Новый заказ — Стол ${order.table_num}`,'warn');
      // Если открыта вкладка заказов — обновляем
      if(document.getElementById('tab-orders').classList.contains('active')) {
        loadOrders();
        loadDashboard();
      }
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'waiter_calls'}, payload => {
      const call = payload.new;
      toast(`🔔 Вызов официанта — Стол ${call.table_num}`,'warn');
      if(document.getElementById('tab-calls').classList.contains('active')) loadCalls();
    })
    .subscribe();
}

/* ── TABS ── */
function switchTab(tab) {
  const ALL=['dashboard','orders','menu','reservations','waiters','returns','calls'];
  document.querySelectorAll('.admin-tab').forEach((t,i)=>t.classList.toggle('active',ALL[i]===tab));
  document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  if(tab==='dashboard')   loadDashboard();
  if(tab==='orders')      loadOrders();
  if(tab==='menu')        loadMenuAdmin();
  if(tab==='reservations')loadReservations();
  if(tab==='waiters')     loadWaiters();
  if(tab==='returns')     loadReturns();
  if(tab==='calls')       loadCalls();
}

/* ── DASHBOARD ── */
async function loadDashboard() {
  const today = new Date().toISOString().split('T')[0];

  const [{data:todayOrders},{data:todayRes},{data:pendingCalls},{data:totalOrders}] = await Promise.all([
    sb.from('orders').select('total,waiter_name').eq('daily_date',today),
    sb.from('reservations').select('id').eq('date',today),
    sb.from('waiter_calls').select('id').eq('answered',false),
    sb.from('orders').select('total').gte('created_at', today+'T00:00:00'),
  ]);

  const todayRevenue = (todayOrders||[]).reduce((s,o)=>s+o.total,0);
  const todayCount   = (todayOrders||[]).length;

  document.getElementById('dashRevenue').textContent = todayRevenue.toLocaleString('ru')+' ₸';
  document.getElementById('dashOrders').textContent  = todayCount;
  document.getElementById('dashRes').textContent     = (todayRes||[]).length;
  document.getElementById('dashCalls').textContent   = (pendingCalls||[]).length;

  // Топ официант сегодня
  const waiterTotals = {};
  (todayOrders||[]).forEach(o=>{
    if(o.waiter_name) waiterTotals[o.waiter_name]=(waiterTotals[o.waiter_name]||0)+o.total;
  });
  const topWaiter = Object.entries(waiterTotals).sort((a,b)=>b[1]-a[1])[0];
  const topEl = document.getElementById('dashTopWaiter');
  if(topEl) topEl.textContent = topWaiter ? `👤 ${topWaiter[0]} — ${topWaiter[1].toLocaleString('ru')} ₸` : '—';
}

/* ── ORDERS ── */
async function loadOrders() {
  const wrap=document.getElementById('ordersWrap');
  wrap.innerHTML=loadingHTML();

  const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){wrap.innerHTML=errHTML('Ошибка загрузки');return;}
  if(!data?.length){wrap.innerHTML=emptyHTML('Заказов пока нет');return;}

  const groups={};
  data.forEach(o=>{
    const key=o.daily_date||o.created_at?.split('T')[0]||'—';
    if(!groups[key]) groups[key]=[];
    groups[key].push(o);
  });

  wrap.innerHTML=Object.entries(groups).map(([date,orders])=>{
    const dayTotal=orders.reduce((s,o)=>s+o.total,0);
    const label=new Date(date+'T12:00:00').toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long'});
    const cards=orders.map((o,i)=>{
      const items=Array.isArray(o.items)?o.items:[];
      const time=new Date(o.created_at).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
      const itemLines=items.map(it=>{
        const comm=it.comment?` <span style="color:var(--green3);font-size:11px">(${it.comment})</span>`:'';
        return `${it.name} × ${it.qty}${comm}`;
      }).join(' · ');
      return `
      <div class="order-card">
        <div class="order-card-head">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="order-card-num">#${String(i+1).padStart(3,'0')}</div>
            <span class="status-badge status-${o.status||'new'}">${STATUS_LABELS[o.status||'new']}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${o.waiter_name?`<span style="font-size:11px;color:var(--green3)">👤 ${o.waiter_name}</span>`:''}
            <div class="order-card-time">${time}</div>
          </div>
        </div>
        <div class="order-table">Стол ${o.table_num}</div>
        <div class="order-items-text">${itemLines}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:6px">
          <div class="order-total">${o.total.toLocaleString('ru')} ₸</div>
          <div class="order-actions">
            ${['cooking','ready','served'].map(s=>
              `<button class="act act-sm ${o.status===s?'green':''}" onclick="setOrderStatus(${o.id},'${s}',this)">${STATUS_LABELS[s]}</button>`
            ).join('')}
            <button class="act act-edit" style="font-size:10px" onclick="openReturnModal(${o.id},'${o.table_num}',${o.total})">↩</button>
          </div>
        </div>
        ${o.comment?`<div class="order-comment-text">${o.comment}</div>`:''}
      </div>`;
    }).join('');
    return `
    <div class="day-group">
      <div class="day-label"><span>${label}</span><span class="day-total">${dayTotal.toLocaleString('ru')} ₸</span></div>
      ${cards}
    </div>`;
  }).join('');
}

async function setOrderStatus(id, status, btn) {
  const {error}=await sb.from('orders').update({status}).eq('id',id);
  if(error){toast('Ошибка','err');return;}
  toast(`Статус: ${STATUS_LABELS[status]}`,'ok');
  loadOrders();
}

/* ── WAITER CALLS ── */
async function loadCalls() {
  const wrap=document.getElementById('callsWrap');
  wrap.innerHTML=loadingHTML();

  const {data,error}=await sb.from('waiter_calls').select('*').eq('answered',false).order('created_at',{ascending:false});
  if(error){wrap.innerHTML=errHTML('Ошибка');return;}
  if(!data?.length){wrap.innerHTML=emptyHTML('Активных вызовов нет ✓');return;}

  wrap.innerHTML=data.map(c=>`
    <div class="call-card">
      <div>
        <div class="call-table">🔔 Стол ${c.table_num}</div>
        <div class="call-time">${new Date(c.created_at).toLocaleTimeString('ru')}</div>
      </div>
      <button class="btn btn-primary" style="padding:8px 18px;font-size:11px;border-radius:var(--r3)" onclick="answerCall(${c.id})">Ответил ✓</button>
    </div>`).join('');
}

async function answerCall(id) {
  await sb.from('waiter_calls').update({answered:true}).eq('id',id);
  toast('Вызов закрыт','ok');
  loadCalls();
  loadDashboard();
}

/* ── RETURNS ── */
function openReturnModal(orderId, tableNum, maxAmt) {
  document.getElementById('returnOrderId').value=orderId;
  document.getElementById('returnTableNum').value=tableNum;
  document.getElementById('returnMaxAmt').value=maxAmt;
  document.getElementById('returnAmount').value='';
  document.getElementById('returnReason').value='';
  document.getElementById('returnItems').value='';
  openModal('returnModal');
}

async function submitReturn() {
  const orderId=document.getElementById('returnOrderId').value;
  const tableNum=document.getElementById('returnTableNum').value;
  const amount=parseInt(document.getElementById('returnAmount').value);
  const reason=document.getElementById('returnReason').value.trim();
  const items=document.getElementById('returnItems').value.trim();
  const max=parseInt(document.getElementById('returnMaxAmt').value);

  if(!amount||amount<=0){toast('Укажите сумму','err');return;}
  if(amount>max){toast(`Максимум ${max.toLocaleString('ru')} ₸`,'err');return;}
  if(!reason){toast('Укажите причину','err');return;}

  const {error}=await sb.from('returns').insert([{
    order_id:orderId||null,table_num:tableNum,
    items:items?[{description:items}]:[],reason,amount,
  }]);
  if(error){toast('Ошибка','err');return;}
  closeModal('returnModal');
  toast(`✅ Возврат ${amount.toLocaleString('ru')} ₸`,'ok');
}

async function loadReturns() {
  const wrap=document.getElementById('returnsWrap');
  wrap.innerHTML=loadingHTML();
  const {data,error}=await sb.from('returns').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){wrap.innerHTML=errHTML('Ошибка');return;}
  if(!data?.length){wrap.innerHTML=emptyHTML('Возвратов нет');return;}
  wrap.innerHTML=data.map((r,i)=>`
    <div class="return-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:var(--cream)">Возврат #${String(i+1).padStart(3,'0')}</div>
        <div class="return-amount">−${r.amount.toLocaleString('ru')} ₸</div>
      </div>
      <div style="font-size:12px;color:var(--muted);line-height:1.8">
        <div>Стол: <strong style="color:var(--text)">${r.table_num}</strong></div>
        <div>Причина: <strong style="color:var(--text)">${r.reason}</strong></div>
        <div>${new Date(r.created_at).toLocaleString('ru')}</div>
      </div>
    </div>`).join('');
}

/* ── WAITERS ANALYTICS ── */
async function loadWaiters() {
  const wrap=document.getElementById('waitersWrap');
  wrap.innerHTML=loadingHTML();
  const {data,error}=await sb.from('orders').select('waiter_name,total,daily_date,created_at').order('created_at',{ascending:false});
  if(error){wrap.innerHTML=errHTML('Ошибка');return;}
  if(!data?.length){wrap.innerHTML=emptyHTML('Заказов пока нет');return;}

  const totals={},byDay={};
  data.forEach(o=>{
    const name=o.waiter_name||'—';
    const date=o.daily_date||o.created_at?.split('T')[0]||'—';
    totals[name]=(totals[name]||0)+o.total;
    if(!byDay[date]) byDay[date]={};
    byDay[date][name]=(byDay[date][name]||0)+o.total;
  });

  const cards=Object.entries(totals).sort((a,b)=>b[1]-a[1]).map(([name,sum],i)=>`
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

  const days=Object.entries(byDay).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7).map(([date,ws])=>{
    const label=new Date(date+'T12:00:00').toLocaleDateString('ru',{day:'numeric',month:'long'});
    const rows=Object.entries(ws).sort((a,b)=>b[1]-a[1]).map(([name,sum])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:var(--card2);border-radius:var(--r3);margin-bottom:5px">
        <span style="font-size:13px;color:var(--text)">👤 ${name}</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;color:var(--gold2)">${sum.toLocaleString('ru')} ₸</span>
      </div>`).join('');
    return `<div class="day-group"><div class="day-label"><span>${label}</span></div>${rows}</div>`;
  }).join('');

  wrap.innerHTML=`
    <div style="margin-bottom:20px"><div class="eyebrow" style="margin-bottom:12px">Общий рейтинг</div>${cards}</div>
    <div class="eyebrow" style="margin-bottom:12px">По дням (последние 7)</div>${days}`;
}

/* ── MENU ADMIN ── */
async function loadMenuAdmin() {
  loading(true);
  const {data,error}=await sb.from('menu').select('*').order('sort_order');
  loading(false);
  if(error){toast('Ошибка','err');return;}
  menu=data||[];
  renderMenuAdmin();
}

function renderMenuAdmin() {
  const list=document.getElementById('menuList');
  if(!menu.length){list.innerHTML=emptyHTML('Меню пустое — добавьте первое блюдо');return;}
  list.innerHTML=menu.map(d=>{
    const tags=[
      d.is_popular&&'<span class="act-sm active" style="pointer-events:none">🔥 Хит</span>',
      d.is_new&&'<span class="act-sm green" style="pointer-events:none">✨ Новое</span>',
      d.stop_list&&'<span class="act-sm" style="background:rgba(224,85,85,.1);border-color:rgba(224,85,85,.3);color:var(--err);pointer-events:none">⛔ Стоп</span>',
    ].filter(Boolean).join('');
    return `
    <div class="dish-row">
      ${d.photo_url?`<img class="dish-row-img" src="${d.photo_url}" alt="${d.name_ru}"/>`:`<div class="dish-row-emo">${d.emoji||'🍽'}</div>`}
      <div>
        <div class="dish-row-name">${d.name_ru}</div>
        <div class="dish-row-meta">${d.price.toLocaleString('ru')} ₸${d.weight?' · '+d.weight:''}</div>
        ${tags?`<div class="dish-row-tags">${tags}</div>`:''}
      </div>
      <div class="dish-row-actions">
        <button class="act act-edit" onclick="editDish('${d.id}')">✏️</button>
        <button class="act act-sm ${d.visible?'green':''}" onclick="toggleVis('${d.id}')">${d.visible?'Вкл':'Выкл'}</button>
        <button class="act act-sm ${d.stop_list?'active':''}" onclick="toggleStop('${d.id}')">Стоп</button>
        <button class="act act-del" onclick="deleteDish('${d.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function toggleVis(id) {
  const d=menu.find(m=>m.id===id); if(!d) return;
  d.visible=!d.visible;
  const {error}=await sb.from('menu').update({visible:d.visible}).eq('id',id);
  if(error){toast('Ошибка','err');d.visible=!d.visible;return;}
  renderMenuAdmin(); toast(d.visible?'✓ Включено':'Скрыто');
}

async function toggleStop(id) {
  const d=menu.find(m=>m.id===id); if(!d) return;
  d.stop_list=!d.stop_list;
  const {error}=await sb.from('menu').update({stop_list:d.stop_list}).eq('id',id);
  if(error){toast('Ошибка','err');d.stop_list=!d.stop_list;return;}
  renderMenuAdmin(); toast(d.stop_list?'⛔ Добавлено в стоп-лист':'✓ Убрано из стоп-листа');
}

async function deleteDish(id) {
  if(!confirm('Удалить позицию?')) return;
  const {error}=await sb.from('menu').delete().eq('id',id);
  if(error){toast('Ошибка','err');return;}
  menu=menu.filter(d=>d.id!==id); renderMenuAdmin(); toast('Удалено');
}

/* ── DISH FORM ── */
function openAddDish() { resetDishForm(); openModal('dishModal'); document.getElementById('dishFormTitle').textContent='Новое блюдо'; }

function editDish(id) {
  const d=menu.find(m=>m.id===id); if(!d) return;
  document.getElementById('dishFormTitle').textContent='Редактировать';
  document.getElementById('editDishId').value  =id;
  document.getElementById('fNameRu').value     =d.name_ru||'';
  document.getElementById('fNameKz').value     =d.name_kz||'';
  document.getElementById('fNameEn').value     =d.name_en||'';
  document.getElementById('fDescRu').value     =d.desc_ru||'';
  document.getElementById('fDescKz').value     =d.desc_kz||'';
  document.getElementById('fDescEn').value     =d.desc_en||'';
  document.getElementById('fPrice').value      =d.price;
  document.getElementById('fWeight').value     =d.weight||'';
  document.getElementById('fEmoji').value      =d.emoji||'';
  document.getElementById('fCat').value        =d.category||'dishes';
  document.getElementById('fCookTime').value   =d.cook_time||0;
  document.getElementById('fIsPopular').checked=d.is_popular||false;
  document.getElementById('fIsNew').checked    =d.is_new||false;
  document.getElementById('existingPhoto').value=d.photo_url||'';
  document.getElementById('photoInput').value  ='';

  // Аллергены
  ALLERGENS.forEach(a=>{
    const el=document.getElementById(`al_${a}`);
    if(el) el.closest('.allergen-check')?.classList.toggle('checked',(d.allergens||[]).includes(a));
  });

  const prev=document.getElementById('photoPreview');
  if(d.photo_url){prev.src=d.photo_url;prev.classList.add('show');document.getElementById('photoUploadContent').style.display='none';}
  else{prev.classList.remove('show');document.getElementById('photoUploadContent').style.display='';}
  openModal('dishModal');
}

function resetDishForm() {
  ['editDishId','fNameRu','fNameKz','fNameEn','fDescRu','fDescKz','fDescEn','fPrice','fWeight','fEmoji','existingPhoto'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('fCat').value='dishes';
  document.getElementById('fCookTime').value='0';
  document.getElementById('fIsPopular').checked=false;
  document.getElementById('fIsNew').checked=false;
  document.getElementById('photoInput').value='';
  document.getElementById('photoPreview').classList.remove('show');
  document.getElementById('photoUploadContent').style.display='';
  ALLERGENS.forEach(a=>document.getElementById(`al_${a}`)?.closest('.allergen-check')?.classList.remove('checked'));
}

function toggleAllergen(el) { el.closest('.allergen-check').classList.toggle('checked'); }

function onPhotoSelected(input) {
  if(!input.files[0]) return;
  const prev=document.getElementById('photoPreview');
  prev.src=URL.createObjectURL(input.files[0]);
  prev.classList.add('show');
  document.getElementById('photoUploadContent').style.display='none';
}

async function uploadPhoto(file) {
  const ext=file.name.split('.').pop().toLowerCase();
  const path=`dishes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const {error}=await sb.storage.from('menu-photos').upload(path,file,{upsert:true,contentType:file.type});
  if(error) throw new Error(`Фото: ${error.message}`);
  return sb.storage.from('menu-photos').getPublicUrl(path).data.publicUrl;
}

async function saveDish() {
  const nameRu=document.getElementById('fNameRu').value.trim();
  const price=parseInt(document.getElementById('fPrice').value);
  if(!nameRu){toast('Введите название (рус)','err');return;}
  if(!price||price<=0){toast('Введите цену','err');return;}

  const btn=document.getElementById('saveDishBtn');
  btn.disabled=true; btn.textContent='Сохраняем...';

  try {
    let photo_url=document.getElementById('existingPhoto').value||null;
    const fileInp=document.getElementById('photoInput');
    if(fileInp.files&&fileInp.files[0]){btn.textContent='Загружаем фото...';photo_url=await uploadPhoto(fileInp.files[0]);}

    const allergens=ALLERGENS.filter(a=>document.getElementById(`al_${a}`)?.closest('.allergen-check')?.classList.contains('checked'));

    const row={
      name_ru:nameRu,
      name_kz:document.getElementById('fNameKz').value.trim(),
      name_en:document.getElementById('fNameEn').value.trim(),
      desc_ru:document.getElementById('fDescRu').value.trim(),
      desc_kz:document.getElementById('fDescKz').value.trim(),
      desc_en:document.getElementById('fDescEn').value.trim(),
      price,
      weight:document.getElementById('fWeight').value.trim(),
      emoji:document.getElementById('fEmoji').value.trim()||'🍽',
      category:document.getElementById('fCat').value,
      cook_time:parseInt(document.getElementById('fCookTime').value)||0,
      is_popular:document.getElementById('fIsPopular').checked,
      is_new:document.getElementById('fIsNew').checked,
      allergens,
      photo_url,
    };

    const editId=document.getElementById('editDishId').value;
    if(editId) {
      const {error}=await sb.from('menu').update(row).eq('id',editId);
      if(error) throw new Error(error.message);
      const d=menu.find(m=>m.id===editId); if(d) Object.assign(d,row);
      toast('✅ Блюдо обновлено!','ok');
    } else {
      row.visible=true; row.stop_list=false; row.sort_order=menu.length;
      const {data,error}=await sb.from('menu').insert([row]).select().single();
      if(error) throw new Error(error.message);
      menu.push(data);
      toast('✅ Блюдо добавлено!','ok');
    }

    closeModal('dishModal'); resetDishForm(); renderMenuAdmin();
  } catch(err) {
    console.error(err); toast(err.message||'Ошибка','err');
  } finally {
    btn.disabled=false; btn.textContent='Сохранить';
  }
}

/* ── RESERVATIONS ── */
async function loadReservations() {
  const wrap=document.getElementById('reservationsWrap');
  wrap.innerHTML=loadingHTML();
  const {data,error}=await sb.from('reservations').select('*').order('date').order('time');
  if(error){wrap.innerHTML=errHTML('Ошибка');return;}
  if(!data?.length){wrap.innerHTML=emptyHTML('Броней пока нет');return;}

  const groups={};
  data.forEach(r=>{if(!groups[r.date])groups[r.date]=[];groups[r.date].push(r);});

  wrap.innerHTML=Object.entries(groups).map(([date,rsvs])=>{
    const label=new Date(date+'T12:00:00').toLocaleDateString('ru',{weekday:'long',day:'numeric',month:'long'});
    const cards=rsvs.map(r=>`
      <div class="res-card">
        <div class="res-card-head">
          <div class="res-name">${r.name}</div>
          <div class="res-status ${r.status}">${r.status==='new'?'Новая':r.status==='confirmed'?'Подтверждена':'Отменена'}</div>
        </div>
        <div class="res-info">
          <div>📞 <strong>${r.phone}</strong></div>
          <div>🕐 <strong>${r.time}</strong> · 👥 <strong>${r.people_count} чел.</strong>${r.table_num?` · Стол <strong>${r.table_num}</strong>`:''}</div>
          ${r.comment?`<div>💬 ${r.comment}</div>`:''}
        </div>
        <div class="res-actions">
          ${r.status!=='confirmed'?`<button class="act act-edit" onclick="setResStatus(${r.id},'confirmed')">✓ Подтвердить</button>`:''}
          ${r.status!=='cancelled'?`<button class="act act-del" onclick="setResStatus(${r.id},'cancelled')">✕ Отменить</button>`:''}
        </div>
      </div>`).join('');
    return `<div class="day-group"><div class="day-label"><span>${label}</span><span style="color:var(--muted);font-family:inherit;letter-spacing:0">${rsvs.length} броней</span></div>${cards}</div>`;
  }).join('');
}

async function setResStatus(id,status) {
  const {error}=await sb.from('reservations').update({status}).eq('id',id);
  if(error){toast('Ошибка','err');return;}
  toast(status==='confirmed'?'✓ Подтверждена':'Отменена',status==='confirmed'?'ok':'');
  loadReservations();
}

/* ── MODAL ── */
function openModal(id){document.getElementById(id).classList.add('open');document.body.style.overflow='hidden';}
function closeModal(id){document.getElementById(id).classList.remove('open');document.body.style.overflow='';}
function handleBg(e,id){if(e.target===document.getElementById(id))closeModal(id);}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-r-name]').forEach(el=>el.textContent=CONFIG.restaurant.name);
  if(isTokenValid()) showPanel();
  document.addEventListener('touchstart',()=>{},{passive:true});
});
