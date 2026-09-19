const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

// Хранилище в памяти сервера
let chatHistory = []; 
let personalBase = "Имя: Олег. Москва. Машина: Hyundai Solaris. Диета: Стол №5. Кот любит кролика."; 

// --- ИНСТРУМЕНТЫ ---

// 1. Погода
async function getWeather(city) {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    return await res.text();
  } catch (e) { return "недоступно"; }
}

// 2. Время (24ч формат + статус дня/ночи)
function getTimeDetailed(city) {
    const timeZones = {
        "камчатка": "Asia/Kamchatka", "петропавловск-камчатский": "Asia/Kamchatka",
        "владивосток": "Asia/Vladivostok", "новосибирск": "Asia/Novosibirsk",
        "токио": "Asia/Tokyo", "москва": "Europe/Moscow", "лондон": "Europe/London",
        "нью-йорк": "America/New_York", "минск": "Europe/Minsk"
    };
    const zone = timeZones[city.toLowerCase()] || "Europe/Moscow";
    try {
        const now = new Date();
        const timeStr = now.toLocaleString("ru-RU", { 
            timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false, 
            weekday: 'long', day: 'numeric', month: 'long' 
        });
        const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
        let period = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
        return `${timeStr} (сейчас там ${period}, 24-часовой формат)`;
    } catch (e) { return "не определено"; }
}

// --- ИНТЕРФЕЙС ---

app.get('/', (req, res) => res.send("🔐 Вход по секретной ссылке."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) {
        personalBase = req.body.newBase;
        res.json({ status: 'ok' });
    }
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
            #sidebar { width: 280px; background: #34495e; padding: 15px; display: flex; flex-direction: column; border-right: 1px solid #444; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
            #box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; }
            .msg { padding: 12px; border-radius: 12px; max-width: 85%; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
            .u { background: #0084ff; color: white; align-self: flex-end; }
            .b { background: white; align-self: flex-start; border: 1px solid #ddd; }
            .b img { max-width: 100%; border-radius: 8px; margin-top: 10px; display: block; }
            textarea { width: 90%; height: 250px; background: #1e272e; color: #ecf0f1; border: 1px solid #555; padding: 10px; border-radius: 5px; font-size: 13px; }
            .input-area { padding: 15px; background: white; display: flex; gap: 10px; align-items: center; border-top: 1px solid #ddd; }
            input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
            button { padding: 12px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
            .btn-send { background: #27ae60; color: white; }
            .btn-mic { background: #e67e22; color: white; font-size: 20px; }
            .btn-file { background: #95a5a6; color: white; font-size: 20px; }
        </style>
    </head>
    <body>
        <div id="sidebar">
            <h3>📝 Знания Агента</h3>
            <p style="font-size:11px; color:#bdc3c7;">Редактируйте данные об Олеге здесь:</p>
            <textarea id="baseData">${personalBase}</textarea>
            <button onclick="saveBase()" style="margin-top:10px; background:#2980b9; color:white;">💾 Сохранить знания</button>
            <hr style="width:100%; margin: 20px 0; border: 0; border-top: 1px solid #555;">
            <button onclick="clearHistory()" style="background:#c0392b; color:white;">🗑 Очистить память чата</button>
        </div>
        <div id="main">
            <div id="box"></div>
            <div class="input-area">
                <button class="btn-file" onclick="document.getElementById('fileInp').click()">📎</button>
                <input type="file" id="fileInp" style="display:none" onchange="alert('Файл выбран. Анализ встроен в логику.')">
                <button class="btn-mic" id="micBtn" onclick="toggleVoice()">🎤</button>
                <input type="text" id="inp" placeholder="Спросите о чем угодно..." onkeypress="if(event.key==='Enter') send()">
                <button class="btn-send" onclick="send()">Отправить</button>
            </div>
        </div>
        <script>
            const box = document.getElementById('box');
            let recognition;
            
            function saveBase() {
                const newText = document.getElementById('baseData').value;
                fetch('/update_base', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ password: '${userPass}', newBase: newText }) 
                }).then(() => alert('Агент обновил свои знания!'));
            }

            function clearHistory() {
                fetch('/clear_history', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}' }) })
                .then(() => { box.innerHTML = ''; alert('Память беседы стерта.'); });
            }

            if ('webkitSpeechRecognition' in window) {
                recognition = new webkitSpeechRecognition();
                recognition.lang = 'ru-RU';
                recognition.onresult = (e) => { 
                    document.getElementById('inp').value = e.results[0][0].transcript; 
                    toggleVoice(); 
                };
            }

            function toggleVoice() {
                const btn = document.getElementById('micBtn');
                if (btn.innerText === '🎤') { recognition.start(); btn.innerText = '🛑'; btn.style.background = '#c0392b'; }
                else { recognition.stop(); btn.innerText = '🎤'; btn.style.background = '#e67e22'; }
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
                let txt = data.reply || "Ошибка связи";
                
                const urlRegex = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                txt = txt.replace(urlRegex, (url) => '<img src="' + url + '">');
                
                box.innerHTML += '<div class="msg b"><b>ИИ:</b> ' + txt + '</div>';
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body></html>
  `);
});

// --- СЕРВЕРНАЯ ЛОГИКА ---

app.post('/clear_history', (req, res) => {
    if (req.body.password === MY_PASSWORD) { chatHistory = []; res.json({status:'ok'}); }
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.status(401).json({ error: "Нет доступа" });

    // Формируем историю для контекста
    const historyLines = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');
    const moscowTime = getTimeDetailed("москва");

    const systemPrompt = `Ты интеллектуальный агент Олега. Сегодня 19 сентября 2026 года.
    База знаний о пользователе: ${personalBase}.
    Время в Москве сейчас: ${moscowTime}.
    
    История вашей беседы:
    ${historyLines}

    Твои инструменты:
    - Если спрашивают погоду, пиши только: TOOL:WEATHER(Город).
    - Если спрашивают время в другом городе, пиши только: TOOL:TIME(Город).
    - Если просят нарисовать, дай прямую ссылку: https://pollinations.ai/p/[prompt_на_английском]?width=1024&height=1024
    
    Учитывай историю сообщений при ответе. Если Олег говорит "там", пойми из истории, о каком месте речь.`;

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

        // Обработка инструментов
        if (reply.includes('TOOL:WEATHER')) {
            const match = reply.match(/TOOL:WEATHER\(([^)]+)\)/);
            if (match) {
                const w = await getWeather(match[1]);
                reply = "Погода в г. " + match[1] + ": " + w;
            }
        }
        if (reply.includes('TOOL:TIME')) {
            const match = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (match) {
                reply = "Время в г. " + match[1] + ": " + getTimeDetailed(match[1]);
            }
        }

        // Сохраняем в память
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();

        res.json({ reply });
    } catch (e) { res.json({ reply: "Ошибка: проверьте логи сервера." }); }
});

app.listen(process.env.PORT || 3000);
