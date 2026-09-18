const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD; // Твой секретный пароль

// --- ИНТЕРФЕЙС С ЗАЩИТОЙ ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Вход в систему</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-box { background: #34495e; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center; }
            input { padding: 10px; border-radius: 5px; border: none; margin-bottom: 10px; width: 200px; }
            button { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; }
            #chat-container { display: none; flex-direction: column; width: 100%; max-width: 600px; background: #f0f2f5; color: black; height: 90vh; border-radius: 10px; padding: 20px; }
            #messages { flex: 1; overflow-y: auto; background: white; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .user { text-align: right; color: blue; }
            .bot { text-align: left; color: green; }
        </style>
    </head>
    <body>
        <div id="login-area" class="login-box">
            <h2>Введите пароль доступа</h2>
            <input type="password" id="passInp" placeholder="Пароль...">
            <br>
            <button onclick="checkPass()">Войти</button>
        </div>

        <div id="chat-container">
            <h3 style="text-align:center">🤖 Защищенный Агент</h3>
            <div id="messages"></div>
            <div style="display:flex; gap:10px">
                <input type="text" id="userMsg" style="flex:1" placeholder="Ваш вопрос...">
                <button onclick="send()" id="sendBtn">Отправить</button>
            </div>
        </div>

        <script>
            let savedPass = '';
            function checkPass() {
                savedPass = document.getElementById('passInp').value;
                document.getElementById('login-area').style.display = 'none';
                document.getElementById('chat-container').style.display = 'flex';
                document.body.style.background = '#bdc3c7';
            }

            async function send() {
                const msgInp = document.getElementById('userMsg');
                const msgBox = document.getElementById('messages');
                const text = msgInp.value;
                if(!text) return;

                msgBox.innerHTML += '<p class="user"><b>Вы:</b> ' + text + '</p>';
                msgInp.value = '';

                try {
                    const res = await fetch('/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text, password: savedPass })
                    });
                    const data = await res.json();
                    msgBox.innerHTML += '<p class="bot"><b>ИИ:</b> ' + (data.reply || data.error) + '</p>';
                } catch(e) {
                    msgBox.innerHTML += '<p>Ошибка связи</p>';
                }
                msgBox.scrollTop = msgBox.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

// --- ЛОГИКА С ПРОВЕРКОЙ ПАРОЛЯ ---
app.post('/ask', async (req, res) => {
  const { message, password } = req.body;

  // Проверка пароля прямо на сервере
  if (password !== MY_PASSWORD) {
    return res.status(401).json({ error: "Ошибка доступа: Неверный пароль!" });
  }

  try {
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
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.json({ error: "Ошибка API или сервера" });
  }
});

app.listen(process.env.PORT || 3000);
