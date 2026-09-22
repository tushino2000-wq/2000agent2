const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

let chatHistory = []; 
let personalBase = "Имя: Олег. Москва. Машина: Hyundai Solaris. Диета: Стол №5."; 

function getTimeDetailed(city) {
    const zones = { "камчатка": "Asia/Kamchatka", "токио": "Asia/Tokyo", "москва": "Europe/Moscow" };
    const zone = zones[city.toLowerCase()] || "Europe/Moscow";
    const now = new Date();
    const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
    const hour = parseInt(now.toLocaleString("en-GB", { timeZone: zone, hour: '2-digit', hour12: false }));
    let p = (hour >= 5 && hour < 12) ? "УТРО" : (hour >= 12 && hour < 18) ? "ДЕНЬ" : (hour >= 18 && hour < 23) ? "ВЕЧЕР" : "НОЧЬ";
    return `${timeStr} (${p})`;
}

app.get('/', (req, res) => res.send("🔐 Доступ только по секретному URL."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) { 
        personalBase = req.body.newBase; 
        res.json({ status: 'ok' }); 
    } else {
        res.status(401).json({ error: "Нет доступа" });
    }
});

app.get('/chat', (req, res) => {
  const userPass = req.query.pass;
  if (userPass !== MY_PASSWORD) return res.send("НЕТ ДОСТУПА!");
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Агент Олега</title>
        <style>
            body { font-family: sans-serif; display: flex; height: 100vh; margin: 0; background: #2c3e50; color: white; }
            #side { width: 250px; padding: 15px; background: #34495e; border-right: 1px solid #222; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
            #box { flex: 1; overflow-y: auto; padding: 20px; }
            .m { margin-bottom: 10px; padding: 10px; border-radius: 10px; max-width: 80%; line-height: 1.4; }
            .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
            .b { background: white; border: 1px solid #ddd; text-align: left; }
            .b img { max-width: 100%; display: block; margin-top: 5px; border-radius: 5px; }
            .in-area { padding: 15px; background: white; display: flex; gap: 10px; border-top: 1px solid #ccc; }
            input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
            button { padding: 12px 20px; cursor: pointer; background: #27ae60; color: white; border: none; border-radius: 5px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div id="side">
            <h3>🏠 База знаний</h3>
            <textarea id="base" style="width:100%; height:250px; background:#1e272e; color:white; padding:5px;">${personalBase}</textarea>
            <button onclick="save()" style="width:100%; margin-top:10px; background:#2980b9;">💾 Сохранить</button>
        </div>
        <div id="main">
            <div id="box"></div>
            <div class="in-area">
                <button onclick="mic()" style="background:#e67e22;">🎤</button>
                <input type="text" id="inp" placeholder="Напишите сообщение..." onkeypress="if(event.key==='Enter') send()">
                <button onclick="send()">ОТПРАВИТЬ</button>
            </div>
        </div>
        <script>
            let recognition;
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechClass();
                recognition.lang = 'ru-RU';
                recognition.onresult = function(e) { 
                    document.getElementById('inp').value = e.results[0][0].transcript; 
                };
            }
            function mic() { 
                if(recognition) recognition.start(); 
            }
            function save() {
                const txt = document.getElementById('base').value;
                fetch('/update_base', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ password: '${userPass}', newBase: txt }) 
                }).then(function() { alert('База сохранена!'); });
            }
            async function send() {
                const inp = document.getElementById('inp'); 
                const box = document.getElementById('box');
                const val = inp.value.trim(); 
                if(!val) return;
                
                box.innerHTML += '<div class="m u"><b>Вы:</b> ' + val + '</div>'; 
                inp.value = '';
                box.scrollTop = box.scrollHeight;
                
                try {
                    const res = await fetch('/ask', { 
                        method: 'POST', 
                        headers: {'Content-Type': 'application/json'}, 
                        body: JSON.stringify({ message: val, password: '${userPass}' }) 
                    });
                    const d = await res.json();
                    let txt = d.reply || "Ошибка";
                    
                    const reg = /(https:\/\/pollinations\.ai\/p\/[^\s\)]+)/gi;
                    txt = txt.replace(reg, function(u) { return '<img src="' + u + '">'; });
                    
                    box.innerHTML += '<div class="m b"><b>ИИ:</b> ' + txt + '</div>';
                } catch(e) {
                    box.innerHTML += '<div class="m b"><b>Ошибка:</b> Не удалось связаться с сервером.</div>';
                }
                box.scrollTop = box.scrollHeight;
            }
        </script>
    </body>
    </html>
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
    Если спрашивают время города, пиши строго: TOOL:TIME(Город).
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
