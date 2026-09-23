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

function getTimeDetailed(city) {
    const cityName = city.toLowerCase();
    let zone = "Europe/Moscow"; 
    if (cityName.includes("камчат")) zone = "Asia/Kamchatka";
    else if (cityName.includes("токио")) zone = "Asia/Tokyo";
    try {
        const now = new Date();
        const timeStr = now.toLocaleString("ru-RU", { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
        return `${timeStr}`;
    } catch (e) { return "не определено"; }
}

app.get('/', (req, res) => res.send("СЕРВЕР РАБОТАЕТ. Идите на /chat2026?pass=..."));

app.post('/update_base', (req, res) => {
    if (req.body.password === MY_PASSWORD) { personalBase = req.body.newBase; res.json({status:'ok'}); }
});

app.get('/chat2026', (req, res) => {
    const userPass = req.query.pass;
    if (userPass !== MY_PASSWORD) return res.send("НЕТ ДОСТУПА");
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Агент 2026</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; margin: 0; display: flex; height: 100vh; color: white; }
            #side { width: 250px; padding: 15px; background: #34495e; border-right: 1px solid #444; }
            #main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; color: black; }
            #box { flex: 1; overflow-y: auto; padding: 20px; }
            .m { margin-bottom: 10px; padding: 10px; border-radius: 10px; max-width: 85%; }
            .u { background: #0084ff; color: white; margin-left: auto; text-align: right; }
            .b { background: white; border: 1px solid #ddd; }
            .in-area { padding: 15px; background: white; display: flex; gap: 10px; border-top: 1px solid #ccc; }
            input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
            button { padding: 12px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; }
        </style></head>
        <body>
            <div id="side">
                <h3>🏠 Знания</h3>
                <textarea id="baseData" style="width:100%; height:200px;">${personalBase}</textarea>
                <button onclick="save()" style="width:100%; margin-top:10px;">Сохранить</button>
            </div>
            <div id="main">
                <div id="box"></div>
                <div class="in-area">
                    <input type="text" id="inp" placeholder="Напишите сообщение...">
                    <button onclick="send()">ОТПРАВИТЬ</button>
                </div>
            </div>
            <script>
                function save() {
                    const txt = document.getElementById('baseData').value;
                    fetch('/update_base', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: '${userPass}', newBase: txt }) }).then(() => alert('ОК'));
                }
                async function send() {
                    const i = document.getElementById('inp'); const b = document.getElementById('box');
                    const v = i.value.trim(); if(!v) return;
                    b.innerHTML += '<div class="m u">' + v + '</div>'; i.value = '';
                    b.scrollTop = b.scrollHeight;
                    
                    try {
                        const r = await fetch(window.location.origin + '/ask', { 
                            method: 'POST', 
                            headers: {'Content-Type': 'application/json'}, 
                            body: JSON.stringify({ message: v, password: '${userPass}' }) 
                        });
                        
                        if (!r.ok) throw new Error("Код ответа: " + r.status);
                        
                        const d = await r.json();
                        b.innerHTML += '<div class="m b"><b>ИИ:</b> ' + (d.reply || "Пустой ответ") + '</div>';
                    } catch (e) {
                        console.error("DEBUG:", e);
                        b.innerHTML += '<div class="m b" style="color:red"><b>СЕТЕВАЯ ОШИБКА:</b> ' + e.message + '<br>Попробуйте сменить VPN или обновить страницу.</div>';
                    }
                    b.scrollTop = b.scrollHeight;
                }
            </script>
        </body></html>
    `);
});

app.post('/ask', async (req, res) => {
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Ошибка пароля" });
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'system', content: `Ты агент Олега. База: ${personalBase}.` }, { role: 'user', content: message }]
            })
        });
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (e) { 
        res.json({ reply: "Ошибка API" }); 
    }
});

app.listen(process.env.PORT || 3000);
