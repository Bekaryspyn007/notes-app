/**
 * validation.js — общие помощники: поиск элементов, экранирование, уведомления,
 * проверка форм (V.run) с понятными сообщениями под полями.
 */
const $   = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n).toLocaleString('ru') + ' ₸';
const mins  = t => { const [h, m] = String(t).split(':'); return (+h || 0) * 60 + (+m || 0); };
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });

function loading(show) { const l = $('loader'); if (l) l.classList.toggle('show', show); }

let _tt;
function toast(msg, type = '') {
  const el = $('toast'); if (!el) return;
  el.textContent = msg; el.className = `toast show ${type}`;
  clearTimeout(_tt); _tt = setTimeout(() => el.className = 'toast', 2800);
}

const V = {
  email: s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s),
  phone: s => /^\+?[0-9\s()-]{7,16}$/.test(s),
  /* true, если выбран сегодняшний день и время уже прошло */
  past: (d, t) => !!(d && t) && d === dayStr() && mins(t) <= new Date().getHours() * 60 + new Date().getMinutes(),
  clear(el) { el.classList.remove('invalid'); const box = el.closest('.form-sec') || el.parentNode; const e = box.querySelector('.field-err'); if (e) e.remove(); },
  err(el, msg) { V.clear(el); el.classList.add('invalid'); const d = document.createElement('div'); d.className = 'field-err'; d.textContent = '⚠ ' + msg; (el.closest('.form-sec') || el.parentNode).appendChild(d); },
  /* rules: { idПоля: значение => 'текст ошибки' | '' } — возвращает true, если всё верно */
  run(rules) {
    let ok = true, first = null;
    for (const id in rules) {
      const el = $(id); if (!el) continue;
      const v = el.type === 'password' ? el.value : String(el.value).trim();
      const m = rules[id](v, el);
      if (m) { V.err(el, m); ok = false; first = first || el; } else V.clear(el);
    }
    if (first && first.type !== 'hidden' && first.focus) first.focus();
    return ok;
  },
};
/* ошибка исчезает, когда пользователь начинает исправлять поле */
document.addEventListener('input', e => { if (e.target.classList && e.target.classList.contains('invalid')) V.clear(e.target); });
