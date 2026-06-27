const express = require('express');
const { protect } = require('../middleware/auth');
const FAQ = require('../models/FAQ');
const Conversation = require('../models/Conversation');
const { Anthropic } = require('@anthropic-ai/sdk');

const router = express.Router();

const callGemini = async (apiKey, systemPrompt, contentsOrMessage) => {
  let contents = [];
  if (typeof contentsOrMessage === 'string') {
    contents = [{ parts: [{ text: `System Instruction: ${systemPrompt}\n\nUser Message: ${contentsOrMessage}` }] }];
  } else {
    contents = [
      { role: 'user', parts: [{ text: `System Instruction: ${systemPrompt}\n\nUnderstood?` }] },
      { role: 'model', parts: [{ text: 'Understood. I will act as the portal virtual assistant and follow those rules.' }] },
      ...contentsOrMessage
    ];
  }

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600,
    },
  };

  if (typeof fetch !== 'undefined') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } else {
    const https = require('https');
    return new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const req = https.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(body);
                resolve(data.candidates?.[0]?.content?.parts?.[0]?.text);
              } catch (e) {
                reject(e);
              }
            } else {
              reject(new Error(`Gemini API error: ${res.statusCode} - ${body}`));
            }
          });
        }
      );
      req.on('error', (err) => reject(err));
      req.write(JSON.stringify(payload));
      req.end();
    });
  }
};

const buildGeminiContents = (messages) => {
  const contents = [];
  for (const msg of messages) {
    const role = msg.sender === 'bot' ? 'model' : 'user';
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += '\n' + msg.text;
    } else {
      contents.push({
        role: role,
        parts: [{ text: msg.text }]
      });
    }
  }
  while (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }
  return contents.slice(-15);
};

const buildClaudeMessages = (messages) => {
  const formatted = [];
  for (const msg of messages) {
    const role = msg.sender === 'bot' ? 'assistant' : 'user';
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].content += '\n' + msg.text;
    } else {
      formatted.push({
        role: role,
        content: msg.text
      });
    }
  }
  while (formatted.length > 0 && formatted[0].role !== 'user') {
    formatted.shift();
  }
  return formatted.slice(-15);
};

// Require login for all chatbot interactions
router.use(protect);

// @route   GET /api/ai/chatbot/faqs
// Retrieve lists of popular FAQs for quick-action suggestions
router.get('/faqs', async (req, res) => {
  try {
    const faqs = await FAQ.find().select('question category').limit(6);
    return res.json({ success: true, data: faqs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch FAQs.', error: error.message });
  }
});

// @route   GET /api/ai/chatbot/history
// Retrieve the authenticated student's persistent chat conversation history
router.get('/history', async (req, res) => {
  try {
    const convo = await Conversation.findOne({ userId: req.user._id });
    if (!convo) {
      return res.json({ success: true, data: { messages: [] } });
    }
    return res.json({ success: true, data: convo });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve chat logs.', error: error.message });
  }
});

// @route   POST /api/ai/chatbot/message
// Process query, search FAQ collection, consult AI if needed, log conversation
router.post('/message', async (req, res) => {
  try {
    const { message, language = 'en' } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const userId = req.user._id;

    // 1. Get or create student conversation thread
    let convo = await Conversation.findOne({ userId });
    if (!convo) {
      convo = new Conversation({ userId, messages: [] });
    }

    // 2. Append User message
    convo.messages.push({
      sender: 'user',
      text: message,
      timestamp: new Date()
    });
    let reply = '';
    const cleanQuery = message.trim().toLowerCase();

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const systemPrompt = `You are a virtual assistant for the Prime Minister Special Scholarship Scheme (PMSS / PMSSS) portal of the Government of India.
You must answer queries professionally, accurately, and assistively in the language requested (User language: ${language}).
Rules of PMSSS:
1. Eligibility: J&K and Ladakh residents who passed 10+2 or diploma.
2. Income limit: Total family income <= 8 Lakhs per annum.
3. Documents: Aadhaar, domicile, income certificate, marksheet, bank passbook, bonafide.
4. Process: Student applies -> College verifies -> Central admin approves -> Disbursed via DBT.

Keep your response friendly, clear, and structured. Direct candidates to contact support@pmss.gov.in for specific issues.`;

    // 1. Try Gemini first (prioritized, conversational)
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        console.log('[DEBUG] Querying Gemini AI chatbot...');
        const contents = buildGeminiContents(convo.messages);
        reply = await callGemini(geminiApiKey, systemPrompt, contents);
      } catch (apiErr) {
        console.error('Gemini API call failed in chatbot router, falling back to Claude or local rules:', apiErr.message);
      }
    }

    // 2. Try Claude second (conversational)
    if (!reply && anthropicApiKey && anthropicApiKey.trim() !== '') {
      try {
        console.log('[DEBUG] Querying Claude AI chatbot...');
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });
        const formattedMessages = buildClaudeMessages(convo.messages);
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 600,
          messages: formattedMessages,
          system: systemPrompt,
          temperature: 0.3
        });
        reply = response.content[0].text;
      } catch (apiErr) {
        console.error('Claude API call failed in chatbot router, falling back to local database:', apiErr.message);
      }
    }

    // 3. Fallback to FAQ database matches if AI keys are not available/failed
    if (!reply) {
      const faqMatch = await FAQ.findOne({
        $or: [
          { question: { $regex: cleanQuery, $options: 'i' } },
          { answer: { $regex: cleanQuery, $options: 'i' } }
        ]
      });
      if (faqMatch) {
        reply = faqMatch.answer;
      }
    }

    // 4. Fallback to local keyword matching
    if (!reply) {
      if (cleanQuery.includes('income') || cleanQuery.includes('salary') || cleanQuery.includes('आय') || cleanQuery.includes('வருமானம்')) {
        reply = 'The family income limit for the PMSS scholarship is ₹8,00,000 per annum. You must upload a valid Income Certificate issued by a competent authority.';
      } else if (cleanQuery.includes('eligible') || cleanQuery.includes('criteria') || cleanQuery.includes('पात्र') || cleanQuery.includes('தகுதி')) {
        reply = 'To be eligible for PMSSS, you must be a resident of J&K or Ladakh, have passed Class 12 or equivalent, and have a family income under ₹8,00,000 per annum.';
      } else if (cleanQuery.includes('document') || cleanQuery.includes('file') || cleanQuery.includes('दस्ताвеज़') || cleanQuery.includes('ஆவணம்')) {
        reply = 'The required documents are:\n1. Aadhaar Card\n2. Domicile/State Residence Certificate\n3. Income Certificate\n4. Caste Certificate (if applicable)\n5. Class 12 Mark Sheet\n6. Bank Passbook\n7. Bonafide College Certificate.';
      } else if (cleanQuery.includes('status') || cleanQuery.includes('track') || cleanQuery.includes('स्थिति') || cleanQuery.includes('நிலை')) {
        reply = 'You can check your application timeline on the "Status" tab of your dashboard. Statuses range from Draft ➔ Submitted ➔ Verification ➔ Review ➔ Approved ➔ Released.';
      } else if (cleanQuery.includes('deadline') || cleanQuery.includes('date') || cleanQuery.includes('अंतिम') || cleanQuery.includes('தேதி')) {
        reply = 'The registration deadline is generally set by the Ministry of Education. Please check the notifications bar on your homepage for current dates.';
      } else if (cleanQuery.includes('reject') || cleanQuery.includes('reason') || cleanQuery.includes('अस्वीकार') || cleanQuery.includes('மறுக்க')) {
        reply = 'If your application is rejected, please check the status remarks. Common reasons include blurred certificates or incorrect IFSC codes. You can revise and re-upload documents on your Profile page.';
      } else if (cleanQuery.includes('profile') || cleanQuery.includes('completion') || cleanQuery.includes('முடிக்க') || cleanQuery.includes('पूर्ण')) {
        reply = 'To update your profile, go to "My Profile" tab. Fill all personal, address, academic, and bank fields. Upload required files to raise completion to at least 80% to apply.';
      } else {
        reply = 'Thank you for your question. For detailed guidelines, please refer to the portal rules page, or contact support at support@pmss.gov.in.';
      }
    }

    // 6. Append Bot reply
    convo.messages.push({
      sender: 'bot',
      text: reply,
      timestamp: new Date()
    });

    await convo.save();

    return res.json({
      success: true,
      data: {
        reply,
        convo
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Chat message processing failed.', error: error.message });
  }
});

module.exports = router;
