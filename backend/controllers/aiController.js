const db = require('../config/database');
const { openaiApiKey, geminiApiKey } = require('../config/env');

exports.chat = async (req, res) => {
  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Please enter a question for Smart Buddy.' });
  }
  const query = String(message).trim();

  // Pull live campus context from SQLite so answers are grounded in real data
  const events = db.prepare('SELECT title, category, location, event_date FROM events ORDER BY event_date ASC LIMIT 3').all();
  const resources = db.prepare('SELECT title, subject, semester FROM study_resources ORDER BY downloads DESC LIMIT 3').all();

  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Smart Buddy, the helpful AI campus assistant for UniVerse. Upcoming events: ${JSON.stringify(events)}. Top study resources: ${JSON.stringify(resources)}. Keep answers concise, accurate, and student-friendly.`
            },
            { role: 'user', content: query }
          ]
        })
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({
          demoMode: false,
          provider: 'OpenAI',
          reply: data.choices?.[0]?.message?.content || 'I could not generate a response.'
        });
      }
    } catch (_) {
      // Fall through to clearly labeled demo mode if external call fails
    }
  }

  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are Smart Buddy, the UniVerse campus assistant. Upcoming events: ${JSON.stringify(events)}. Top study resources: ${JSON.stringify(resources)}. Student question: ${query}`
                  }
                ]
              }
            ]
          })
        }
      );
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.json({ demoMode: false, provider: 'Gemini', reply: text });
        }
      }
    } catch (_) {
      // Fall through to clearly labeled demo mode
    }
  }

  // Clearly labeled Demo Mode fallback (never pretends to be a live AI model)
  const lower = query.toLowerCase();
  let reply = '';

  if (lower.includes('event') || lower.includes('hackathon') || lower.includes('workshop')) {
    const list = events.map((e) => `• **${e.title}** (${e.category}) — ${e.location} on ${e.event_date.replace('T', ' ')}`).join('\n');
    reply = `Here are the next upcoming events on UniVerse:\n${list || 'No upcoming events found.'}\n\nYou can register directly on the **Campus Events** page to earn +60 XP!`;
  } else if (lower.includes('study') || lower.includes('note') || lower.includes('pdf') || lower.includes('resource')) {
    const list = resources.map((r) => `• **${r.title}** (${r.subject}, ${r.semester})`).join('\n');
    reply = `Top downloaded materials in **StudyHub**:\n${list || 'No resources uploaded yet.'}\n\nTip: Upload your own PDF notes in StudyHub to unlock the **Knowledge Sharer** badge.`;
  } else if (lower.includes('teammate') || lower.includes('skill') || lower.includes('project')) {
    reply = 'Head over to **SkillSphere** to view your compatibility score with other students. Add both technical and non-technical skills to your profile so our matching algorithm can recommend complementary teammates!';
  } else if (lower.includes('lost') || lower.includes('found')) {
    reply = 'Check the **Lost & Found Portal** right away. You can filter by Electronics, Books, or Accessories, and contact the finder through our protected messaging system without exposing personal phone numbers.';
  } else if (lower.includes('rest') || lower.includes('api') || lower.includes('express') || lower.includes('sql')) {
    reply = 'Quick study refresher: A **REST API** uses HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) mapped to resources. In UniVerse, Express routes validate JWT tokens in middleware before querying SQLite with parameterized statements.';
  } else {
    reply = `I'm running in **Demo Mode** (no external AI API key configured in \`.env\`). I can still help you with:\n• Upcoming campus events & registration\n• StudyHub notes & exam prep tips\n• Finding hackathon teammates on SkillSphere\n• Lost & Found support\n\nTry asking: *"What events are coming up?"* or *"Recommend study resources."*`;
  }

  res.json({
    demoMode: true,
    provider: 'UniVerse Demo Mode (Local Rule-Based Fallback)',
    reply
  });
};
