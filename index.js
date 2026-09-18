const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;

app.get('/', (req, res) => {
  res.send(`
    <html>
    <body>
        <h2>ТЕСТ БЕЗ ПАРОЛЯ</h2>
        <div id="box" style="height:300px; border:1px solid #ccc; overflow:auto"></div>
        <input type="text" id="inp">
        <button onclick="send()">ОТПРАВИТЬ</button>
        <script>
            async function send() {
                const val = document.getElementById('inp').value;
                const box = document.getElementById('box');
                box.innerHTML += '<div>Вы: ' + val + '</div>';
                const res = await fetch('/ask', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: val })
                });
                const data = await res.json();
                box.innerHTML += '<div>ИИ: ' + (data.reply || "ошибка") + '</div>';
            }
        </script>
    </body>
    </html>
  `);
});

app.post('/ask', async (req, res) => {
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: 'user', content: req.body.message }]
            })
        });
        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });
    } catch (e) { res.json({ reply: "ошибка" }); }
});
app.listen(process.env.PORT || 3000);
