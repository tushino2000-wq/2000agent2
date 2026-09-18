const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Машина: Hyundai Solaris. Диета: Стол №5."; 

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Агент 2000</title>
        <style>
            body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
            #login { text-align: center; margin-top: 50px; }
            #chat-ui { display: none; max-width: 600px; margin: auto; }
            #box { height: 400px; border: 1px solid #ccc; overflow-y: auto; background: white; padding: 10px; margin-bottom: 10px; border-radius: 8px; }
            .msg { margin-bottom: 10px; padding: 8px; border-radius: 5px; }
            .u { background: #d1e7ff; text-align: right; }
            .b { background: #e2e3e5; }
            img { max-width: 100%; display: block; margin-top: 10px; border-radius: 5px; }
            input { width: 70%; padding: 10px; }
            button { padding: 10px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div id="login">
            <h2>Введите пароль:</h2>
            <input type="text" id="passInp">
            <button onclick="go()">Войти</button>
        </div>
        <div id="chat-ui">
            <div id="box"></div>
            <input type="text" id="msgInp" placeholder="Ваш вопрос...">
            <button onclick="send()">Отправить</button>
        </div>
        <script>
            let pass = '';
            function go() {
                pass = document.getElementById('passInp').value;
                document.getElementById('login').style.display = 'none';
                document.getElementById('chat-ui').style.display = 'block';
            }
            async function send() {
                const inp = document.getElementById('msgInp');
                const box = document.getElementById('box');
                const val = inp.value; if(!val) return;
                box.innerHTML += '<div class="msg u"><b>Вы:</b> ' + val + '</div>';
                inp.value = '';
                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: val, password: pass })
                });
                const data = await res.json();
                let txt = data.reply || "Ошибка";
                const urlRegex = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                txt = txt.replace(urlRegex, (url) => '<img src="' + url + '">');
                box.innerHTML += '<div class="msg b"><b>ИИ:</b> ' + txt + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Неверный пароль!" });
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    { role: 'system', content: `Ты агент Олега. База: ${personalBase}. Если просят рисовать, дай только ссылку https://pollinations.ai/p/[prompt]?width=512&height=512` },
                    { role: 'user', content: message }
                ]
            })
        });
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
