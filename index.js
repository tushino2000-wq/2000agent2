const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const userMsg = req.body.message;
  const apiKey = process.env.API_KEY;
  const baseUrl = process.env.BASE_URL;
  const model = process.env.MODEL_NAME;

  // Лог для тебя (увидишь в панели Render)
  console.log("Пытаюсь отправить запрос...");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    
    // Если всё хорошо, выдаем ответ ИИ
    if (data.choices && data.choices[0]) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      // Если Polza ругается, выдаем её ошибку как есть
      res.json({ error_from_polza: data });
    }

  } catch (err) {
    res.json({ system_error: err.message });
  }
});

app.get('/', (req, res) => res.send('Сервер готов. Жду команду!'));
app.listen(process.env.PORT || 3000);
