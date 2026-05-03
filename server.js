require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ── Health check ──
app.get('/test', (req, res) => {
  res.json({
    status: 'Server is running ✅',
    apiKeyPresent: !!process.env.GROQ_API_KEY,
    apiKeyPreview: process.env.GROQ_API_KEY
      ? process.env.GROQ_API_KEY.slice(0, 10) + '...'
      : 'NOT FOUND ❌'
  });
});

// ── Main quiz route ──
app.post('/quiz', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: { message: 'GROQ_API_KEY is missing from .env file' }
      });
    }

    if (!req.body || !req.body.messages) {
      return res.status(400).json({
        error: { message: 'Request body is missing or malformed' }
      });
    }

    console.log('📤 Sending request to Groq...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
       model: 'llama-3.3-70b-versatile',
        messages: req.body.messages,
        max_tokens: 3000
      })
    });

    const rawText = await response.text();
    console.log('📥 Groq status:', response.status);

    if (!rawText) {
      return res.status(500).json({
        error: { message: 'Groq returned an empty response' }
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(500).json({
        error: { message: 'Groq returned invalid JSON: ' + rawText.slice(0, 200) }
      });
    }

    if (!response.ok) {
      console.error('❌ Groq error:', data?.error);
      return res.status(response.status).json({
        error: { message: data?.error?.message || 'Groq request failed' }
      });
    }

    console.log('✅ Success! Returning response to client.');
    res.json(data);

  } catch (err) {
    console.error('❌ Server crash:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅  QuizForge AI running at → http://localhost:${PORT}`);
  console.log(`🔑  API Key loaded: ${!!process.env.GROQ_API_KEY ? 'YES ✅' : 'NO ❌  (check your .env file)'}`);
  console.log(`🔍  Test setup at   → http://localhost:${PORT}/test\n`);
});

