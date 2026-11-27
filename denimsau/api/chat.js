
const BASE_PROMPT =
  "You are DenimSau, a friendly educational fitness assistant. " +
  "Give general, safe, concise advice (under 150 words) on exercise, nutrition and healthy habits. " +
  "Never diagnose, never recommend extreme diets, fasting or dangerous training; " +
  "suggest a doctor for medical issues. Say your advice is informational. " +
  "If the question is not about fitness, health or habits, politely say you can only help with those topics.";

const LANGS = { en: "English", ru: "Russian", kk: "Kazakh" };
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
// Если первая модель перегружена, пробуем следующие. Свою можно задать в GEMINI_MODEL.
const GEMINI_MODELS = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-flash-lite-latest"]
  .filter((m, i, arr) => m && arr.indexOf(m) === i);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_MESSAGES = 8;     // сколько последних сообщений принимаем
const MAX_CHARS = 4000;     // максимальная длина одного сообщения

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }
  const useGemini = Boolean(process.env.GEMINI_API_KEY);
  if (!useGemini && !process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "No API key on the server: add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in Vercel and redeploy" });
    return;
  }

  // Vercel обычно сам разбирает JSON, но на всякий случай обрабатываем и строку
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const lang = LANGS[body.lang] ? body.lang : "en";
  const incoming = Array.isArray(body.messages) ? body.messages : [];

  // берём только нормальные сообщения и обрезаем длинные
  let messages = incoming
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // диалог должен начинаться с пользователя и роли должны чередоваться
  while (messages.length && messages[0].role !== "user") messages.shift();
  messages = messages.reduce((acc, m) => {
    const last = acc[acc.length - 1];
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else acc.push({ ...m });
    return acc;
  }, []);

  if (!messages.length) {
    res.status(400).json({ error: "No messages" });
    return;
  }

  const system = BASE_PROMPT + " Reply in " + LANGS[lang] + ".";

  try {
    let response;
    if (useGemini) {
      const payload = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: 1000 }
      });
      // перебираем модели; при перегрузке (503/500) или лимите (429) делаем паузу и идём дальше
      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(GEMINI_MODELS[i]) + ":generateContent",
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
            body: payload
          }
        );
        const retryable = [404, 429, 500, 503].includes(response.status);
        if (response.ok || !retryable) break;
        if (i < GEMINI_MODELS.length - 1) await sleep(800);
      }
    } else {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 400, system, messages })
      });
    }

    if (!response.ok) {
      // передаём причину на сайт, чтобы было видно, что именно сломалось
      let detail = "";
      try {
        const err = await response.json();
        detail = (err && err.error && err.error.message) || "";
      } catch (e) {}
      res.status(502).json({ error: "AI service error", status: response.status, detail });
      return;
    }

    const data = await response.json();
    let text;
    if (useGemini) {
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      text = parts.map(part => part.text || "").join("").trim();
    } else {
      text = (data.content || []).map(part => part.text || "").join("").trim();
    }
    if (!text) {
      res.status(502).json({ error: "AI service error", detail: "Empty answer (the request may have been blocked by the safety filter)" });
      return;
    }
    res.status(200).json({ text });
  } catch (error) {
    res.status(502).json({ error: "Could not reach AI service" });
  }
};
