const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const DEEPSEEK_API_KEY = process.env.API_KEY;

// Инструменты агента
const tools = {
  
  // Инструмент 1: получить время
  getCurrentTime: () => {
    return new Date().toLocaleString('ru-RU');
  },
  
  // Инструмент 2: простой калькулятор
  calculate: (expression) => {
    try {
      return eval(expression).toString();
    } catch(e) {
      return 'Ошибка вычисления';
    }
  }
};

// Функция агента
async function runAgent(userMessage) {
  
  // Системный промпт — объясняем агенту что он умеет
  const systemPrompt = `Ты полезный агент. 
  У тебя есть инструменты:
  - getCurrentTime() - узнать текущее время
  - calculate(выражение) - посчитать математику
  
  Если нужно использовать инструмент — напиши:
  TOOL: название_инструмента(аргумент)
  
  Иначе просто отвечай на вопрос.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  });

  const data = await response.json();
  let agentReply = data.choices[0].message.content;

  // Проверяем — хочет ли агент использовать инструмент
  if (agentReply.includes('TOOL:')) {
    const toolLine = agentReply.match(/TOOL: (\w+)\(([^)]*)\)/);
    
    if (toolLine) {
      const toolName = toolLine[1];
      const toolArg = toolLine[2];
      
      let toolResult = '';
      
      if (toolName === 'getCurrentTime') {
        toolResult = tools.getCurrentTime();
      } else if (toolName === 'calculate') {
        toolResult = tools.calculate(toolArg);
      }
      
      // Отправляем результат инструмента обратно агенту
      agentReply = `Результат: ${toolResult}`;
    }
  }

  return agentReply;
}

// Маршруты
app.get('/', (req, res) => {
  res.send('Агент работает! ✅');
});

app.post('/ask', async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await runAgent(message);
    res.json({ reply });
  } catch(err) {
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Агент запущен на порту ${PORT}`);
});