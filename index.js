const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let chatHistory = []; 
let personalBase = "Машина: Hyundai Solaris. Диета: Стол №5. Кот: любит сушеного кролика."; 

async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Агент 2000</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; margin: 0; padding: 20px; color: white; }
            #auth, #app { max-width: 600px; margin: auto; background: #34495e; padding: 20px; border-radius: 10px; }
            #app { display: none; background: #f0f2f5; color: black; }
            #box { height: 400px; overflow-y: auto; background: white; padding: 10px; border: 1px solid #ccc; margin-bottom: 10px; border-radius: 5px; }
            .u { text-align: right; color: #0084ff; margin: 5px; }
            .b { text-align: left; color: #27ae60; margin: 5px; }
            img { max-width: 100%; border-radius: 8px; margin-top: 10px; border: 1px solid #ddd; }
            input { padding: 10px; width: 70%; border-radius: 5px; border: 1px solid #ccc; }
            button { padding: 10px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div id="auth">
            <h3>Введите код доступа:</h3>
            <input type="text" id="passInp">
            <button onclick="go()">ВОЙТИ</button>
        </div>

        <div id="app">
            <div id="box"></div>
            <input type="text" id="msgInp" placeholder="Спроси о погоде или попроси нарисовать...">
            <button onclick="send()">ОТПРАВИТЬ</button>
        </div>

        <script>
            let secret = '';
            function go() {
                secret = document.getElementById('passInp').value;
                document.getElementById('auth').style.display = 'none';
                document.getElementById('app').style.display = 'block';
            }
            async function send() {
                const inp = document.getElementById('msgInp');
                const box = document.getElementById('box');
                const val = inp.value; if(!val) return;
                box.innerHTML += '<div class="u"><b>Вы:</b> ' + val + '</div>';
                inp.value = '';
                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: val, password: secret })
                });
                const data = await res.json();
                let txt = data.reply || "Ошибка";
                // Поиск картинки
                const urlRegex = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                txt = txt.replace(urlRegex, (url) => '<img src="' + url + '">');
                box.innerHTML += '<div class="b"><b>ИИ:</b> ' + txt + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка: Неверный пароль!" });

    const systemPrompt = `Ты агент Олега. База: ${personalBase}. 
    1. Погода: Если спрашивают, ответь TOOL:WEATHER(Город). 
    2. Рисование: Если просят нарисовать, дай только ссылку https://pollinations.ai/p/[description]?width=1024&height=1024&seed=123`;

    try {
        let response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
            })
        });
        let data = await response.json();
        let reply = data.choices[0].message.content;

        if (reply.includes('TOOL:WEATHER')) {
            const match = reply.match(/TOOL:WEATHER\(([^)]+)\)/);
            if (match) {
                const w = await getWeather(match[1]);
                reply = "В городе " + match[1] + " сейчас: " + w;
            }
        }
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
