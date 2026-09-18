const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;

// --- ИНТЕРФЕЙС (Красивая страничка) ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Мой ИИ Агент</title>
        <style>
            body { font-family: sans-serif; background: #f0f2f5; display: flex; flex-direction: column; align-items: center; padding: 20px; }
            #chat { width: 100%; max-width: 500px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; height: 400px; overflow-y: auto; margin-bottom: 10px; }
            .msg { margin-bottom: 10px; padding: 8px 12px; border-radius: 15px; max-width: 80%; }
            .user { background: #0084ff; color: white; align-self: flex-end; margin-left: auto; }
            .bot { background: #e4e6eb; color: black; }
            .input-area { display: flex; width: 100%; max-width: 500px; gap: 10px; }
            input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
            button { padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; }
            button:disabled { background: #ccc; }
        </style>
    </head>
    <body>
        <h2>🤖 Мой ИИ Агент</h2>
        <div id="chat"></div>
        <div class="input-area">
            <input type="text" id="userInp" placeholder="Напишите сообщение..." onkeypress="if(event.key==='Enter') send()">
            <button id="btn" onclick="send()">Отправить</button>
        </div>

        <script>
            async function send() {
                const inp = document.getElementById('userInp');
                const chat = document.getElementById('chat');
                const btn = document.getElementById('btn');
                const text = inp.value.trim();
                if (!text) return;

                // Добавляем сообщение пользователя
                chat.innerHTML += '<div class="msg user">' + text + '</div>';
                inp.value = '';
                btn.disabled = true;
                chat.scrollTop = chat.scrollHeight;

                try {
                    const res = await fetch('/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    const data = await res.json();
                    const reply = data.reply || data.error || 'Ошибка';
                    
                    // Добавляем ответ бота
                    chat.innerHTML += '<div class="msg bot">' + reply + '</div>';
                } catch (e) {
                    chat.innerHTML += '<div class="msg bot">Ошибка связи с сервером</div>';
                }
                btn.disabled = false;
                chat.scrollTop = chat.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

// --- ЛОГИКА АГЕНТА ---
app.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: 'user', content: message }]
      })
    });
    const data = await response.json();
    if (data.error) {
      res.json({ reply: 'Ошибка API: ' + data.error.message });
    } else {
      res.json({ reply: data.choices[0].message.content });
    }
  } catch (err) {
    res.json({ reply: 'Ошибка сервера: ' + err.message });
  }
});

app.listen(process.env.PORT || 3000);
