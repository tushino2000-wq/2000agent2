const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;

async function runAgent(userMessage) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  const data = await response.json();
  // Если Polza вернет ошибку, мы увидим её в логах
  if (data.error) return `Ошибка от Polza: ${data.error.message}`;
  return data.choices[0].message.content;
}

app.get('/', (req, res) => res.send('Агент через Polza.ai готов! 🚀'));
app.post('/ask', async (req, res) => {
  try {
    const reply = await runAgent(req.body.message);
    res.json({ reply });
  } catch (err) { res.json({ error: 'Проверь настройки API в Render!' }); }
});

app.listen(process.env.PORT || 3000);
