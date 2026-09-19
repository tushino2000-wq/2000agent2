const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let chatHistory = []; 
let personalBase = "Имя: Олег. Москва. Solaris. Стол №5."; 

// Инструмент времени
function getTimeDetailed(city) {
    const zones = { "камчатка": "Asia/Kamchatka", "токио": "Asia/Tokyo", "москва": "Europe/Moscow" };
    const zone = zones[city.toLowerCase()] || "Europe/Moscow";
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
    const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
    let p = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
    return `${timeStr} (${p})`;
}

app.get('/', (req, res) => res.send("🔐 Вход по /chat?pass=..."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) { personalBase = req.body.newBase; res.json({status:'ok'}); }
});

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("НЕТ ДОСТУПА");
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Агент 2026</title>
    <style>
        body { font-family: sans-serif; display: flex; height: 100vh; margin: 0; background: #2c3e50; color: white; }
        #side { width: 250px; padding: 15px; background: #34495e; }
        #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
        #box { flex: 1; overflow-y: auto; padding: 20px; }
        .m { margin-bottom: 10px; padding: 10px; border-radius: 10px; max-width: 80%; }
        .u { background: #0084ff; color: white; margin-left: auto; }
        .b { background: white; border: 1px solid #ddd; }
        .b img { max-width: 100%; display: block; margin-top: 5px; }
        .in-area { padding: 15px; background: white; display: flex; gap: 5px; }
        input { flex: 1; padding: 10px; }
        button { padding: 10px; cursor: pointer; }
    </style></head>
    <body>
        <div id="side">
            <h3>🏠 База знаний</h3>
            <textarea id="base" style="width:100%; height:200px;">${personalBase}</textarea><br>
            <button onclick="save()" style="width:100%; margin-top:10px;">Сохранить</button>
        </div>
        <div id="main">
            <div id="box"></div>
            <div class="in-area">
                <button onclick="mic()">🎤</button>
                <input type="text" id="inp" placeholder="Спроси о чем угодно...">
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
            function mic() { recognition.start(); }
            function save() {
                fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}', newBase: document.getElementById('base').value }) }).then(() => alert('ОК'));
            }
            async function send() {
                const i = document.getElementById('inp'); const b = document.getElementById('box');
                const v = i.value; if(!v) return;
                b.innerHTML += '<div class="m u">' + v + '</div>'; i.value = '';
                const r = await fetch('/ask', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message: v, password: '${userPass}' }) });
                const d = await r.json();
                let txt = d.reply || "Ошибка";
                const reg = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                txt = txt.replace(reg, (u) => '<img src="' + u + '">');
                b.innerHTML += '<div class="m b">' + txt + '</div>';
                b.scrollTop = b.scrollHeight;
            }
        </script>
    </body></html>
  `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });

    const moscowTime = getTimeDetailed("москва");
    const historyLines = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');

    const systemPrompt = `Ты агент Олега. Сегодня 19.09.2026.
    База знаний: ${personalBase}.
    В Москве сейчас: ${moscowTime}.
    История: ${historyLines}
    Если спрашивают время города, пиши: TOOL:TIME(Город).
    Если рисовать: дай ссылку https://pollinations.ai/p/[prompt]?width=1024&height=1024`;

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
            if (m) reply = "Время в " + m[1] + ": " + getTimeDetailed(m[1]);
        }

        chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
