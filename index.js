const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;

async function runAgent(userMessage) {
  // Логируем для диагностики (увидим в Logs на Render)
  console.log(`Запрос к модели: ${MODEL_NAME}`);
  
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
  
  if (data.error) {
    console.error("Ошибка API:", data.error);
    return `Ошибка от API: ${data.error.message || JSON.stringify(data.error)}`;
  }
  
  return data.choices[0].message.content;
}

app.get('/', (req, res) => res.send('Агент готов к работе! ✅'));
app.post('/ask', async (req, res) => {
  try {
    const reply = await runAgent(req.body.message);
    res.json({ reply });
  } catch (err) {
    console.error("Системная ошибка:", err);
    res.json({ error: 'Произошла ошибка в коде сервера.' });
  }
});

app.listen(process.env.PORT || 3000);
