/* ═══════════════════════════════════════════════════════
   МОИ ЗАМЕТКИ — app.js
   Supabase backend: auth + real-time notes storage
   ═══════════════════════════════════════════════════════ */

// ── SUPABASE CONFIG ────────────────────────────────────
const SUPABASE_URL  = 'https://rgvxlafkmwbmbhcqvray.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndnhsYWZrbXdibWJoY3F2cmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjAwODMsImV4cCI6MjA4ODUzNjA4M30.-J4X8J0tSjGEGXHD4S0n9H7on9A7vyPPuOuupJ2AlE8';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── STATE ──────────────────────────────────────────────
let notes     = [];
let activeId  = null;
let saveTimer = null;
let authMode  = 'login'; // 'login' | 'signup'

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════

function formatDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );
}

function formatShort(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000)
    return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function showToast(msg, type = 'default') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.classList.remove('show'), 2600);
}

function setSaveStatus(status) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  if (status === 'saving') {
    el.textContent = '○ Сохранение…';
    el.style.color = 'var(--text-muted)';
  } else {
    el.textContent = '● Сохранено';
    el.style.color = 'var(--accent)';
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ══════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════

const html = document.documentElement;
html.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

document.getElementById('themeToggle').addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ══════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════

function switchTab(mode) {
  authMode = mode;
  const isLogin = mode === 'login';

  document.getElementById('tabLogin') .classList.toggle('active',  isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
  document.getElementById('authSubmit').textContent = isLogin ? 'Войти' : 'Создать аккаунт';
  document.getElementById('authHint').innerHTML = isLogin
    ? `Нет аккаунта? <a href="#" onclick="switchTab('signup')">Зарегистрироваться</a>`
    : `Уже есть аккаунт? <a href="#" onclick="switchTab('login')">Войти</a>`;

  hideAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideAuthError() {
  document.getElementById('authError').style.display = 'none';
}

async function handleAuth() {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn      = document.getElementById('authSubmit');

  if (!email || !password) { showAuthError('Заполните все поля'); return; }
  if (password.length < 6) { showAuthError('Пароль минимум 6 символов'); return; }

  btn.textContent = '…';
  btn.disabled = true;
  hideAuthError();

  let error;

  if (authMode === 'login') {
    ({ error } = await db.auth.signInWithPassword({ email, password }));
  } else {
    ({ error } = await db.auth.signUp({ email, password }));
  }

  btn.disabled = false;
  btn.textContent = authMode === 'login' ? 'Войти' : 'Создать аккаунт';

  if (error) {
    const msgs = {
      'Invalid login credentials':        'Неверный email или пароль',
      'User already registered':          'Этот email уже зарегистрирован',
      'Email not confirmed':              'Подтвердите email (проверьте почту)',
      'Password should be at least 6 characters': 'Пароль минимум 6 символов',
    };
    showAuthError(msgs[error.message] || error.message);
  }
  // On success, onAuthStateChange fires → showApp()
}

// Enter key in auth inputs
['authEmail', 'authPassword'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuth();
  });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
});

// Auth state listener — single source of truth
db.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    showApp(session.user);
  } else {
    showAuth();
  }
});

function showApp(user) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'flex';

  // Show user email in sidebar
  document.getElementById('userBadge').textContent = user.email;

  loadNotes();
}

function showAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appWrapper').style.display = 'none';
  notes    = [];
  activeId = null;
}

// ══════════════════════════════════════════════════════
// NOTES — CRUD with Supabase
// ══════════════════════════════════════════════════════

/** Load all notes for the current user */
async function loadNotes() {
  document.getElementById('noteList').innerHTML = '<div class="loading-state">Загрузка…</div>';

  const { data, error } = await db
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) { showToast('Ошибка загрузки заметок', 'error'); return; }

  notes = (data || []).map(normalise);
  renderList();
}

/** Map Supabase snake_case → camelCase */
function normalise(row) {
  return {
    id:        row.id,
    title:     row.title     || '',
    body:      row.body      || '',
    tags:      row.tags      || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Create a new blank note in Supabase */
async function createNote() {
  const { data: { user } } = await db.auth.getUser();

  const { data, error } = await db
    .from('notes')
    .insert({ user_id: user.id, title: '', body: '', tags: [] })
    .select()
    .single();

  if (error) { showToast('Ошибка создания заметки', 'error'); return; }

  const note = normalise(data);
  notes.unshift(note);
  renderList();
  openNote(note.id);
  setTimeout(() => document.getElementById('noteTitle').focus(), 50);
}

/** Save the active note to Supabase */
async function saveNote() {
  if (!activeId) return;
  const note = notes.find(n => n.id === activeId);
  if (!note) return;

  note.title     = document.getElementById('noteTitle').value;
  note.body      = document.getElementById('noteBody').value;
  note.updatedAt = new Date().toISOString();

  setSaveStatus('saving');

  const { error } = await db
    .from('notes')
    .update({ title: note.title, body: note.body, tags: note.tags, updated_at: note.updatedAt })
    .eq('id', note.id);

  if (error) {
    showToast('Ошибка сохранения', 'error');
    return;
  }

  setSaveStatus('saved');
  document.getElementById('noteDate').innerHTML =
    `<strong>Изменено:</strong> ${formatDate(note.updatedAt)}`;

  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  renderList(document.getElementById('searchInput').value);
}

/** Delete a note */
async function deleteNote(id) {
  if (!confirm('Удалить эту заметку?')) return;

  const { error } = await db.from('notes').delete().eq('id', id);
  if (error) { showToast('Ошибка удаления', 'error'); return; }

  notes = notes.filter(n => n.id !== id);

  if (activeId === id) {
    activeId = null;
    document.getElementById('emptyState').style.display    = 'flex';
    document.getElementById('editorContent').style.display = 'none';
    document.getElementById('editorToolbar').style.display = 'none';
  }

  renderList();
  showToast('Заметка удалена');
}

// ══════════════════════════════════════════════════════
// RENDER NOTE LIST
// ══════════════════════════════════════════════════════

function renderList(filter = '') {
  const list = document.getElementById('noteList');
  const q    = filter.toLowerCase();

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<div class="no-results">
      ${q ? `По запросу <b>"${filter}"</b> ничего не найдено.` : 'Нет заметок. Создайте первую!'}
    </div>`;
    return;
  }

  const today      = new Date().toDateString();
  const todayNotes = filtered.filter(n => new Date(n.updatedAt).toDateString() === today);
  const olderNotes = filtered.filter(n => new Date(n.updatedAt).toDateString() !== today);

  let html2 = '';
  if (todayNotes.length) {
    html2 += `<div class="note-group-label">Сегодня</div>`;
    html2 += todayNotes.map(buildNoteCard).join('');
  }
  if (olderNotes.length) {
    html2 += `<div class="note-group-label">Ранее</div>`;
    html2 += olderNotes.map(buildNoteCard).join('');
  }
  list.innerHTML = html2;

  list.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.icon-btn')) return;
      openNote(card.dataset.id);
    });
  });

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); deleteNote(btn.dataset.id); });
  });
}

function buildNoteCard(n) {
  const preview = n.body.replace(/\n+/g, ' ').slice(0, 60) || 'Пустая заметка';
  const tags    = (n.tags || []).map(t => `<span class="note-tag">${t}</span>`).join('');
  return `
    <div class="note-card ${n.id === activeId ? 'active' : ''}" data-id="${n.id}">
      <div class="note-card-title">${n.title || 'Без названия'}</div>
      <div class="note-card-preview">${preview}</div>
      <div class="note-card-meta">
        <span class="note-card-date">${formatShort(n.updatedAt)}</span>
        ${tags}
      </div>
      <div class="note-card-actions">
        <button class="icon-btn danger del-btn" data-id="${n.id}" title="Удалить">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════
// OPEN NOTE IN EDITOR
// ══════════════════════════════════════════════════════

function openNote(id) {
  activeId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById('emptyState').style.display    = 'none';
  document.getElementById('editorContent').style.display = 'flex';
  document.getElementById('editorToolbar').style.display = 'flex';

  const titleEl = document.getElementById('noteTitle');
  const bodyEl  = document.getElementById('noteBody');
  titleEl.value = note.title;
  bodyEl.value  = note.body;

  document.getElementById('noteDate').innerHTML =
    `<strong>Изменено:</strong> ${formatDate(note.updatedAt)}`;

  renderTags(note.tags || []);
  updateWordCount(note.body);
  autoResize(titleEl);
  setSaveStatus('saved');
  renderList(document.getElementById('searchInput').value);

  if (window.innerWidth <= 720)
    document.getElementById('sidebar').classList.remove('open');
}

// ══════════════════════════════════════════════════════
// AUTO-SAVE
// ══════════════════════════════════════════════════════

function scheduleAutosave() {
  setSaveStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNote, 800);
}

function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('wc').textContent = words;
}

document.getElementById('noteTitle').addEventListener('input', function () {
  autoResize(this);
  scheduleAutosave();
});

document.getElementById('noteBody').addEventListener('input', function () {
  updateWordCount(this.value);
  scheduleAutosave();
});

// ══════════════════════════════════════════════════════
// TAGS
// ══════════════════════════════════════════════════════

function renderTags(tags) {
  const wrap = document.getElementById('tagWrap');
  const chips = tags.map(t => `
    <span class="tag-chip" data-tag="${t}">
      ${t}
      <svg viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>
    </span>`).join('');

  wrap.innerHTML = chips + `<button class="tag-add-btn" id="tagAddBtn">+ Тег</button>`;

  wrap.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', async () => {
      const note = notes.find(n => n.id === activeId);
      if (!note) return;
      note.tags = note.tags.filter(t => t !== chip.dataset.tag);
      renderTags(note.tags);
      await saveNote();
    });
  });

  document.getElementById('tagAddBtn').addEventListener('click', openTagModal);
}

function openTagModal() {
  document.getElementById('tagModal').classList.add('open');
  document.getElementById('tagInput').value = '';
  setTimeout(() => document.getElementById('tagInput').focus(), 50);
}

function closeTagModal() {
  document.getElementById('tagModal').classList.remove('open');
}

document.getElementById('tagCancelBtn').addEventListener('click', closeTagModal);
document.getElementById('tagModal').addEventListener('click', e => {
  if (e.target === document.getElementById('tagModal')) closeTagModal();
});

document.getElementById('tagConfirmBtn').addEventListener('click', async () => {
  const val = document.getElementById('tagInput').value.trim();
  if (!val) return;
  const note = notes.find(n => n.id === activeId);
  if (!note) return;
  if (!(note.tags || []).includes(val)) {
    note.tags = [...(note.tags || []), val];
    renderTags(note.tags);
    await saveNote();
  }
  closeTagModal();
});

document.getElementById('tagInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('tagConfirmBtn').click();
  if (e.key === 'Escape') closeTagModal();
});

// ══════════════════════════════════════════════════════
// TEXT FORMATTING
// ══════════════════════════════════════════════════════

function fmt(type) {
  const ta    = document.getElementById('noteBody');
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel    = ta.value.substring(start, end);
  const before = ta.value.substring(0, start);
  const after  = ta.value.substring(end);

  const wrappers = {
    bold:      `**${sel}**`,
    italic:    `_${sel}_`,
    underline: `<u>${sel}</u>`,
    h1:        `\n# ${sel}\n`,
    h2:        `\n## ${sel}\n`,
    ul:        `\n- ${sel}\n`,
    ol:        `\n1. ${sel}\n`,
    quote:     `\n> ${sel}\n`,
  };

  ta.value = before + (wrappers[type] || sel) + after;
  ta.focus();
  scheduleAutosave();
}

// ══════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════

document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'n') { e.preventDefault(); createNote(); }
  if (mod && e.key === 'b') { e.preventDefault(); fmt('bold'); }
  if (mod && e.key === 'i') { e.preventDefault(); fmt('italic'); }
});

// ══════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════

document.getElementById('searchInput').addEventListener('input', function () {
  renderList(this.value);
});

// ══════════════════════════════════════════════════════
// NEW NOTE BUTTON + MOBILE SIDEBAR
// ══════════════════════════════════════════════════════

document.getElementById('newNoteBtn').addEventListener('click', createNote);

document.getElementById('mobileToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
