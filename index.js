const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

// --- ПЕРЕМЕННЫЕ ДЛЯ ПАМЯТИ ---
let chatHistory = []; // Тут храним последние 10 сообщений
let personalBase = "Машина: Hyundai Solaris (щетки 650/400). Диета: Стол №5. Кот любит кролика."; // База знаний

// --- ИНТЕРФЕЙС ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ИИ Агент с Памятью</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; margin: 0; display: flex; height: 100vh; }
            #sidebar { width: 250px; background: #34495e; color: white; padding: 15px; display: flex; flex-direction: column; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; }
            #login-screen { position: fixed; inset: 0; background: #2c3e50; display: flex; justify-content: center; align-items: center; z-index: 100; }
            .login-box { background: white; padding: 20px; border-radius: 10px; color: black; text-align: center; }
            #messages { flex: 1; overflow-y: auto; padding: 20px; }
            .msg { margin-bottom: 10px; padding: 10px; border-radius: 10px; max-width: 80%; }
            .user { background: #0084ff; color: white; margin-left: auto; }
            .bot { background: white; border: 1px solid #ddd; }
            textarea { width: 100%; height: 100px; margin-top: 10px; }
            .input-area { padding: 20px; display: flex; gap: 10px; background: white; }
            input[type="text"] { flex: 1; padding: 10px; border: 1px solid #ddd; }
            button { padding: 10px 20px; background: #27ae60; color: white; border: none; cursor: pointer; }
        </style>
    </head>
    <body>
        <div id="login-screen">
            <div class="login-box">
                <h2>Доступ закрыт</h2>
                <input type="password" id="pass" placeholder="Пароль">
                <button onclick="login()">Войти</button>
            </div>
        </div>

        <div id="sidebar">
            <h3>🏠 База знаний</h3>
            <p style="font-size: 12px;">Отредактируйте и нажмите Сохранить:</p>
            <textarea id="baseData">${personalBase}</textarea>
            <button onclick="saveBase()" style="margin-top:5px; background:#2980b9">Сохранить базу</button>
            <hr>
            <button onclick="chatHistory=[]" style="background:#c0392b">Очистить память беседы</button>
        </div>

        <div id="main">
            <div id="messages"></div>
            <div class="input-area">
                <input type="text" id="userInput" placeholder="Спросите о чем угодно...">
                <button onclick="send()">Отправить</button>
            </div>
        </div>

        <script>
            let psw = '';
            function login() {
                psw = document.getElementById('pass').value;
                document.getElementById('login-screen').style.display = 'none';
            }

            function saveBase() {
                const text = document.getElementById('baseData').value;
                fetch('/update_base', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ password: psw, newBase: text })
                }).then(() => alert('База обновлена!'));
            }

            async function send() {
                const inp = document.getElementById('userInput');
                const box = document.getElementById('messages');
                const text = inp.value;
                if(!text) return;

                box.innerHTML += '<div class="msg user"><b>Вы:</b> ' + text + '</div>';
                inp.value = '';

                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: text, password: psw })
                });
                const data = await res.json();
                box.innerHTML += '<div class="msg bot"><b>ИИ:</b> ' + (data.reply || data.error) + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

// --- ОБНОВЛЕНИЕ БАЗЫ ЗНАНИЙ ---
app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) {
        personalBase = req.body.newBase;
        res.json({ status: 'ok' });
    }
});

// --- ЛОГИКА АГЕНТА ---
app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.status(401).json({ error: "Нет доступа" });

    // Формируем "контекст" для ИИ
    const historyContext = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');
    
    const systemPrompt = `Ты персональный помощник Олега. 
    Твоя база знаний: ${personalBase}
    
    История последних сообщений:
    ${historyContext}
    
    Используй эти данные, чтобы отвечать точно. Если чего-то нет в базе, отвечай на основе своих общих знаний.`;

    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ]
            })
        });
        const data = await response.json();
        const reply = data.choices[0].message.content;

        // Сохраняем в память
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 10) chatHistory.shift(); // Храним только последние 10 реплик

        res.json({ reply });
    } catch (err) {
        res.json({ error: "Ошибка сервера" });
    }
});

app.listen(process.env.PORT || 3000);
