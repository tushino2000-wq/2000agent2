const express = require('express');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let personalBase = "Имя: Олег. Москва. Solaris. Стол №5. Кот любит кролика.";
let chatHistory = [];

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getTimeDetailed(city) {
    const cityName = city.toLowerCase();
    let zone = "Europe/Moscow";
    if (cityName.includes("камчат")) zone = "Asia/Kamchatka";
    else if (cityName.includes("токио")) zone = "Asia/Tokyo";
    else if (cityName.includes("минск")) zone = "Europe/Minsk";
    try {
        const now = new Date();
        const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long', day: 'numeric', month: 'long' });
        const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
        let p = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
        return `${timeStr} (${p})`;
    } catch (e) { return "не определено"; }
}

app.get('/', (req, res) => res.send("🔐 Вход по секретной ссылке."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) {
        personalBase = req.body.newBase;
        return res.json({ status: 'ok' });
    }
    res.status(403).json({ status: 'denied' });
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
            .in-area { padding: 15px; background: white; display: flex; gap: 10px; border-top: 1px solid #ccc; }
            #inp { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size:16px; color: black; }
            button { padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
        </style></head>
        <body>
            <div id="side">
                <h3>🏠 Знания Агента</h3>
                <textarea id="baseData" style="width:100%; height:200px; background:#1e272e; color:white; border:1px solid #555; padding:5px;">${escapeHtml(personalBase)}</textarea>
                <button onclick="save()" style="width:100%; margin-top:10px; background:#2980b9;">💾 Сохранить</button>
            </div>
            <div id="main">
                <div id="box"></div>
                <div class="in-area">
                    <button type="button" onclick="document.getElementById('fileInp').click()" style="background:#7f8c8d;">📎</button>
                    <input type="file" id="fileInp" style="display:none" accept="image/*" onchange="attachPhoto(this)">
                    <button type="button" id="micBtn" onclick="toggleMic()" style="background:#e67e22;">🎤</button>
                    <input type="text" id="inp" placeholder="Напишите сообщение...">
                    <button type="button" onclick="send()">ОТПРАВИТЬ</button>
                </div>
            </div>
            <script>
                let recognition;
                let isListening = false;
                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition(); recognition.lang = 'ru-RU';
                    recognition.onresult = (e) => { document.getElementById('inp').value = e.results[0][0].transcript; stopMic(); };
                    recognition.onend = stopMic;
                }
                function toggleMic() { if(!recognition) return; if (!isListening) { recognition.start(); document.getElementById('micBtn').innerText = '🛑'; isListening = true; } else stopMic(); }
                function stopMic() { if(recognition) recognition.stop(); document.getElementById('micBtn').innerText = '🎤'; isListening = false; }

                function attachPhoto(input) {
                    const file = input.files[0];
                    if (file) { document.getElementById('inp').value = "Используй это фото (" + file.name + ") и создай на его основе: "; }
                }

                function save() {
                    const txt = document.getElementById('baseData').value;
                    fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: ${JSON.stringify(userPass)}, newBase: txt }) })
                        .then(r => r.json()).then(d => alert(d.status === 'ok' ? 'Сохранено!' : 'Ошибка'));
                }

                async function send() {
                    const i = document.getElementById('inp'); const b = document.getElementById('box');
                    const v = i.value; if(!v) return;
                    b.innerHTML += '<div class="m u"><b>Вы:</b> ' + v + '</div>'; i.value = '';
                    b.scrollTop = b.scrollHeight;

                    const r = await fetch('/ask', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message: v, password: ${JSON.stringify(userPass)} }) });
                    const d = await r.json();
                    let txt = d.reply || "Ошибка";

                    // ИСПРАВЛЕННАЯ регулярка: ищем ссылку и чистим её от лишних символов
                    const reg = /(https:\\/\\/pollinations\\.ai\\/p\\/[^\\s\\)\\n]+)/gi;
                    txt = txt.replace(reg, (u) => {
                        let cleanUrl = u.trim().replace(/[\\)\\(\\*\\_]+$/, ''); // Чистим хвост от скобок и звездочек
                        return '<img src="' + cleanUrl + '">';
                    });

                    b.innerHTML += '<div class="m b"><b>ИИ:</b> ' + txt + '</div>';
                    b.scrollTop = b.scrollHeight;
                }
                document.getElementById('inp').addEventListener('keypress', function(e) { if (e.key === 'Enter') send(); });
            </script>
        </body></html>
    `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });
    const moscowTime = getTimeDetailed("москва");
    const history = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');

    // УЛУЧШЕННЫЙ ПРОМПТ ДЛЯ РЕДАКТИРОВАНИЯ ФОТО
    const systemPrompt = `Ты агент Олега. 23.09.2026. База: ${personalBase}. Москва: ${moscowTime}. История: ${history}. 
    ИНСТРУКЦИИ ПО ФОТО:
    1. Если пользователь прислал имя файла и просит что-то сделать (изменить/нарисовать), проанализируй описание и создай НОВУЮ картинку.
    2. Ссылку пиши строго так: https://pollinations.ai/p/[английское_описание]?width=1024&height=1024&seed=[число]
    3. В [английское_описание] заменяй все пробелы на %20. НЕ используй Markdown (никаких [] или () для ссылок), просто голый текст ссылки.
    4. Если спрашивают время: TOOL:TIME(Город).`;

    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] })
        });
        const data = await response.json();
        if (!data.choices || !data.choices[0]) return res.json({ reply: "API Error" });

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
