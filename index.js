const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

app.get('/', (req, res) => res.send("СЕРВЕР ЖИВ. Иди на /chat?pass=твой_пароль"));

app.get('/chat', (req, res) => {
    const userPass = req.query.pass;
    if (userPass !== MY_PASSWORD) return res.send("ОШИБКА ПАРОЛЯ");
    
    res.send(`
        <html>
        <body style="padding:20px; font-family:sans-serif;">
            <h3>ТЕСТОВЫЙ ЧАТ (ВЕРСИЯ БЕЗ СТИЛЕЙ)</h3>
            <div id="box" style="height:200px; border:1px solid red; overflow:auto; margin-bottom:10px;"></div>
            <input type="text" id="inp">
            <button onclick="testSend()">ЖМИ СЮДА</button>

            <script>
                async function testSend() {
                    console.log("Кнопка нажата!");
                    const b = document.getElementById('box');
                    const i = document.getElementById('inp');
                    b.innerHTML += "<div>Вы: " + i.value + "</div>";
                    
                    try {
                        const r = await fetch('/ask', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ message: i.value, password: '${userPass}' })
                        });
                        const d = await r.json();
                        b.innerHTML += "<div style='color:green'>ИИ: " + (d.reply || "НЕТ ОТВЕТА") + "</div>";
                    } catch(e) {
                        b.innerHTML += "<div style='color:red'>ОШИБКА FETCH: " + e.message + "</div>";
                    }
                    i.value = "";
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/ask', async (req, res) => {
    console.log("ПОЛУЧЕН ЗАПРОС В /ask:", req.body.message); // Это ДОЛЖНО быть в логах Render
    const { message, password } = req.body;
    if (password !== MY_PASSWORD) return res.json({ reply: "Пароль не совпал" });

    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: message }]
            })
        });
        const data = await response.json();
        console.log("ОТВЕТ ОТ API ПОЛУЧЕН");
        res.json({ reply: data.choices[0].message.content });
    } catch (e) {
        console.log("ОШИБКА В /ask:", e.message);
        res.json({ reply: "Ошибка на сервере" });
    }
});

app.listen(process.env.PORT || 3000);
