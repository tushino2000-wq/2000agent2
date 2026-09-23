const express = require('express');
const app = express();
app.use(express.json());

// Берем переменные из окружения Render
const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let chatHistory = []; 
let personalBase = "Имя: Олег. Живет в Москве. Машина: Hyundai Solaris. Диета: Стол №5. Кот любит сушеного кролика."; 

// Функция для защиты от XSS атак в textarea
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Инструмент точного времени (24ч стандарт)
function getTimeDetailed(city) {
    const cityName = city.toLowerCase();
    let zone = "Europe/Moscow"; 
    if (cityName.includes("камчат")) zone = "Asia/Kamchatka";
    else if (cityName.includes("токио")) zone = "Asia/Tokyo";
    else if (cityName.includes("минск")) zone = "Europe/Minsk";

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

// Главная страница
app.get('/', (req, res) => res.send("🔐 Доступ только по секретному URL."));

// Исправлено зависание: теперь возвращает ошибку, если пароль неверный
app.post('/update_base', (req, res) => {
    const { password, newBase } = req.body;
    if (password === MY_PASSWORD) { 
        personalBase = newBase; 
        return res.json({ status: 'ok' }); 
    }
    return res.status(403).json({ error: "Доступ запрещен" });
});

// Интерфейс чата
app.get('/chat2026', (req, res) => {
    const userPass = req.query.pass;
    if (userPass !== MY_PASSWORD) return res.send("ОШИБКА ДОСТУПА!");
    
    res.send(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Агент Олега 2026</title>
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
                input[type="text"] { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size:16px; color: black; }
                button { padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
            </style>
        </head>
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
                    <input type="text" id="inp" placeholder="Напишите сообщение..." onkeypress="if(event.key==='Enter') send()">
                    <button type="button" onclick="send()">ОТПРАВИТЬ</button>
                </div>
            </div>
            <script>
                let recognition;
                let isListening = false;

                if ('webkitSpeechRecognition' in window) {
                    recognition = new webkitSpeechRecognition();
                    recognition.lang = 'ru-RU';
                    recognition.onresult = (e) => { document.getElementById('inp').value = e.results[0][0].transcript; stopMic(); };
                    recognition.onend = stopMic;
                }

                function toggleMic() {
                    if(!recognition) return;
                    const btn = document.getElementById('micBtn');
                    if (!isListening) { recognition.start(); btn.innerText = '🛑'; btn.style.background = '#c0392b'; isListening = true; }
                    else stopMic();
                }
                function stopMic() { if(recognition) recognition.stop(); document.getElementById('micBtn').innerText = '🎤'; document.getElementById('micBtn').style.background = '#e67e22'; isListening = false; }

                function attachPhoto(input) {
                    const file = input.files[0];
                    if (file) {
                        document.getElementById('inp').value = "Отредактируй это фото (" + file.name + "): сделай в стиле арт";
                    }
                }

                function save() {
                    const txt = document.getElementById('baseData').value;
                    fetch('/update_base', { 
                        method: 'POST', 
                        headers: {'Content-Type': 'application/json'}, 
                        body: JSON.stringify({ password: '${userPass}', newBase: txt }) 
                    }).then(() => alert('Сохранено!'));
                }

                async function send() {
                    const i = document.getElementById('inp'); const b = document.getElementById('box');
                    const v = i.value.trim(); if(!v) return;
                    b.innerHTML += '<div class="m u"><b>Вы:</b> ' + v + '</div>'; i.value = '';
                    b.scrollTop = b.scrollHeight;
                    
                    try {
                        const r = await fetch('/ask', { 
                            method: 'POST', 
                            headers: {'Content-Type': 'application/json'}, 
                            body: JSON.stringify({ message: v, password: '${userPass}' }) 
                        });
                        const d = await r.json();
                        let txt = d.reply || "Ошибка";
                        
                        // Регулярка теперь не сломается, так как пробелы заменяются на ИИ-стороне
                        const reg = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                        txt = txt.replace(reg, (u) => '<img src="' + u + '">');
                        
                        b.innerHTML += '<div class="m b"><b>ИИ:</b> ' + txt + '</div>';
                    } catch(e) {
                        b.innerHTML += '<div class="m b" style="color:red">Ошибка отправки запроса</div>';
                    }
                    b.scrollTop = b.scrollHeight;
                }
            </script>
        </body>
        </html>
    `);
});

// Серверная логика обработки запросов к ИИ
app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.status(401).json({ reply: "Пароль не совпал" });

    const moscowTime = getTimeDetailed("москва");
    const history = chatHistory.slice(-6).map(m => `${m.role === 'user' ? 'Олег' : 'Агент'}: ${m.content}`).join('\n');
    
    // Инструктируем модель заменять пробелы в ссылках на нижнее подчеркивание
    const systemPrompt = `Ты интеллектуальный ИИ-агент Олега (модель Gemini 3 Flash). Сегодня 23 сентября 2026 года.
    База знаний о пользователе: ${personalBase}. 
    В Москве сейчас: ${moscowTime}. 
    История вашей беседы: ${history}. 
    
    ПРАВИЛА И ИНСТРУМЕНТЫ:
    1. Если просят изменить или нарисовать фото, ты должен сгенерировать ссылку в формате:
       https://pollinations.ai/p/[prompt_на_английском]?width=1024&height=1024&seed=789
       ВАЖНО: Заменяй все пробелы в блоке [prompt_на_английском] на нижнее подчеркивание (_) или пиши их слитно. Пробелов внутри URL быть не должно!
    2. Если спрашивают время в другом городе, пиши строго команду: TOOL:TIME(Город).`;

    try {
        // Используем встроенный нативный fetch вместо node-fetch
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }] })
        });
        
        const data = await response.json();
        
        // Исправлено: безопасная проверка структуры ответа API
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error(">>> [API ERROR] Неверная структура ответа от Polza.ai:", JSON.stringify(data));
            return res.json({ reply: "API вернул пустой или ошибочный ответ. Проверьте баланс Polza.ai." });
        }

        let reply = data.choices[0].message.content;

        if (reply.includes('TOOL:TIME')) {
            const m = reply.match(/TOOL:TIME\(([^)]+)\)/);
            if (m) reply = "Время в г. " + m[1] + ": " + getTimeDetailed(m[1]);
        }

        chatHistory.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
        if (chatHistory.length > 20) chatHistory.shift();
        
        res.json({ reply });
    } catch (e) { 
        console.error(">>> [SERVER EXCEPTION] Критическая ошибка:", e.message);
        res.json({ reply: "Запрос не прошел. Ошибка сервера: " + e.message }); 
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log(">>> Сервер запущен на порту " + (process.env.PORT || 3000));
});
