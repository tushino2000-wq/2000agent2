const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;

async function runAgent(userMessage) {
  console.log(`>>> Отправляю запрос к: ${MODEL_NAME} по адресу: ${BASE_URL}`);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY.trim()}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    
    // Если в ответе есть ошибка от Polza - выводим её в консоль Render
    if (data.error) {
      console.log("!!! Ошибка от API Polza:", JSON.stringify(data.error));
      return `Ошибка от Polza: ${data.error.message || JSON.stringify(data.error)}`;
    }

    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content;
    } else {
      console.log("??? Неожиданный ответ API:", JSON.stringify(data));
      return "API прислал странный ответ без текста.";
    }

  } catch (error) {
    console.log("!!! Критическая ошибка в runAgent:", error.message);
    throw error;
  }
}

app.get('/', (req, res) => res.send('Диагностика включена! Жду curl запрос. 🚀'));

app.post('/ask', async (req, res) => {
  try {
    const reply = await runAgent(req.body.message);
    res.json({ reply });
  } catch (err) {
    console.log("!!! Ошибка в роуте /ask:", err.message);
    res.json({ error: 'Системная ошибка. Смотри логи Render!' });
  }
});

app.listen(process.env.PORT || 3000);
