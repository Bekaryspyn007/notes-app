/* ═══════════════════════════════════════════════════════
   МОИ ЗАМЕТКИ — app.js
   ═══════════════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────
let notes    = JSON.parse(localStorage.getItem('myNotes') || '[]');
let activeId = null;
let saveTimer = null;

// ── UTILITIES ──────────────────────────────────────────

/** Save notes array to localStorage */
function save() {
  localStorage.setItem('myNotes', JSON.stringify(notes));
}

/** Generate a short unique ID */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Format a timestamp to a full readable date + time */
function formatDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  );
}

/** Format a timestamp to a short relative label for the sidebar */
function formatShort(ts) {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (now - d < 7 * 86400000)
    return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/** Show a brief toast notification */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/** Auto-resize a textarea to fit its content */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}


// ── THEME ──────────────────────────────────────────────
const html        = document.documentElement;
const savedTheme  = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

document.getElementById('themeToggle').addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});


// ── RENDER NOTE LIST ───────────────────────────────────

/**
 * Render the sidebar note list, optionally filtered by a search string.
 * Notes are grouped into "Today" and "Earlier" sections.
 */
function renderList(filter = '') {
  const list = document.getElementById('noteList');
  const q    = filter.toLowerCase();

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<div class="no-results">
      ${q
        ? `По запросу <b>"${filter}"</b> ничего не найдено.`
        : 'Нет заметок. Создайте первую!'}
    </div>`;
    return;
  }

  const today      = new Date().toDateString();
  const todayNotes = filtered.filter(n => new Date(n.updatedAt).toDateString() === today);
  const olderNotes = filtered.filter(n => new Date(n.updatedAt).toDateString() !== today);

  let html2 = '';
  if (todayNotes.length) {
    html2 += `<div class="note-group-label">Сегодня</div>`;
    html2 += todayNotes.map(n => buildNoteCard(n)).join('');
  }
  if (olderNotes.length) {
    html2 += `<div class="note-group-label">Ранее</div>`;
    html2 += olderNotes.map(n => buildNoteCard(n)).join('');
  }
  list.innerHTML = html2;

  // Attach click events
  list.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.icon-btn')) return; // skip action buttons
      openNote(card.dataset.id);
    });
  });

  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteNote(btn.dataset.id);
    });
  });
}

/** Build the HTML string for a single note card */
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
          <svg viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </div>
    </div>`;
}


// ── OPEN / CREATE / DELETE ─────────────────────────────

/** Open a note in the editor */
function openNote(id) {
  activeId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  // Show editor, hide empty state
  document.getElementById('emptyState').style.display     = 'none';
  document.getElementById('editorContent').style.display  = 'flex';
  document.getElementById('editorToolbar').style.display  = 'flex';

  const titleEl = document.getElementById('noteTitle');
  const bodyEl  = document.getElementById('noteBody');

  titleEl.value = note.title;
  bodyEl.value  = note.body;

  document.getElementById('noteDate').innerHTML =
    `<strong>Изменено:</strong> ${formatDate(note.updatedAt)}`;

  renderTags(note.tags || []);
  updateWordCount(note.body);
  autoResize(titleEl);
  renderList(document.getElementById('searchInput').value);

  // On mobile: close the sidebar after selecting a note
  if (window.innerWidth <= 720) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

/** Create a new blank note and open it */
function createNote() {
  const note = {
    id:        uid(),
    title:     '',
    body:      '',
    tags:      [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  notes.unshift(note);
  save();
  renderList();
  openNote(note.id);
  setTimeout(() => document.getElementById('noteTitle').focus(), 50);
}

/** Delete a note by ID */
function deleteNote(id) {
  if (!confirm('Удалить эту заметку?')) return;

  notes = notes.filter(n => n.id !== id);
  save();

  if (activeId === id) {
    activeId = null;
    document.getElementById('emptyState').style.display    = 'flex';
    document.getElementById('editorContent').style.display = 'none';
    document.getElementById('editorToolbar').style.display = 'none';
  }

  renderList();
  showToast('Заметка удалена');
}


// ── AUTO-SAVE ──────────────────────────────────────────

/** Schedule an autosave 600ms after the last keystroke */
function scheduleAutosave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 600);
}

/** Persist the current editor content to the notes array */
function autosave() {
  if (!activeId) return;
  const note = notes.find(n => n.id === activeId);
  if (!note) return;

  note.title     = document.getElementById('noteTitle').value;
  note.body      = document.getElementById('noteBody').value;
  note.updatedAt = Date.now();
  save();

  document.getElementById('noteDate').innerHTML =
    `<strong>Изменено:</strong> ${formatDate(note.updatedAt)}`;

  // Keep list sorted by most-recently updated
  notes.sort((a, b) => b.updatedAt - a.updatedAt);
  renderList(document.getElementById('searchInput').value);
}

// Live word counter
function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  document.getElementById('wc').textContent = words;
}

// Input listeners
document.getElementById('noteTitle').addEventListener('input', function () {
  autoResize(this);
  scheduleAutosave();
});

document.getElementById('noteBody').addEventListener('input', function () {
  updateWordCount(this.value);
  scheduleAutosave();
});


// ── TAGS ───────────────────────────────────────────────

/** Render the tag chips in the editor meta row */
function renderTags(tags) {
  const wrap = document.getElementById('tagWrap');

  const chips = tags
    .map(t => `
      <span class="tag-chip" data-tag="${t}">
        ${t}
        <svg viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2.5"
                fill="none" stroke-linecap="round"/>
        </svg>
      </span>`)
    .join('');

  wrap.innerHTML = chips + `<button class="tag-add-btn" id="tagAddBtn">+ Тег</button>`;

  // Remove tag on chip click
  wrap.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const note = notes.find(n => n.id === activeId);
      if (!note) return;
      note.tags = note.tags.filter(t => t !== chip.dataset.tag);
      save();
      renderTags(note.tags);
      renderList();
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

// Modal events
document.getElementById('tagCancelBtn').addEventListener('click', closeTagModal);

document.getElementById('tagModal').addEventListener('click', e => {
  if (e.target === document.getElementById('tagModal')) closeTagModal();
});

document.getElementById('tagConfirmBtn').addEventListener('click', () => {
  const val = document.getElementById('tagInput').value.trim();
  if (!val) return;

  const note = notes.find(n => n.id === activeId);
  if (!note) return;

  if (!(note.tags || []).includes(val)) {
    note.tags = [...(note.tags || []), val];
    save();
    renderTags(note.tags);
    renderList();
  }
  closeTagModal();
});

document.getElementById('tagInput').addEventListener('keydown', e => {
  if (e.key === 'Enter')  document.getElementById('tagConfirmBtn').click();
  if (e.key === 'Escape') closeTagModal();
});


// ── TEXT FORMATTING ────────────────────────────────────

/**
 * Apply Markdown-style formatting to the selected text in the body textarea.
 * @param {string} type - One of: bold, italic, underline, h1, h2, ul, ol, quote
 */
function fmt(type) {
  const ta    = document.getElementById('noteBody');
  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.substring(start, end);
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


// ── KEYBOARD SHORTCUTS ─────────────────────────────────
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'n') { e.preventDefault(); createNote(); }
  if (mod && e.key === 'b') { e.preventDefault(); fmt('bold'); }
  if (mod && e.key === 'i') { e.preventDefault(); fmt('italic'); }
});


// ── SEARCH ─────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function () {
  renderList(this.value);
});


// ── NEW NOTE BUTTON ────────────────────────────────────
document.getElementById('newNoteBtn').addEventListener('click', createNote);


// ── MOBILE SIDEBAR TOGGLE ──────────────────────────────
document.getElementById('mobileToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});


// ── INITIALISE ─────────────────────────────────────────

/** Seed demo notes on first launch */
function seedDemoNotes() {
  notes = [
    {
      id: uid(),
      title: 'Добро пожаловать! 👋',
      body: 'Это ваше пространство для заметок.\n\nВы можете:\n- Создавать новые заметки кнопкой внизу\n- Добавлять теги к заметкам\n- Использовать форматирование (жирный, курсив, заголовки)\n- Искать заметки по тексту\n- Переключать тёмный / светлый режим\n\nВсё автоматически сохраняется в браузере. Приятной работы!',
      tags: ['приветствие'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: uid(),
      title: 'Планы на неделю',
      body: 'Понедельник: Встреча с командой в 10:00\nВторник: Дедлайн по проекту X\nСреда: Свободное время для чтения\n\nКниги:\n- Атлант расправил плечи\n- Думай медленно, решай быстро',
      tags: ['планы', 'работа'],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: uid(),
      title: 'Идеи для проекта',
      body: 'Новый интерфейс:\n1. Убрать лишние кнопки\n2. Добавить тёмную тему\n3. Улучшить анимации\n\nЦветовая палитра: тёплые тона, терракотовый акцент.',
      tags: ['идеи', 'дизайн'],
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
    },
  ];
  save();
}

if (notes.length === 0) {
  seedDemoNotes();
}

notes.sort((a, b) => b.updatedAt - a.updatedAt);
renderList();
