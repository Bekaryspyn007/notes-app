// Серверная функция для Vercel.
// Сайт отправляет сюда сообщения, а мы спрашиваем Claude и возвращаем ответ.
// Ключ API берётся из переменной окружения ANTHROPIC_API_KEY (настраивается
// в Vercel). Писать ключ прямо в код нельзя: его увидят все.

const SYSTEM_PROMPT =
  "You are DenimSau, a friendly educational fitness assistant. " +
  "Give general, safe, concise advice (under 150 words) on exercise, nutrition and healthy habits. " +
  "Never diagnose, never recommend extreme diets, fasting or dangerous training; " +
  "suggest a doctor for medical issues. Say your advice is informational. " +
  "If the question is not about fitness, health or habits, politely say you can only help with those topics.";

const MODEL = "claude-haiku-5-5";   // самая дешёвая и быстрая модель
const MAX_MESSAGES = 6;             // сколько последних сообщений принимаем
const MAX_CHARS = 4000;             // максимальная длина одного сообщения

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: "API key is not set on the server" });
    return;
  }

  // берём только нормальные сообщения и обрезаем длинные
  const incoming = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  let messages = incoming
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  // диалог должен начинаться с сообщения пользователя
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) {
    res.status(400).json({ error: "No messages" });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages
      })
    });

    if (!response.ok) {
      res.status(502).json({ error: "AI service error" });
      return;
    }

    const data = await response.json();
    const text = (data.content || []).map(part => part.text || "").join("");
    res.status(200).json({ text });
  } catch (error) {
    res.status(502).json({ error: "Could not reach AI service" });
  }
};