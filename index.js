const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Берем данные прямо из системы
    const key = process.env.API_KEY;
    const url = process.env.BASE_URL;
    const model = process.env.MODEL_NAME;

    console.log(`>>> Проверка: URL=${url}, Model=${model}, Key присутствует=${!!key}`);

    if (!key) {
      return res.json({ error: "Ключ API_KEY не найден в настройках Render!" });
    }

    const response = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: message }]
      })
    });

    const data = await response.json();
    console.log(">>> Ответ от API:", JSON.stringify(data));
    
    if (data.error) {
      res.json({ reply: `Ошибка от Polza: ${data.error.message || JSON.stringify(data.error)}` });
    } else {
      res.json({ reply: data.choices[0].message.content });
    }

  } catch (err) {
    console.log("!!! Ошибка:", err.message);
    res.json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Сервер активен! Жду запрос. 🚀'));
app.listen(process.env.PORT || 3000);
