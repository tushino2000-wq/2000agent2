const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Олег. Москва. Solaris. Стол №5."; 

// Исправленный инструмент времени: только 24-часовой формат и четкий статус суток
function getTimeDetailed(city) {
    const zones = {
        "токио": "Asia/Tokyo", "лондон": "Europe/London", "нью-йорк": "America/New_York",
        "берлин": "Europe/Berlin", "париж": "Europe/Paris", "пекин": "Asia/Shanghai",
        "дубай": "Asia/Dubai", "минск": "Europe/Minsk", "стамбул": "Europe/Istanbul",
        "москва": "Europe/Moscow"
    };
    const zone = zones[city.toLowerCase()] || "UTC";
    
    try {
        const now = new Date();
        // Жестко задаем 24-часовой формат (hour12: false)
        const timeStr = now.toLocaleString("ru-RU", { 
            timeZone: zone, 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false,
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        // Берем час отдельно для определения времени суток
        const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
        
        let period = "";
        if (hour >= 0 && hour < 6) period = "ГЛУБОКАЯ НОЧЬ";
        else if (hour >= 6 && hour < 12) period = "УТРО";
        else if (hour >= 12 && hour < 18) period = "ДЕНЬ";
        else if (hour >= 18 && hour < 24) period = "ВЕЧЕР";
        
        return `${timeStr} (Статус: ${period}, формат 24ч)`;
    } catch (e) { return "ошибка времени"; }
}

async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

app.get('/', (req, res) => res.send(`<h2>🔐 Вход защищен</h2>`));

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("ДОСТУП ЗАПРЕЩЕН!");
  res.send(`
    <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Агент 2000</title>
    <style>
        body { font-family: sans-serif; background: #f0f2f5; padding: 15px; }
        #box { height: 480px; border: 1px solid #ccc; overflow-y: auto; background: white; padding: 15px; border-radius: 10px; margin-bottom: 10px; }
        .msg { margin-bottom: 12px; padding: 10px; border-radius: 10px; max-width: 85%; }
        .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
        .b { background: #fff; border: 1px solid #ddd; }
        input { width: 70%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; }
        button { padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; }
    </style></head>
    <body>
        <div style="max-width: 700px; margin: auto;">
            <h3>🤖 Агент Олега (Версия 2.0)</h3>
            <div id="box"></div>
            <div style="display:flex; gap:10px;">
                <input type="text" id="inp" placeholder="Время в Токио?" onkeypress="if(event.key==='Enter') send()">
                <button onclick="send()">Отправить</button>
            </div>
        </div>
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

    const moscowInfo = getTimeDetailed("москва");
    const systemPrompt = `Ты персональный помощник Олега. База: ${personalBase}.
    ТЕКУЩЕЕ ВРЕМЯ В МОСКВЕ (для ориентира): ${moscowInfo}.
    Если пользователь спрашивает время в другом городе, ТЫ ОБЯЗАН использовать инструмент TOOL:TIME(Город). 
    Отвечай вежливо, учитывая время суток (день, ночь, утро или вечер).`;

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

        if (reply.includes('TOOL:TIME')) {
            const match = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (match) reply = "Информация по г. " + match[1] + ": " + getTimeDetailed(match[1]);
        }
        
        if (reply.includes('TOOL:WEATHER')) {
            const match = reply.match(/TOOL:WEATHER\(([^)]+)\)/);
            if (match) reply = "Погода: " + await getWeather(match[1]);
        }
        
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
