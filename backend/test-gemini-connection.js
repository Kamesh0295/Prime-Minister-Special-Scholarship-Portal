const path = require('path');
const fs = require('fs');

console.log('--- DEBUG INFO ---');
const envPath = path.join(__dirname, '.env');
console.log(`Script Directory (__dirname): ${__dirname}`);
console.log(`Expected .env Path: ${envPath}`);
console.log(`Does .env File Exist? ${fs.existsSync(envPath) ? 'Yes' : 'No'}`);

const dotenvResult = require('dotenv').config({ path: envPath, override: true });
if (dotenvResult.error) {
  console.log('❌ dotenv Error:', dotenvResult.error);
} else {
  console.log('✅ dotenv loaded successfully.');
  console.log('Loaded Keys:', Object.keys(dotenvResult.parsed || {}));
  console.log('Parsed GEMINI_API_KEY:', JSON.stringify(dotenvResult.parsed.GEMINI_API_KEY));
}
console.log(`process.env.GEMINI_API_KEY: ${JSON.stringify(process.env.GEMINI_API_KEY)}`);
console.log('\n--- RAW .ENV CONTENT ON DISK ---');
try {
  const rawContent = fs.readFileSync(envPath, 'utf8');
  console.log(rawContent);
} catch (err) {
  console.log('Error reading raw file:', err.message);
}
console.log('--------------------------------\n');

const { Anthropic } = require('@anthropic-ai/sdk');

const callGemini = async (apiKey, systemPrompt, message) => {
  const payload = {
    contents: [{ parts: [{ text: `System Instruction: ${systemPrompt}\n\nUser Message: ${message}` }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 100,
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

const runTest = async () => {
  console.log('====================================================');
  console.log('       Gemini API Connection Verification Tool      ');
  console.log('====================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in backend/.env file.');
    console.log('\nPlease make sure you add the key in backend/.env:');
    console.log('GEMINI_API_KEY=your_actual_api_key_here\n');
    process.exit(1);
  }

  if (apiKey.trim() === '') {
    console.error('❌ Error: GEMINI_API_KEY in backend/.env is empty.');
    process.exit(1);
  }

  console.log(`ℹ️ Key found: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
  
  if (!apiKey.startsWith('AIzaSy')) {
    console.warn('⚠️ Warning: The API key does not start with "AIzaSy" (standard Google API Key prefix). Make sure it is correct.');
  }

  console.log('🔄 Attempting to connect to Gemini 1.5 Flash API...');
  
  const systemPrompt = "You are a helpful test assistant. Confirm connection status.";
  const testMessage = "Hello Gemini! If you can read this, respond with a short sentence saying 'Connection Successful!'";

  try {
    const startTime = Date.now();
    const result = await callGemini(apiKey, systemPrompt, testMessage);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🟢 CONNECTION SUCCESSFUL!');
    console.log(`⏱️ Response Time: ${duration}s`);
    console.log(`🤖 Gemini Response:\n----------------------------------------\n${result}\n----------------------------------------`);
  } catch (error) {
    console.error('\n🔴 CONNECTION FAILED!');
    console.error(`❌ Error Details: ${error.message}`);
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Verify your internet connection.');
    console.log('2. Double-check that your GEMINI_API_KEY is valid and has no extra spaces.');
    console.log('3. Ensure the API key has the "Generative Language API" enabled in your Google Cloud Console.');
  }
};

runTest();
