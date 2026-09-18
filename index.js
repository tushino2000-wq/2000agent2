const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;
const MODEL_NAME = process.env.MODEL_NAME;
const MY_PASSWORD = process.env.MY_PASSWORD;

// Функция-инструмент: идёт в интернет за реальной погодой
async function getWeather(city) {
  try {
    // Используем бесплатный погодный сервис wttr.in
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`);
    const text = await res.text();
    return text.trim(); // Вернет например: "+18°C Ясно"
  } catch (e) {
    return "не удалось узнать погоду";
  }
}

// --- ИНТЕРФЕЙС ---
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Вход в систему</title>
        <style>
            body { font-family: sans-serif; background: #2c3e50; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-box { background: #34495e; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center; }
            input { padding: 10px; border-radius: 5px; border: none; margin-bottom: 10px; width: 200px; }
            button { padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; }
            #chat-container { display: none; flex-direction: column; width: 100%; max-width: 600px; background: #f0f2f5; color: black; height: 90vh; border-radius: 10px; padding: 20px; }
            #messages { flex: 1; overflow-y: auto; background: white; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
            .user { text-align: right; color: blue; }
            .bot { text-align: left; color: green; }
        </style>
    </head>
    <body>
        <div id="login-area" class="login-box">
            <h2>Введите пароль доступа</h2>
            <input type="password" id="passInp" placeholder="Пароль...">
            <br>
            <button onclick="checkPass()">Войти</button>
        </div>

        <div id="chat-container">
            <h3 style="text-align:center">🕵️‍♂️ Защищенный ИИ-Агент</h3>
            <div id="messages"></div>
            <div style="display:flex; gap:10px">
                <input type="text" id="userMsg" style="flex:1" placeholder="Задайте вопрос (например, какая погода в Москве?)..." onkeypress="if(event.key==='Enter') send()">
                <button onclick="send()" id="sendBtn">Отправить</button>
            </div>
        </div>

        <script {screen.scrollTop = screen.scrollHeight}>
            let savedPass = '';
            function checkPass() {
                savedPass = document.getElementById('passInp').value;
                document.getElementById('login-area').style.display = 'none';
                document.getElementById('chat-container').style.display = 'flex';
                document.body.style.background = '#bdc3c7';
            }

            async function send() {
                const msgInp = document.getElementById('userMsg');
                const msgBox = document.getElementById('messages');
                const text = msgInp.value;
                if(!text) return;

                msgBox.innerHTML += '<p class="user"><b>Вы:</b> ' + text + '</p>';
                msgInp.value = '';

                try {
                    const res = await fetch('/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text, password: savedPass })
                    });
                    const data = await res.json();
                    msgBox.innerHTML += '<p class="bot"><b>ИИ:</b> ' + (data.reply || data.error) + '</p>';
                } catch(e) {
                    msgBox.innerHTML += '<p>Ошибка связи</p>';
                }
                msgBox.scrollTop = msgBox.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

// --- ЛОГИКА АГЕНТА С ИНСТРУМЕНТАМИ ---
app.post('/ask', async (req, res) => {
  const { message, password } = req.body;

  if (password !== MY_PASSWORD) {
    return res.status(401).json({ error: "Неверный пароль!" });
  }

  try {
    // Даем четкую инструкцию ИИ, как использовать инструмент
    const systemInstruction = `Ты ИИ-Агент. Если пользователь спрашивает про погоду или температуру в каком-то городе, ты ОБЯЗАН ответить строго в таком формате: TOOL:WEATHER(НазваниеГорода). Не придумывай погоду сам.`;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: message }
        ]
      })
    });
    
    const data = await response.json();
    let botReply = data.choices[0].message.content;

    console.log("Первичный ответ ИИ:", botReply);

    // Проверяем, затребовал ли ИИ инструмент погоды
    if (botReply.includes('TOOL:WEATHER')) {
      const match = botReply.match(/TOOL:WEATHER\(([^)]+)\)/);
      if (match) {
        const city = match[1];
        console.log(`Робот запросил погоду для города: ${city}`);
        
        // Запускаем инструмент (функцию Node.js)
        const weatherInfo = await getWeather(city);
        
        // Делаем второй запрос к ИИ, передавая ему реальные данные с погодного сайта
        const finalResponse = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify({
            model: MODEL_NAME,
            messages: [
              { role: 'user', content: message },
              { role: 'assistant', content: botReply },
              { role: 'system', content: `Инструмент вернул данные о погоде: ${weatherInfo}. Сформулируй теперь финальный ответ пользователю.` }
            ]
          })
        });
        
        const finalData = await finalResponse.json();
        botReply = finalData.choices[0].message.content;
      }
    }

    res.json({ reply: botReply });

  } catch (err) {
    res.json({ error: "Ошибка на стороне агента: " + err.message });
  }
});

app.listen(process.env.PORT || 3000);
