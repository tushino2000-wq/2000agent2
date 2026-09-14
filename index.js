const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;

const tools = {
  getCurrentTime: () => new Date().toLocaleString('ru-RU'),
  calculate: (exp) => { try { return eval(exp).toString(); } catch(e) { return 'Ошибка'; } }
};

async function runAgent(userMessage) {
  // Упрощенный запрос к Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const prompt = `Ты ИИ-агент. Если тебя просят посчитать, ответь строго в формате TOOL: calculate(выражение). 
  Если спрашивают время, ответь строго TOOL: getCurrentTime(). 
  Задача: ${userMessage}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const data = await response.json();
  let agentReply = data.candidates[0].content.parts[0].text;

  // Проверка инструментов
  if (agentReply.includes('TOOL:')) {
    if (agentReply.includes('getCurrentTime')) return `Сейчас: ${tools.getCurrentTime()}`;
    if (agentReply.includes('calculate')) {
      const match = agentReply.match(/calculate\(([^)]+)\)/);
      return match ? `Результат: ${tools.calculate(match[1])}` : agentReply;
    }
  }
  return agentReply;
}

app.get('/', (req, res) => res.send('Агент на Gemini готов! 🚀'));
app.post('/ask', async (req, res) => {
  try {
    const reply = await runAgent(req.body.message);
    res.json({ reply });
  } catch (err) { res.json({ error: 'Ошибка Gemini. Проверь ключ!' }); }
});

app.listen(process.env.PORT || 3000);