const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let chatHistory = []; 
let personalBase = "Имя: Олег. Москва. Машина: Hyundai Solaris. Диета: Стол №5. Кот любит кролика."; 

// Инструменты: Погода и Время
async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

function getTimeDetailed(city) {
    const zones = { "токио": "Asia/Tokyo", "лондон": "Europe/London", "нью-йорк": "America/New_York", "минск": "Europe/Minsk", "москва": "Europe/Moscow" };
    const zone = zones[city.toLowerCase()] || "UTC";
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long', day: 'numeric', month: 'long' });
    const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
    let p = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
    return `${timeStr} (${p}, 24ч)`;
}

app.get('/', (req, res) => res.send("🔐 Вход по ссылке /chat?pass=..."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) { personalBase = req.body.newBase; res.json({ status: 'ok' }); }
});

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("ДОСТУП ЗАПРЕЩЕН!");
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Агент Олега 2026</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; margin: 0; display: flex; height: 100vh; color: white; }
            #sidebar { width: 260px; background: #34495e; padding: 15px; display: flex; flex-direction: column; border-right: 1px solid #444; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
            #box { flex: 1; overflow-y: auto; padding: 20px; }
            .msg { margin-bottom: 15px; padding: 12px; border-radius: 12px; max-width: 85%; line-height: 1.4; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
            .b { background: white; border: 1px solid #ddd; }
            .b img { max-width: 100%; border-radius: 8px; margin-top: 10px; }
            textarea { width: 100%; height: 200px; background: #2c3e50; color: white; border: 1px solid #555; padding: 10px; border-radius: 5px; }
            .input-area { padding: 15px; background: white; display: flex; gap: 10px; align-items: center; border-top: 1px solid #ddd; }
            input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
            button { padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
            .btn-send { background: #27ae60; color: white; }
            .btn-mic { background: #e67e22; color: white; font-size: 20px; }
            .btn-file { background: #95a5a6; color: white; font-size: 20px; }
        </style>
    </head>
    <body>
        <div id="sidebar">
            <h3>📝 Знания Агента</h3>
            <textarea id="baseData">${personalBase}</textarea>
            <button onclick="saveBase()" style="margin-top:10px; background:#2980b9; color:white;">💾 Сохранить знания</button>
            <hr style="width:100%; margin: 20px 0; border: 0; border-top: 1px solid #555;">
            <button onclick="chatHistory=[]" style="background:#c0392b; color:white;">🗑 Очистить память</button>
        </div>
        <div id="main">
            <div id="box"></div>
            <div class="input-area">
                <button class="btn-file" onclick="document.getElementById('fileInp').click()">➕</button>
                <input type="file" id="fileInp" style="display:none" onchange="uploadFile()">
                <button class="btn-mic" id="micBtn" onclick="toggleVoice()">🎤</button>
                <input type="text" id="inp" placeholder="Спроси или надиктуй..." onkeypress="if(event.key==='Enter') send()">
                <button class="btn-send" onclick="send()">ОТПРАВИТЬ</button>
            </div>
        </div>
        <script>
            const box = document.getElementById('box');
            let recognition;
            
            function saveBase() {
                fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}', newBase: document.getElementById('baseData').value }) }).then(() => alert('Агент всё запомнил!'));
            }

            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
                recognition.lang = 'ru-RU';
                recognition.onresult = (e) => { document.getElementById('inp').value = e.results[0][0].transcript; toggleVoice(); };
            }

            function toggleVoice() {
                const btn = document.getElementById('micBtn');
                if (btn.innerText === '🎤') { recognition.start(); btn.innerText = '🛑'; btn.style.background = '#c0392b'; }
                else { recognition.stop(); btn.innerText = '🎤'; btn.style.background = '#e67e22'; }
            }

            function uploadFile() {
                alert("Файл выбран! (В этой версии мы имитируем загрузку, файл анализируется текстом)");
                document.getElementById('inp').value = "Я загрузил файл, проанализируй его.";
            }

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
                let txt = data.reply || "Ошибка";
                const urlRegex = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                txt = txt.replace(urlRegex, (url) => '<img src="' + url + '">');
                box.innerHTML += '<div class="msg b"><b>ИИ:</b> ' + txt + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body></html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });
    const moscowTime = getTimeDetailed("москва");
    const systemPrompt = `Ты агент Олега. Сегодня 19 сентября 2026г.
    База знаний: ${personalBase}.
    Время в Москве: ${moscowTime}.
    Инструменты: 
    - Погода: TOOL:WEATHER(Город)
    - Время: TOOL:TIME(Город)
    - Рисование: ссылка https://pollinations.ai/p/[prompt]?width=1024&height=1024`;

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
            if (match) reply = "Погода в " + match[1] + ": " + await getWeather(match[1]);
        }
        if (reply.includes('TOOL:TIME')) {
            const match = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (match) reply = "Время в " + match[1] + ": " + getTimeDetailed(match[1]);
        }
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
