

// суреттерды images койдык
const IMGS = ["images/move.jpg", "images/eat.jpg", "images/rest.jpg", "images/hydrate.jpg"];

// словарь перевод D

// Файлы видео
const MEDIA = {
  music: "audio/vioce.mp3",
  videos: [
    { title: "Squats",         src: "video/p1.mp4", credit: "собственная съёмка" },
    { title: "Push-ups",       src: "video/p2.mp4", credit: "собственная съёмка" },
    { title: "Plank and core", src: "video/p3.mp4", credit: "собственная съёмка" }
  ]
};

const PAGES = ["home", "dashboard", "workouts", "assistant", "about"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// демо-данные для графиков
const steps = [6200, 8400, 7100, 9800, 5300, 11200, 7600];
// то, что пользователь вводил раньше, берём из localStorage
const STORAGE_KEY = "denimsau_data";
const PROFILE_FIELDS = ["height", "weight", "age", "sex", "activity", "stepGoal"];

function loadSavedData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}
const saved = loadSavedData();

let sleepHours = saved.sleepHours || [7.5, 6.5, 7, 8, 6, 7.5, 8];
let weights = saved.weights || [73.1, 72.8, 72.6, 72.4, 72.2, 72.0];
let waterGlasses = saved.waterGlasses ?? 3;
let latestFacts = {};   // сюда складываем цифры, чтобы отправить их в ИИ

const $ = id => document.getElementById(id);

function saveData() {
  const profile = {};
  PROFILE_FIELDS.forEach(id => profile[id] = $(id).value);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ weights, sleepHours, waterGlasses, profile }));
  } catch (e) { /* хранилище недоступно, ничего страшного */ }
}

function restoreProfile() {
  if (!saved.profile) return;
  PROFILE_FIELDS.forEach(id => {
    if (saved.profile[id] !== undefined) $(id).value = saved.profile[id];
  });
}


// =====================================================================
// 2. LANGUAGE
// =====================================================================

let lang = "en";
try { lang = localStorage.getItem("hm_lang") || "en"; } catch (e) {}

// t("Some text") возвращает перевод, а если перевода нет, то сам текст
function t(text) {
  const entry = D[text];
  if (lang === "en" || !entry) return text;
  return lang === "ru" ? entry[0] : entry[1];
}

// то же самое, но подставляет {n} и т.п.
function tFormat(text, values) {
  return t(text).replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

// Проходим по всем текстовым узлам страницы и меняем на нужный язык.
// Оригинал (английский) запоминаем в node.originalText.
function translatePage() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const tag = node.parentNode.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") continue;

    const trimmed = node.nodeValue.trim();
    if (!trimmed) continue;

    const original = node.originalText || trimmed;
    const entry = D[original];
    if (!entry) continue;

    node.originalText = original;
    const translated = lang === "en" ? original : entry[lang === "ru" ? 0 : 1];
    node.nodeValue = node.nodeValue.replace(trimmed, translated);
  }
  $("question").placeholder = t("Type a question…");
  document.documentElement.lang = lang;
}


// =====================================================================
// 3. NAVIGATION AND THEME
// =====================================================================

function showPageFromHash() {
  let page = (location.hash || "#home").slice(1);
  if (!PAGES.includes(page)) page = "home";

  PAGES.forEach(name => $(name).classList.toggle("active", name === page));
  document.querySelectorAll("#nav a").forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + page);
  });
  scrollTo(0, 0);
}
addEventListener("hashchange", showPageFromHash);
showPageFromHash();

$("themeBtn").onclick = () => {
  const root = document.documentElement;
  const isDark = getComputedStyle(root).getPropertyValue("--bg").trim() === "#0b1220";
  root.dataset.theme = isDark ? "light" : "dark";
};


// =====================================================================
// 4. HOME PAGE
// =====================================================================

const kpiItems = [["7", "Components"], ["5", "Pages"], ["3", "AI features"], ["100%", "Browser-based"]];

function renderKpi() {
  $("kpi").innerHTML = kpiItems.map(item =>
    `<div class="card" style="text-align:center">
       <div class="big">${item[0]}</div>
       <div class="muted">${t(item[1])}</div>
     </div>`
  ).join("");
}

const galleryItems = [["Move", "Training"], ["Eat", "Nutrition"], ["Rest", "Recovery"], ["Hydrate", "Water"]];

function renderGallery() {
  $("gallery").innerHTML = galleryItems.map((item, i) =>
    `<div class="card" style="padding:0; overflow:hidden">
       <img src="${IMGS[i] || ""}" alt="${item[0]}: AI-generated illustration" loading="lazy" style="width:100%; display:block">
       <div style="padding:10px 14px"><b>${t(item[0])}</b> <span class="muted">· ${t(item[1])}</span></div>
     </div>`
  ).join("");
}

$("heroImg").src = IMGS[0] || "";


// =====================================================================
// 5. DASHBOARD
// =====================================================================

// столбчатая диаграмма в SVG
function drawBars(svgId, values, formatLabel, maxValue, goalLine) {
  const max = maxValue || Math.max(...values, goalLine || 0, 1);
  const barWidth = Math.min(30, 280 / values.length - 6);
  const step = 292 / values.length;

  const bars = values.map((value, i) => {
    const barHeight = value / max * 118;
    const x = 14 + i * step;
    return `<rect x="${x}" y="${138 - barHeight}" width="${barWidth}" height="${barHeight}" rx="5" fill="var(--accent)"/>
            <text x="${x + barWidth / 2}" y="155" text-anchor="middle">${t(DAYS[i % 7])}</text>
            <text x="${x + barWidth / 2}" y="${132 - barHeight}" text-anchor="middle">${formatLabel(value)}</text>`;
  }).join("");

  // пунктирная линия цели (если она задана)
  let goalHtml = "";
  if (goalLine) {
    const y = 138 - goalLine / max * 118;
    goalHtml = `<line x1="8" x2="312" y1="${y}" y2="${y}" stroke="var(--accent2)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  }
  $(svgId).innerHTML = goalHtml + bars;
}

// линейный график веса
function drawWeightLine() {
  const low = Math.min(...weights) - 0.5;
  const high = Math.max(...weights) + 0.5;
  const count = weights.length;

  const points = weights.map((w, i) => [
    20 + i * (280 / Math.max(count - 1, 1)),
    140 - (w - low) / (high - low) * 118
  ]);

  const polyline = `<polyline points="${points.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--accent2)" stroke-width="3"/>`;
  const dots = points.map((p, i) =>
    `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="var(--accent2)"/>
     <text x="${p[0]}" y="${p[1] - 8}" text-anchor="middle">${weights[i]}</text>`
  ).join("");

  $("weightChart").innerHTML = polyline + dots;
}

function drawWater() {
  let html = "";
  for (let i = 0; i < 8; i++) {
    html += `<button class="${i < waterGlasses ? "full" : ""}" data-i="${i}" aria-label="glass ${i + 1}">🥛</button>`;
  }
  $("water").innerHTML = html;
  $("waterText").textContent = `${waterGlasses}/8 ${t("glasses")} (${t("about")} ${waterGlasses * 250} ${t("ml")})`;
}

$("water").onclick = e => {
  const index = e.target.dataset.i;
  if (index === undefined) return;
  const clicked = Number(index) + 1;
  // повторный клик на последний стакан убирает его
  waterGlasses = (clicked === waterGlasses) ? clicked - 1 : clicked;
  drawWater();
  analyse();
};

function bmiCategory(bmi) {
  if (bmi < 18.5) return "Below the typical range";
  if (bmi < 25)   return "Within the typical range";
  if (bmi < 30)   return "Above the typical range";
  return "Well above the typical range";
}

// главная функция: считает ИМТ, калории, оценку и выводы
function analyse() {
  const heightM = Number($("height").value) / 100;
  const weight = Number($("weight").value);
  const age = Number($("age").value);
  const goal = Number($("stepGoal").value) || 8000;

  if (!(heightM > 0 && weight > 0 && age > 0)) {
    $("bmiText").textContent = t("Enter valid height, weight and age");
    return;
  }

  drawBars("stepsChart", steps, s => (s / 1000).toFixed(1) + "k", undefined, goal);

  // ИМТ
  const bmi = weight / (heightM * heightM);
  $("bmi").textContent = bmi.toFixed(1);
  $("bmiText").textContent = t(bmiCategory(bmi));

  // калории по формуле Миффлина-Сан Жеора
  const sexBonus = $("sex").value === "m" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * heightM * 100 - 5 * age + sexBonus;
  const kcal = Math.round(bmr * $("activity").value);
  $("kcal").textContent = kcal;

  // статистика
  const avgSteps = Math.round(steps.reduce((sum, s) => sum + s, 0) / 7);
  const goalDays = steps.filter(s => s >= goal).length;
  const avgSleep = sleepHours.reduce((sum, h) => sum + h, 0) / sleepHours.length;
  const weightChange = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0;
  const bestDay = t(DAYS[steps.indexOf(Math.max(...steps))]);

  // общая оценка: шаги 35%, сон 30%, вода 20%, ИМТ 15%
  const bmiOk = bmi >= 18.5 && bmi < 25;
  const score = Math.round(
    0.35 * Math.min(avgSteps / goal, 1) * 100 +
    0.30 * Math.min(avgSleep / 8, 1) * 100 +
    0.20 * Math.min(waterGlasses / 8, 1) * 100 +
    0.15 * (bmiOk ? 100 : 60)
  );
  $("ring").style.strokeDashoffset = 302 * (1 - score / 100);
  $("scoreText").textContent = score;

  latestFacts = {
    bmi: bmi.toFixed(1), kcal, avgSteps, goal, goalDays,
    avgSleep: avgSleep.toFixed(1), water: waterGlasses,
    weightChangeKg: weightChange.toFixed(1), score
  };

  const statCards = [
    ["Avg steps", avgSteps],
    ["Best day", bestDay],
    ["Goal days", goalDays + "/7"],
    ["Avg sleep", avgSleep.toFixed(1) + " " + t("h")],
    ["Weight Δ", weightChange.toFixed(1) + " " + t("kg")]
  ];
  $("stats").innerHTML = statCards.map(s =>
    `<div><div class="big" style="font-size:22px">${s[1]}</div><div class="muted">${t(s[0])}</div></div>`
  ).join("");

  // текстовые выводы
  const tips = [];

  if (avgSteps >= goal) tips.push(t("Steps average above goal. Keep it steady."));
  else tips.push(tFormat("Average is {n} steps under goal. Try a 10-minute walk after meals.", { n: goal - avgSteps }));

  if (avgSleep >= 7) tips.push(t("Sleep is in a healthy general range (7–9 h)."));
  else tips.push(t("Sleep averages under 7 h. Try a fixed bedtime and no screens before bed."));

  if (waterGlasses >= 6) tips.push(t("Hydration looks good today."));
  else tips.push(t("Drink another glass or two of water today."));

  if (Math.abs(weightChange) < 0.3) tips.push(t("Weight is stable."));
  else if (weightChange < 0) tips.push(tFormat("Weight down {n} kg. Slow change is safest.", { n: Math.abs(weightChange).toFixed(1) }));
  else tips.push(tFormat("Weight up {n} kg. Small swings are normal.", { n: weightChange.toFixed(1) }));

  $("insights").innerHTML = tips.map(tip => `<li>${tip}</li>`).join("");

  saveData();
}

$("calcBtn").onclick = analyse;

$("addWeightBtn").onclick = () => {
  const value = parseFloat($("newWeight").value);
  if (value > 20 && value < 400) {
    weights.push(value);
    $("weight").value = value;
    $("newWeight").value = "";
    drawWeightLine();
    analyse();
  }
};

$("addSleepBtn").onclick = () => {
  const value = parseFloat($("newSleep").value);
  if (value >= 0 && value <= 16) {
    sleepHours.push(value);
    if (sleepHours.length > 7) sleepHours.shift();   // держим только последние 7
    $("newSleep").value = "";
    drawBars("sleepChart", sleepHours, x => x, 10);
    analyse();
  }
};


// =====================================================================
// 6. AI (Claude through the page runtime)
// =====================================================================

const BASE_PROMPT =
  "You are DenimSau, a friendly educational fitness assistant. " +
  "Give general, safe, concise advice (under 150 words) on exercise, nutrition and healthy habits. " +
  "Never diagnose, never recommend extreme diets, fasting or dangerous training; suggest a doctor for medical issues. " +
  "Say your advice is informational.";

function systemPrompt() {
  const names = { en: "English", ru: "Russian", kk: "Kazakh" };
  return BASE_PROMPT + " Reply in " + names[lang] + ".";
}

let sample = null;   // функция ИИ, если она доступна

function showMode() {
  $("modeText").textContent = t(sample
    ? "Mode: AI (Claude), live responses."
    : "Mode: offline rule-based answers (AI not available in this view).");
}

// ИИ работает через наш сервер на Vercel (папка api/)
if (location.protocol === "https:") {
  sample = async (input, options = {}) => {
    const messages = typeof input === "string" ? [{ role: "user", content: input }] : input;
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    if (!response.ok) throw new Error("AI server error");
    const data = await response.json();
    if (options.onText) options.onText({ text: data.text });
    return { text: data.text };
  };
}
showMode();
$("aiBtn").onclick = async () => {
  const out = $("aiOutput");
  if (!sample) {
    out.textContent = t("AI explanation unavailable here; see the rule-based insights above.");
    return;
  }
  out.textContent = t("Thinking…");
  try {
    const prompt = systemPrompt() +
      "\nExplain these simulated stats to a beginner in 3 short bullets plus one practical tip:\n" +
      JSON.stringify(latestFacts);
    await sample(prompt, { onText: chunk => out.textContent = chunk.text });
  } catch (e) {
    out.textContent = t("AI unavailable right now.");
  }
};


// =====================================================================
// 7. WORKOUTS
// =====================================================================

const WORKOUTS = {
  Beginner: ["Full-body, 3 days/week", [
    ["Bodyweight squat", "3×10"], ["Knee push-up", "3×8"], ["Glute bridge", "3×12"], ["Plank", "3×20 s"]
  ]],
  Cardio: ["3–4 days/week, 20+ min", [
    ["Brisk walk or jog", "20 min"], ["Cycling", "20 min"], ["Intervals 1 fast/2 easy", "6 rounds"]
  ]],
  Strength: ["Upper/lower, 4 days/week", [
    ["Squat", "3×8–12"], ["Row", "3×10"], ["Overhead press", "3×8–10"], ["Romanian deadlift", "3×8"]
  ]],
  Mobility: ["10 minutes daily", [
    ["Cat-cow", "10 reps"], ["Hip flexor stretch", "30 s/side"], ["Thoracic rotation", "8/side"], ["Hamstring stretch", "30 s/side"]
  ]]
};
let currentWorkout = "Beginner";

function renderWorkoutTabs() {
  $("workoutTabs").innerHTML = Object.keys(WORKOUTS).map(name =>
    `<button data-name="${name}" class="${name === currentWorkout ? "active" : ""}">${t(name)}</button>`
  ).join("");
}

function showWorkout(name) {
  currentWorkout = name;
  const [description, exercises] = WORKOUTS[name];

  $("workoutBody").innerHTML =
    `<h3>${t(name)}: ${t(description)}</h3>` +
    exercises.map(ex => `<div class="exercise"><span>${t(ex[0])}</span><b>${t(ex[1])}</b></div>`).join("") +
    `<p class="muted">${t("Use a weight that leaves 2 reps in reserve. Stop if you feel sharp pain, dizziness or chest discomfort.")}</p>`;

  document.querySelectorAll("#workoutTabs button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.name === name);
  });
}

$("workoutTabs").onclick = e => {
  if (e.target.dataset.name) showWorkout(e.target.dataset.name);
};

// ----- недельный план -----
const SESSIONS = {
  full:   ["Full body",   "Squats, push-ups, rows, glute bridge, plank"],
  cardio: ["Cardio",      "Brisk walk, jog or cycling at a talking pace"],
  inter:  ["Intervals",   "1 min fast / 2 min easy, repeated"],
  upper:  ["Upper body",  "Push-ups, rows, overhead press, curls"],
  lower:  ["Lower body",  "Squats, lunges, glute bridge, calf raises"],
  mob:    ["Mobility",    "Cat-cow, hip flexor, thoracic rotation, hamstring stretch"]
};

// в какие дни недели (0 = Пн) тренируемся, в зависимости от числа дней
const TRAINING_DAYS = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5]
};

// порядок типов занятий для каждой цели
const SESSION_ORDER = {
  g: ["full", "cardio", "full", "mob", "cardio", "full"],
  f: ["cardio", "full", "inter", "full", "cardio", "mob"],
  s: ["upper", "lower", "full", "upper", "lower", "mob"]
};

let planSettings = null;
let completed = {};

function renderPlan() {
  const out = $("planOutput");
  if (!planSettings) {
    out.innerHTML = "";
    $("planProgress").textContent = "";
    return;
  }

  const { minutes, level, goal, days } = planSettings;
  const trainingDays = TRAINING_DAYS[days];
  let sessionIndex = 0;

  out.innerHTML = DAYS.map((day, i) => {
    if (!trainingDays.includes(i)) {
      return `<div class="exercise"><span><b>${t(day)}</b> · ${t("Rest or easy walk")}</span><span>😴</span></div>`;
    }
    const type = SESSION_ORDER[goal][sessionIndex % 6];
    sessionIndex++;
    const session = SESSIONS[type];
    const sets = t(level === "b" ? "2–3 sets, easy pace" : "3–4 sets, steady pace");

    return `<div class="exercise">
      <label style="margin:0; display:flex; gap:10px; color:var(--text); font-size:15px">
        <input type="checkbox" data-day="${i}" ${completed[i] ? "checked" : ""} style="width:auto; margin-top:6px">
        <span><b>${t(day)}</b> · ${t(session[0])} · ${minutes} ${t("min")}<br>
        <span class="muted">${t("Warm-up")} 5 · ${t(session[1])} (${sets}) · ${t("Cool-down")} 5</span></span>
      </label>
    </div>`;
  }).join("");

  const doneCount = trainingDays.filter(i => completed[i]).length;
  const percent = doneCount / trainingDays.length * 100;
  $("planProgress").innerHTML =
    `${t("Completed")} ${doneCount}/${trainingDays.length} ${t("sessions")}
     <div style="height:8px; background:var(--border); border-radius:9px; margin:6px 0 10px">
       <div style="height:8px; width:${percent}%; background:var(--accent); border-radius:9px"></div>
     </div>`;
}

$("planBtn").onclick = () => {
  planSettings = {
    days: Number($("planDays").value),
    minutes: Number($("planMinutes").value),
    level: $("planLevel").value,
    goal: $("planGoal").value
  };
  completed = {};
  renderPlan();
};

$("planOutput").onchange = e => {
  const day = e.target.dataset.day;
  if (day === undefined) return;
  completed[day] = e.target.checked;
  renderPlan();
};

// ----- интервальный таймер: 30 сек работа / 10 сек отдых -----
let timerId = null;
let phase = "work";
let secondsLeft = 30;
let round = 1;

function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return mm + ":" + ss;
}

function showTimer() {
  $("timerDisplay").textContent = formatTime(secondsLeft);
  $("timerLabel").textContent = t(phase === "work" ? "WORK" : "REST") + " · " + t("round") + " " + round;
}

$("timerStart").onclick = () => {
  // если уже идёт, ставим на паузу
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    $("timerStart").textContent = t("Resume");
    return;
  }
  $("timerStart").textContent = t("Pause");
  showTimer();

  timerId = setInterval(() => {
    secondsLeft--;
    if (secondsLeft < 0) {
      if (phase === "work") {
        phase = "rest";
        secondsLeft = 10;
      } else {
        phase = "work";
        secondsLeft = 30;
        round++;
      }
    }
    showTimer();
  }, 1000);
};

$("timerReset").onclick = () => {
  clearInterval(timerId);
  timerId = null;
  phase = "work";
  secondsLeft = 30;
  round = 1;
  $("timerStart").textContent = t("Start");
  $("timerDisplay").textContent = "00:30";
  $("timerLabel").textContent = t("Ready: 30 s work / 10 s rest");
};

// ----- план питания -----
const MEALS = {
  Balanced: [
    ["Breakfast", "Oats, banana, nuts, milk or yogurt"],
    ["Lunch",     "Chicken, rice, vegetable salad"],
    ["Snack",     "Cottage cheese with fruit"],
    ["Dinner",    "Fish or lean beef, potatoes, vegetables"]
  ],
  Vegetarian: [
    ["Breakfast", "Eggs or tofu scramble, whole-grain toast"],
    ["Lunch",     "Lentil soup, rice, salad"],
    ["Snack",     "Yogurt, nuts, apple"],
    ["Dinner",    "Chickpea curry, vegetables, flatbread"]
  ]
};
const MEAL_SHARES = [0.25, 0.30, 0.15, 0.30];   // доля калорий на каждый приём пищи

$("mealBtn").onclick = () => {
  const baseKcal = Number($("kcal").textContent) || 2200;
  const target = Math.max(1400, baseKcal + Number($("mealGoal").value));   // меньше 1400 не предлагаем

  const header = `<b>${t("Target about")} ${target} kcal</b> <span class="muted">(${t("estimate; minimum shown is 1400")})</span>`;
  const rows = MEALS[$("mealStyle").value].map((meal, i) =>
    `<div class="exercise">
       <span><b>${t(meal[0])}</b> · ${t(meal[1])}</span>
       <span>~${Math.round(target * MEAL_SHARES[i])} kcal</span>
     </div>`
  ).join("");

  $("mealOutput").innerHTML = header + rows;
};


// =====================================================================
// 8. CHAT
// =====================================================================

const history = [];
const suggestions = ["Beginner workout plan", "What to eat after training?", "How much sleep do I need?", "How to build a habit?"];

$("chips").innerHTML = suggestions.map(s => `<button class="chip">${s}</button>`).join("");
$("chips").onclick = e => {
  if (e.target.className === "chip") {
    $("question").value = e.target.textContent;
    sendMessage();
  }
};

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  $("chat").appendChild(div);
  $("chat").scrollTop = 1e9;
  return div;
}

addMessage("Hi! I\u2019m DenimSau. Ask about workouts, nutrition or habits. I\u2019m informational only, not a doctor.", "bot");

// запасные ответы, если ИИ недоступен (ищем ключевые слова на трёх языках)
function offlineAnswer(question) {
  const q = question.toLowerCase();

  if (/(pain|chest|dizz|diagnos|disease|medic|боль|боли|головокруж|диагноз|болезн|ауыру|ауру|бас айн)/.test(q))
    return t("I can\u2019t diagnose or give medical advice. Please see a doctor, especially for pain, dizziness or chest symptoms.");

  if (/(protein|eat|food|diet|meal|nutrition|еда|еду|есть|питан|белок|диет|тамақ|жеу)/.test(q))
    return t("Build plates around vegetables, a protein source, whole-grain carbs and some healthy fat. Drink water and avoid extreme diets.");

  if (/(beginner|start|workout|plan|начина|трениров|план|жаттығу|бастау|жоспар)/.test(q))
    return t("Try 3 full-body sessions a week: squats, knee push-ups, glute bridges and a plank (3 sets each), plus a 20-minute walk on other days.");

  if (/(sleep|rest|recover|сон|спать|отдых|ұйқы|демал)/.test(q))
    return t("Most adults do well with 7–9 hours. Keep a regular schedule and take rest days between hard sessions.");

  if (/(habit|motivat|consisten|привыч|мотивац|әдет)/.test(q))
    return t("Start tiny (5 minutes), tie it to an existing routine, track it, and never miss twice in a row.");

  if (/(weight|lose|fat|вес|похуд|жир|салмақ)/.test(q))
    return t("Slow progress lasts: a modest calorie deficit, daily walking, strength training and good sleep. Avoid crash diets.");

  return t("I can help with workouts, nutrition, sleep and habits. Try one of the suggestions above.");
}

async function sendMessage() {
  const question = $("question").value.trim();
  if (!question) return;

  $("question").value = "";
  addMessage(question, "user");
  history.push({ role: "user", content: question });

  const botBubble = addMessage("…", "bot");
  let answer;

  if (sample) {
    try {
      // отправляем последние 6 сообщений как контекст
      const context = history.slice(-6).map(m => m.role + ": " + m.content).join("\n");
      const result = await sample(
        [{ role: "user", content: systemPrompt() + "\n\nConversation so far:\n" + context }],
        {
          cache: false,
          onText: chunk => {
            botBubble.textContent = chunk.text;
            $("chat").scrollTop = 1e9;
          }
        }
      );
      answer = result.text;
    } catch (e) {
      answer = offlineAnswer(question);
    }
  } else {
    answer = offlineAnswer(question);
  }

  botBubble.textContent = answer;
  history.push({ role: "assistant", content: answer });
}

$("sendBtn").onclick = sendMessage;
$("question").onkeydown = e => { if (e.key === "Enter") sendMessage(); };


// =====================================================================
// 9. VIDEOS
// =====================================================================

function videoSlotHtml(video, i) {
  let content;
  if (video.src) {
    content = `<video controls playsinline preload="metadata" style="width:100%; border-radius:10px" src="${video.src}"></video>`;
  } else {
    content = `<div id="videoSlot${i}" style="aspect-ratio:16/9; border:2px dashed var(--border); border-radius:10px; display:grid; place-items:center; text-align:center; padding:10px">
      <div>🎬 Video slot ${i + 1}
        <div class="muted">Add the file in MEDIA.videos, or preview:</div>
        <input type="file" accept="video/*" data-i="${i}">
      </div></div>`;
  }
  const credit = video.credit ? `<div class="muted">Source: ${video.credit}</div>` : "";
  return `<div class="card"><h3>${video.title}</h3>${content}${credit}</div>`;
}

$("videos").innerHTML = MEDIA.videos.map(videoSlotHtml).join("");

$("videos").onchange = e => {
  const i = e.target.dataset.i;
  const file = e.target.files[0];
  if (i === undefined || !file) return;
  $("videoSlot" + i).outerHTML =
    `<video controls playsinline style="width:100%; border-radius:10px" src="${URL.createObjectURL(file)}"></video>`;
};


// =====================================================================
// 10. MUSIC (own track or generated ambient + visualizer)
// =====================================================================

const bgm = $("bgm");
let audioCtx, masterGain, analyser;
let ambientTimer, animationFrame;
let isPlaying = false;

// ноты для генерируемого фона (примерно минорная гамма)
const NOTES = [220, 246.9, 277.2, 329.6, 370, 440, 493.9, 554.4];

function showMusicText() {
  $("musicText").textContent = t(bgm.getAttribute("src")
    ? "Playing your track (loops)."
    : "Music slot: no track added yet. A generated ambient placeholder plays until you add your file.");
}
if (MEDIA.music) bgm.src = MEDIA.music;
showMusicText();

function playNote(freq, startTime, duration) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(masterGain);
  // плавное нарастание и затухание
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.6);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.1);
}

function randomNote() {
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}

function ambientTick() {
  const now = audioCtx.currentTime;
  playNote(randomNote(), now, 3);
  if (Math.random() < 0.5) playNote(randomNote() / 2, now + 0.5, 4);
}

function drawVisualizer() {
  const canvas = $("visualizer");
  const ctx2d = canvas.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  ctx2d.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  for (let i = 0; i < 48; i++) {
    const h = data[i * 2] / 255 * canvas.height;
    ctx2d.fillRect(i * 12.5, canvas.height - h, 9, h);
  }
  animationFrame = requestAnimationFrame(drawVisualizer);
}

function stopMusic() {
  clearInterval(ambientTimer);
  cancelAnimationFrame(animationFrame);
  bgm.pause();
  isPlaying = false;
  $("playBtn").textContent = "▶ " + t("Play");
}


$("playBtn").onclick = () => {
  try {
    // аудио-контекст создаём только после клика (так требует браузер)
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = Number($("volume").value);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    if (isPlaying) {
      stopMusic();
      return;
    }
    audioCtx.resume();

    if (bgm.getAttribute("src")) {
      // свой трек: подключаем к анализатору только один раз
      if (!bgm.connected) {
        audioCtx.createMediaElementSource(bgm).connect(masterGain);
        bgm.connected = true;
      }
      bgm.loop = true;
      bgm.play();
    } else {
      ambientTick();
      ambientTimer = setInterval(ambientTick, 1400);
    }

    isPlaying = true;
    drawVisualizer();
    $("playBtn").textContent = "⏸ " + t("Pause");
  } catch (e) {
    $("playBtn").textContent = t("Audio unavailable");
  }
};

$("volume").oninput = e => {
  if (masterGain) masterGain.gain.value = Number(e.target.value);
};


// =====================================================================
// 11. ABOUT PAGE CHECKLIST
// =====================================================================

const requiredComponents = [
  ["Hero section", "Home"],
  ["AI-generated images", "Home: hero and illustration gallery"],
  ["Analytical text", "Home"],
  ["AI agent", "Dashboard"],
  ["Video / animation", "Workouts: video slots and breathing animation"],
  ["AI music", "AI Assistant: your track, Play/Pause, volume"],
  ["Chatbot", "AI Assistant"]
];

function renderChecklist() {
  $("checklist").innerHTML = requiredComponents.map(c =>
    `<div class="exercise"><span>✓ ${t(c[0])}</span><span class="muted">${t(c[1])}</span></div>`
  ).join("");
}


// =====================================================================
// 12. START
// =====================================================================

// перерисовываем всё, что зависит от языка
function renderAll() {
  drawBars("sleepChart", sleepHours, x => x, 10);
  drawWeightLine();
  drawWater();
  analyse();
  renderWorkoutTabs();
  showWorkout(currentWorkout);
  renderGallery();
  renderKpi();
  renderChecklist();
  showMode();
  showMusicText();
  renderPlan();
  $("playBtn").textContent = isPlaying ? "⏸ " + t("Pause") : "▶ " + t("Play");
  translatePage();
}

restoreProfile();
$("printBtn").onclick = () => window.print();

$("langSelect").value = lang;
$("langSelect").onchange = () => {
  lang = $("langSelect").value;
  try { localStorage.setItem("hm_lang", lang); } catch (e) {}
  renderAll();
};

renderAll();