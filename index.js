const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json({ limit: '10mb' })); // Увеличили лимит для передачи фото

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Имя: Олег. Москва. Solaris. Кот: кролик. Щетки: ITIKO 650/400.";
let chatHistory = []; 

function getTimeDetailed(city) {
    const cityName = city.toLowerCase();
    let zone = "Europe/Moscow"; 
    if (cityName.includes("камчат")) zone = "Asia/Kamchatka";
    else if (cityName.includes("токио")) zone = "Asia/Tokyo";
    else if (cityName.includes("владивосток")) zone = "Asia/Vladivostok";
    try {
        const now = new Date();
        const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long', day: 'numeric', month: 'long' });
        const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
        let period = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
        return `${timeStr} (${period})`;
    } catch (e) { return "не определено"; }
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
            .b img { max-width: 100%; border-radius: 8px; margin-top: 10px; display: block; border: 1px solid #ccc; }
            .in-area { padding: 15px; background: white; display: flex; gap: 8px; border-top: 1px solid #ccc; align-items: center; }
            input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size:16px; }
            button { padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; color: white; }
            .btn-green { background: #27ae60; }
            .btn-orange { background: #e67e22; }
            .btn-gray { background: #7f8c8d; }
        </style></head>
        <body>
            <div id="side">
                <h3>🏠 Знания Агента</h3>
                <textarea id="baseData" style="width:100%; height:250px; background:#1e272e; color:white; border:1px solid #555; padding:5px;">${personalBase}</textarea>
                <button onclick="save()" style="width:100%; margin-top:10px; background:#2980b9; color:white;">💾 Сохранить</button>
            </div>
            <div id="main">
                <div id="box"></div>
                <div class="in-area">
                    <button class="btn-gray" onclick="document.getElementById('fileInp').click()">📎</button>
                    <input type="file" id="fileInp" style="display:none" accept="image/*" onchange="handleFile(this)">
                    <button class="btn-orange" id="micBtn" onclick="toggleMic()">🎤</button>
                    <input type="text" id="inp" placeholder="Спроси или попроси изменить фото..." onkeypress="if(event.key==='Enter') send()">
                    <button class="btn-green" onclick="send()">ОТПРАВИТЬ</button>
                </div>
            </div>
            <script>
                let recognition;
                let isListening = false;
                let attachedFile = null;

                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                    recognition.lang = 'ru-RU';
                    recognition.onresult = (e) => { document.getElementById('inp').value = e.results[0][0].transcript; stopMic(); };
                    recognition.onend = stopMic;
                }

                function toggleMic() {
                    const btn = document.getElementById('micBtn');
                    if (!isListening) { recognition.start(); btn.innerText = '🛑'; btn.style.background = '#c0392b'; isListening = true; }
                    else stopMic();
                }
                function stopMic() { if(recognition) recognition.stop(); document.getElementById('micBtn').innerText = '🎤'; document.getElementById('micBtn').style.background = '#e67e22'; isListening = false; }

                function handleFile(input) {
                    const file = input.files[0];
                    if (file) {
                        attachedFile = file.name;
                        alert("Файл " + file.name + " прикреплен. Теперь напишите, что с ним сделать.");
                    }
                }

                function save() {
                    const txt = document.getElementById('baseData').value;
                    fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}', newBase: txt }) }).then(() => alert('Агент обновил знания!'));
                }

                async function send() {
                    const i = document.getElementById('inp'); const b = document.getElementById('box');
                    const v = i.value.trim(); if(!v && !attachedFile) return;
                    let fullMsg = v + (attachedFile ? " (Файл: " + attachedFile + ")" : "");
                    b.innerHTML += '<div class="m u"><b>Вы:</b> ' + fullMsg + '</div>'; 
                    i.value = ''; attachedFile = null; b.scrollTop = b.scrollHeight;

                    const r = await fetch('/ask', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message: fullMsg, password: '${userPass}' }) });
                    const d = await r.json();
                    let txt = d.reply || "Ошибка";
                    
                    const reg = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                    txt = txt.replace(reg, (u) => '<img src="' + u + '">');
                    
                    b.innerHTML += '<div class="m b"><b>ИИ:</b> ' + txt + '</div>';
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
    const history = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');
    
    const systemPrompt = `Ты агент Олега. Сегодня 22.09.2026. База знаний: ${personalBase}. 
    В Москве: ${moscowTime}. История: ${history}. 
    1. Если просят изменить/нарисовать фото, используй ссылку: https://pollinations.ai/p/[описание_на_английском]?width=1024&height=1024&seed=[random]
    2. Время: TOOL:TIME(Город).`;

    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] })
        });
        const data = await response.json();
        let reply = data.choices[0].message.content;

        if (reply.includes('TOOL:TIME')) {
            const m = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (m) reply = "Время в г. " + m[1] + ": " + getTimeDetailed(m[1]);
        }

        chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();
        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка связи" }); }
});

app.listen(process.env.PORT || 3000);
