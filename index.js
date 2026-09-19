const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Имя: Олег. Москва. Solaris. Стол №5."; 

// Инструмент 1: Погода
async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

// Инструмент 2: Точное мировое время
function getTimeInCity(city) {
    try {
        // Карта часовых поясов для основных направлений
        const zones = {
            "токио": "Asia/Tokyo", "лондон": "Europe/London", "нью-йорк": "America/New_York",
            "берлин": "Europe/Berlin", "париж": "Europe/Paris", "пекин": "Asia/Shanghai",
            "дубай": "Asia/Dubai", "минск": "Europe/Minsk", "стамбул": "Europe/Istanbul"
        };
        const zone = zones[city.toLowerCase()] || "UTC";
        return new Date().toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit' });
    } catch (e) { return "не удалось вычислить время"; }
}

app.get('/', (req, res) => res.send(`<h2>🔐 Защищено</h2>`));

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("ДОСТУП ЗАПРЕЩЕН!");
  res.send(`
    <html><head><meta charset="UTF-8"><title>Агент 2000</title>
    <style>
        body { font-family: sans-serif; background: #f0f2f5; padding: 15px; }
        #box { height: 450px; border: 1px solid #ccc; overflow-y: auto; background: white; padding: 15px; border-radius: 10px; margin-bottom: 10px; }
        .msg { margin-bottom: 10px; padding: 10px; border-radius: 8px; max-width: 85%; }
        .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
        .b { background: #e4e6eb; color: black; }
        input { width: 70%; padding: 12px; border-radius: 5px; border: 1px solid #ccc; }
        button { padding: 12px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; }
    </style></head>
    <body>
        <h3>🕵️‍♂️ Умный Агент Олега</h3>
        <div id="box"></div>
        <input type="text" id="inp" placeholder="Время в Токио? Погода в Минске?" onkeypress="if(event.key==='Enter') send()">
        <button onclick="send()">ОТПРАВИТЬ</button>
        <script>
            const box = document.getElementById('box');
            async function send() {
                const inp = document.getElementById('inp');
                const val = inp.value; if(!val) return;
                box.innerHTML += '<div class="msg u"><b>Вы:</b> ' + val + '</div>';
                inp.value = ''; box.scrollTop = box.scrollHeight;
                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: val, password: '${userPass}' })
                });
                const data = await res.json();
                box.innerHTML += '<div class="msg b"><b>ИИ:</b> ' + (data.reply || "Ошибка") + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body></html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });

    const moscowTime = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });

    const systemPrompt = `Ты агент Олега. База: ${personalBase}. 
    Сейчас в Москве: ${moscowTime}.
    Если спрашивают погоду, пиши: TOOL:WEATHER(Город).
    Если спрашивают время в другом городе, пиши: TOOL:TIME(Город).`;

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

        // Обработка ПОГОДЫ
        if (reply.includes('TOOL:WEATHER')) {
            const match = reply.match(/TOOL:WEATHER\(([^)]+)\)/);
            if (match) reply = "Погода в " + match[1] + ": " + await getWeather(match[1]);
        }

        // Обработка ВРЕМЕНИ
        if (reply.includes('TOOL:TIME')) {
            const match = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (match) reply = "Время в " + match[1] + " сейчас: " + getTimeInCity(match[1]);
        }
        
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
