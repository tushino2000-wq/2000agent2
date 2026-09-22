const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Имя: Олег. Москва. Solaris. Стол №5. Кот любит кролика.";
let chatHistory = []; 

// Умный инструмент времени: ищет совпадения по частям слов
function getTimeDetailed(city) {
    const cityName = city.toLowerCase();
    let zone = "Europe/Moscow"; // по умолчанию Москва

    // Гибкая проверка городов
    if (cityName.includes("камчат")) zone = "Asia/Kamchatka";
    else if (cityName.includes("токио")) zone = "Asia/Tokyo";
    else if (cityName.includes("минск")) zone = "Europe/Minsk";
    else if (cityName.includes("лондон")) zone = "Europe/London";
    else if (cityName.includes("нью-йорк")) zone = "America/New_York";
    else if (cityName.includes("пекин")) zone = "Asia/Shanghai";
    else if (cityName.includes("дубай")) zone = "Asia/Dubai";

    try {
        const now = new Date();
        const timeStr = now.toLocaleString("ru-RU", { 
            timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, 
            weekday: 'long', day: 'numeric', month: 'long' 
        });
        const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
        let period = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
        return `${timeStr} (сейчас там ${period})`;
    } catch (e) { return "не определено"; }
}

// Погода
async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

app.get('/', (req, res) => res.send("🔐 Вход по секретной ссылке."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) { personalBase = req.body.newBase; res.json({status:'ok'}); }
});

app.get('/chat', (req, res) => {
    const userPass = req.query.pass;
    if (userPass !== MY_PASSWORD) return res.send("ОШИБКА ДОСТУПА");
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Агент Олега 2026</title>
        <style>
            body { font-family: sans-serif; display: flex; height: 100vh; margin: 0; background: #2c3e50; color: white; }
            #side { width: 260px; padding: 15px; background: #34495e; border-right: 1px solid #222; overflow-y:auto; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
            #box { flex: 1; overflow-y: auto; padding: 20px; }
            .m { margin-bottom: 15px; padding: 12px; border-radius: 12px; max-width: 85%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
            .b { background: white; border: 1px solid #ddd; text-align: left; }
            .in-area { padding: 15px; background: white; display: flex; gap: 10px; border-top: 1px solid #ccc; }
            input { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #ddd; }
            button { padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
        </style></head>
        <body>
            <div id="side">
                <h3>🏠 Знания Агента</h3>
                <textarea id="baseData" style="width:100%; height:200px; background:#1e272e; color:white; border:1px solid #555; padding:5px;">${personalBase}</textarea>
                <button onclick="save()" style="width:100%; margin-top:10px; background:#2980b9;">💾 Сохранить</button>
            </div>
            <div id="main">
                <div id="box"></div>
                <div class="in-area">
                    <button onclick="recognition && recognition.start()" style="background:#e67e22;">🎤</button>
                    <input type="text" id="inp" placeholder="Спроси о времени на Камчатке..." onkeypress="if(event.key==='Enter') send()">
                    <button onclick="send()">ОТПРАВИТЬ</button>
                </div>
            </div>
            <script>
                let recognition;
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                    recognition.lang = 'ru-RU';
                    recognition.onresult = (e) => { document.getElementById('inp').value = e.results[0][0].transcript; };
                }
                function save() {
                    const txt = document.getElementById('baseData').value;
                    fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}', newBase: txt }) }).then(() => alert('Агент запомнил!'));
                }
                async function send() {
                    const i = document.getElementById('inp'); const b = document.getElementById('box');
                    const v = i.value; if(!val=v) return;
                    b.innerHTML += '<div class="m u"><b>Вы:</b> ' + v + '</div>'; i.value = '';
                    b.scrollTop = b.scrollHeight;
                    const r = await fetch('/ask', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message: v, password: '${userPass}' }) });
                    const d = await r.json();
                    b.innerHTML += '<div class="m b"><b>ИИ:</b> ' + (d.reply || "Ошибка") + '</div>';
                    b.scrollTop = b.scrollHeight;
                }
            </script>
        </body></html>
    `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Пароль не совпал" });

    const moscowTime = getTimeDetailed("москва");
    const history = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');

    const systemPrompt = `Ты агент Олега. Сегодня вторник, 22 сентября 2026 года.
    Твоя база знаний: ${personalBase}.
    В Москве сейчас: ${moscowTime}.
    История беседы: ${history}
    
    Если спрашивают время в другом городе, используй TOOL:TIME(Город).`;

    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
            })
        });
        const data = await response.json();
        let reply = data.choices[0].message.content;

        if (reply.includes('TOOL:TIME')) {
            const m = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (m) reply = "Время в г. " + m[1] + ": " + getTimeDetailed(m[1]);
        }

        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();

        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка на сервере" }); }
});

app.listen(process.env.PORT || 3000);
