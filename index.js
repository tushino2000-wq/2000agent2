const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

app.get('/', (req, res) => {
  res.send(`
    <html>
    <body style="font-family:sans-serif; padding:20px;">
        <h2>🔐 Вход по секретной ссылке</h2>
        <p>Чтобы войти, добавьте к адресу сайта: <b>?pass=ВАШ_ПАРОЛЬ</b></p>
        <p>Пример: <i>https://my-ai-agent-2000.onrender.com/?pass=1234</i></p>
    </body>
    </html>
  `);
});

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("ДОСТУП ЗАПРЕЩЕН!");

  res.send(`
    <html>
    <body style="padding:20px; font-family:sans-serif;">
        <h3>🤖 Агент на связи (Доступ разрешен)</h3>
        <div id="box" style="height:300px; border:1px solid #ccc; overflow:auto; margin-bottom:10px; padding:10px; background:#fff;"></div>
        <input type="text" id="inp" style="width:70%; padding:10px;">
        <button onclick="send()" style="padding:10px;">ОТПРАВИТЬ</button>
        <script>
            async function send() {
                const val = document.getElementById('inp').value;
                const box = document.getElementById('box');
                box.innerHTML += '<div><b>Вы:</b> ' + val + '</div>';
                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: val, password: '${userPass}' })
                });
                const data = await res.json();
                box.innerHTML += '<div style="color:green"><b>ИИ:</b> ' + (data.reply || "Ошибка") + '</div>';
                box.scrollTop = box.scrollHeight;
                document.getElementById('inp').value = '';
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: message }]
            })
        });
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
