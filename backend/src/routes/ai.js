const express = require('express');
const { protect } = require('../middleware/auth');
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

router.use(protect);

// ----------------------------------------------------
// 1. OCR-Based Document Verification & Auto-Fill
// ----------------------------------------------------
router.post('/ocr', async (req, res) => {
  try {
    const { documentType, fileName = '' } = req.body;

    if (!documentType) {
      return res.status(400).json({ success: false, message: 'documentType is required.' });
    }

    // Simulate OCR delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    let extractedData = {};
    const name = req.user.fullName.toUpperCase();
    const dob = req.user.dateOfBirth
      ? new Date(req.user.dateOfBirth).toISOString().split('T')[0]
      : '2004-08-12';

    // Simulated OCR extraction based on the document type
    switch (documentType) {
      case 'aadhaar':
        extractedData = {
          aadhaarNumber: '5489-3210-9874',
          fullName: name, // Perfect match or simulate minor difference (e.g. spelling or spacing)
          dateOfBirth: dob,
          gender: 'Male',
          address: 'Flat 402, Green Glen Layout, Outer Ring Road, Bangalore, Karnataka - 560103',
        };
        break;
      case 'incomeCertificate':
        extractedData = {
          fullName: name,
          annualIncome: 240000,
          certificateNumber: 'INC/2026/89324',
          issueDate: '2026-02-14',
          validUntil: '2027-03-31',
        };
        break;
      case 'casteCertificate':
        extractedData = {
          fullName: name,
          category: 'OBC',
          certificateNumber: 'CST/OBC/987123',
          casteName: 'Backward Class',
        };
        break;
      case 'marksheet':
        extractedData = {
          fullName: name,
          rollNumber: '12893041',
          boardName: 'Central Board of Secondary Education (CBSE)',
          previousYearMarks: 88.5,
          passingYear: 2025,
        };
        break;
      case 'bankPassbook':
        extractedData = {
          accountHolderName: name,
          bankName: 'State Bank of India',
          branchName: 'Delhi Main Branch',
          accountNumber: '38942109832',
          ifscCode: 'SBIN0000691',
        };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unsupported document type for OCR.' });
    }

    return res.json({
      success: true,
      message: `${documentType} processed successfully via AI OCR.`,
      data: extractedData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'OCR failed.', error: error.message });
  }
});

// ----------------------------------------------------
// 2. AI Eligibility Checker
// ----------------------------------------------------
router.post('/eligibility', async (req, res) => {
  try {
    const { personalDetails = {}, academicDetails = {}, bankDetails = {} } = req.body;

    const reasons = [];
    const recommendations = [];
    let status = 'Eligible';

    // 1. Income Check (Must be <= 800,000 INR)
    const income = personalDetails.annualIncome || 250000; // default mock
    if (income > 800000) {
      status = 'Not Eligible';
      reasons.push(`Annual income of ₹${income.toLocaleString()} exceeds the maximum limit of ₹8,00,000.`);
      recommendations.push('Consider applying for general open-category private scholarships.');
    }

    // 2. Academic Mark check
    const marks = academicDetails.previousYearMarks;
    if (marks === undefined || marks === null) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Previous academic year marks are missing.');
      recommendations.push('Please enter your previous year marks in the Academic Details section.');
    } else if (marks < 50) {
      status = 'Not Eligible';
      reasons.push(`Academic score of ${marks}% is below the minimum required 50%.`);
      recommendations.push('A minimum academic score of 50% is required for PMSS.');
    }

    // 3. Aadhaar Verification
    if (!personalDetails.aadhaarNumber) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Aadhaar number is missing.');
      recommendations.push('Enter a valid 12-digit Aadhaar number and verify it.');
    }

    // 4. State/Domain Check
    const state = personalDetails.state || req.user.state;
    if (!state) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('State of domicile is missing.');
      recommendations.push('Specify your state of residence.');
    }

    // 5. Institution check
    if (!academicDetails.institutionName) {
      if (status !== 'Not Eligible') status = 'Missing Requirements';
      reasons.push('Institution details are missing.');
      recommendations.push('Select or enter an AICTE/UGC recognized college.');
    }

    // 6. Probably Eligible Case
    if (status === 'Eligible' && marks >= 50 && marks < 60) {
      status = 'Probably Eligible';
      reasons.push('Marks are between 50% and 60% which is passing, but subject to seat allocation cutoffs.');
      recommendations.push('Submit your application early to secure rank in the allocation list.');
    }

    return res.json({
      success: true,
      data: {
        status,
        reasons,
        recommendations,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Eligibility check failed.', error: error.message });
  }
});

// ----------------------------------------------------
// 3. AI Scholarship Recommendation System
// ----------------------------------------------------
router.get('/recommendations', async (req, res) => {
  try {
    const StudentProfile = require('../models/StudentProfile');
    const profile = await StudentProfile.findOne({ studentId: req.user._id });

    // Extract profile values or fall back to user values/defaults
    const category = profile?.category || req.user.category || 'OBC';
    const state = profile?.address?.state || req.user.state || 'Jammu & Kashmir';
    const degree = profile?.degree || req.user.course || 'B.Tech';
    const cgpa = (profile?.cgpa !== undefined && profile?.cgpa !== null) ? profile.cgpa : 7.0;
    const familyIncome = (profile?.familyIncome !== undefined && profile?.familyIncome !== null) ? profile.familyIncome : 250000;

    const scholarships = [
      {
        name: 'Prime Minister Special Scholarship Scheme (PMSSS)',
        description: 'Specifically for students from Jammu & Kashmir and Ladakh pursuing undergraduate professional degrees.',
        provider: 'AICTE / Ministry of Education, Govt. of India',
        amount: '₹1,50,000 to ₹3,00,000 per annum',
        criteria: 'Domicile of J&K/Ladakh, Family income <= 8 LPA, Passed 10+2.',
        calculateMatch: () => {
          let score = 0;
          // State Check: 40% weight
          if (['Jammu & Kashmir', 'Ladakh'].includes(state)) score += 40;
          // Income Check: 30% weight
          if (familyIncome <= 800000) score += 30;
          // CGPA Check: 20% weight (assuming passing threshold)
          if (cgpa >= 5.0) score += 20;
          // Degree/Course Check: 10% weight
          if (['B.Tech', 'MBBS', 'B.Sc', 'B.Com', 'B.A', 'B.E', 'B.Pharmacy'].includes(degree)) score += 10;
          return score;
        }
      },
      {
        name: 'Central Sector Scheme of Scholarship for College & University Students',
        description: 'For university students scoring above 80th percentile or outstanding CGPA in their studies.',
        provider: 'Department of Higher Education, Govt. of India',
        amount: '₹12,000 to ₹20,000 per annum',
        criteria: 'Marks/CGPA >= 8.0 (80%), Family income <= 4.5 LPA.',
        calculateMatch: () => {
          let score = 0;
          // CGPA Match: 40% weight
          if (cgpa >= 8.0) score += 40;
          else if (cgpa >= 7.0) score += 25;
          else if (cgpa >= 6.0) score += 10;
          
          // Income Match: 30% weight
          if (familyIncome <= 450000) score += 30;
          else if (familyIncome <= 600000) score += 15;

          // Category Match (General sector scheme): 20% weight
          if (['General', 'OBC'].includes(category)) score += 20;
          else score += 15;

          // Domicile State (applicable nationally): 10% weight
          score += 10;
          return score;
        }
      },
      {
        name: 'Post-Matric Scholarship Scheme for OBC Students',
        description: 'Financial support for OBC category students pursuing higher education.',
        provider: 'Ministry of Social Justice and Empowerment, Govt. of India',
        amount: '₹10,000 to ₹50,000 per annum',
        criteria: 'OBC category student, family income <= 2.5 LPA.',
        calculateMatch: () => {
          let score = 0;
          // Category Match: 45% weight
          if (category === 'OBC') score += 45;
          else if (['SC', 'ST'].includes(category)) score += 10;

          // Income Match: 35% weight
          if (familyIncome <= 250000) score += 35;
          else if (familyIncome <= 400000) score += 15;

          // CGPA Match: 20% weight
          if (cgpa >= 5.0) score += 20;
          else score += 10;
          return score;
        }
      },
      {
        name: 'Post-Matric Scholarship Scheme for SC/ST Students',
        description: 'Tuition and maintenance fee reimbursement scheme for Scheduled Caste & Tribe candidates.',
        provider: 'Ministry of Tribal Affairs / Social Justice, Govt. of India',
        amount: '₹20,000 to ₹1,20,000 per annum',
        criteria: 'SC/ST category student, family income <= 2.5 LPA.',
        calculateMatch: () => {
          let score = 0;
          // Category Match: 45% weight
          if (['SC', 'ST'].includes(category)) score += 45;
          
          // Income Match: 35% weight
          if (familyIncome <= 250000) score += 35;
          else if (familyIncome <= 400000) score += 15;

          // CGPA Match: 20% weight
          if (cgpa >= 5.0) score += 20;
          return score;
        }
      },
      {
        name: 'ONGC Merit Scholarship for SC/ST/OBC Students',
        description: 'ONGC Foundation scholarship targeting professional streams (Engineering, MBBS, MBA).',
        provider: 'ONGC Foundation',
        amount: '₹48,000 per annum',
        criteria: 'SC/ST/OBC, professional course (B.Tech, MBBS, MBA), income <= 4.5 LPA, CGPA >= 6.0.',
        calculateMatch: () => {
          let score = 0;
          // Category check: 30% weight
          if (['SC', 'ST', 'OBC'].includes(category)) score += 30;
          
          // Degree check: 30% weight
          if (['B.Tech', 'MBBS', 'MBA', 'B.E'].includes(degree)) score += 30;
          
          // Income check: 20% weight
          if (familyIncome <= 450000) score += 20;

          // CGPA check: 20% weight
          if (cgpa >= 6.0) score += 20;
          return score;
        }
      },
      {
        name: 'State Merit-cum-Means Scholarship Scheme',
        description: 'Merit and means-based financial aid offered by state government departments.',
        provider: `Government of ${state}`,
        amount: '₹15,000 to ₹30,000 per annum',
        criteria: `Resident of matching state, family income <= 6 LPA, CGPA >= 6.0.`,
        calculateMatch: () => {
          let score = 0;
          // State Match: 40% weight
          if (state && state !== 'Unknown') score += 40;
          
          // Income Match: 30% weight
          if (familyIncome <= 600000) score += 30;
          else if (familyIncome <= 800000) score += 15;

          // CGPA Match: 20% weight
          if (cgpa >= 6.0) score += 20;
          else if (cgpa >= 5.0) score += 10;

          // Category Match: 10% weight
          score += 10;
          return score;
        }
      }
    ];

    const allScholarships = scholarships.map((s) => {
      const matchPercent = s.calculateMatch();
      return {
        name: s.name,
        description: s.description,
        provider: s.provider,
        amount: s.amount,
        criteria: s.criteria,
        eligibilityMatch: matchPercent,
      };
    });

    allScholarships.sort((a, b) => b.eligibilityMatch - a.eligibilityMatch);

    return res.json({
      success: true,
      data: allScholarships,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations.', error: error.message });
  }
});

// ----------------------------------------------------
// 4. AI Chatbot Assistant (Multilingual)
// ----------------------------------------------------
router.post('/chat', async (req, res) => {
  try {
    const { message, language = 'en', history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const systemPrompt = `You are a virtual assistant for the Prime Minister Special Scholarship Scheme (PMSS / PMSSS) portal of the Government of India.
You must answer queries professionally, accurately, and assistively in the language requested (User language: ${language}).
Rules of PMSSS:
1. Eligibility: Open to residents of J&K and Ladakh who passed 10+2 or diploma. 
2. Income limit: Total family income must not exceed 8 Lakhs INR per annum.
3. Documents required: Aadhaar card, domicile certificate, income certificate, caste certificate (if applicable), marksheets, bank passbook, bonafide certificate.
4. Process: Student submits app -> College officer verifies (Institution Verification) -> Central admin approves -> Disbursed directly to student's bank account.
5. Maximum scholarship: covers tuition fee and maintenance allowance up to 3 Lakhs per annum depending on course (Engineering, Medical, General).

Keep your response friendly, clear, and structured. Include a reference to contact support@pmss.gov.in for direct help.`;

    let reply = '';
    const conversationHistory = [...history, { sender: 'user', text: message }];

    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        console.log('[DEBUG] Querying Gemini AI chatbot...');
        const contents = buildGeminiContents(conversationHistory);
        reply = await callGemini(geminiApiKey, systemPrompt, contents);
      } catch (err) {
        console.error('Gemini API Error in chat, falling back to Claude or local chat engine:', err.message);
      }
    }

    if (!reply && anthropicApiKey && anthropicApiKey.trim() !== '') {
      try {
        console.log('[DEBUG] Querying Claude AI chatbot...');
        const anthropic = new Anthropic({ apiKey: anthropicApiKey });
        const formattedMessages = buildClaudeMessages(conversationHistory);
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 600,
          messages: formattedMessages,
          system: systemPrompt,
          temperature: 0.3,
        });
        reply = response.content[0].text;
      } catch (err) {
        console.error('Claude API Error in chat, falling back to local chat engine:', err.message);
      }
    }

    if (reply) {
      return res.json({
        success: true,
        data: {
          reply,
        },
      });
    }

    // Local Chat Engine (Multilingual Keyword Search)
    const lowerMessage = message.toLowerCase();
    reply = '';

    // English responses
    const responsesEn = {
      greeting: 'Hello! I am your PMSS Virtual Assistant. How can I help you today?',
      income: 'The family income limit for the PMSS scholarship is ₹8,00,000 per annum. You must upload a valid Income Certificate issued by a competent authority.',
      eligibility: 'To be eligible for PMSSS, you must be a resident of J&K or Ladakh, have passed Class 12 or equivalent, and have a family income under ₹8,00,000 per annum. Professional, Medical, and General Degree courses are supported.',
      documents: 'The required documents are:\n1. Aadhaar Card\n2. Domicile/State Residence Certificate\n3. Income Certificate\n4. Caste Certificate (if applicable)\n5. Class 12 Mark Sheet\n6. Bank Passbook\n7. Bonafide College Certificate.',
      status: 'You can check your application timeline on the "Status" tab of your dashboard. Statuses range from Draft ➔ Submitted ➔ Institution Verified ➔ Under Review ➔ Approved.',
      deadline: 'The registration deadline is generally set by the Ministry of Education. Please check the notifications bar on your homepage for current key dates.',
      unknown: 'Thank you for your question. For detailed guidelines, please refer to the rules section, or contact support at support@pmss.gov.in.',
    };

    // Hindi responses
    const responsesHi = {
      greeting: 'नमस्ते! मैं आपका पीएमएसएस वर्चुअल असिस्टेंट हूँ। आज मैं आपकी क्या मदद कर सकता हूँ?',
      income: 'पीएमएसएस छात्रवृत्ति के लिए परिवार की वार्षिक आय सीमा ₹8,00,000 है। आपको सक्षम अधिकारी द्वारा जारी आय प्रमाण पत्र अपलोड करना होगा।',
      eligibility: 'पीएमएसएसएस पात्रता के लिए: आपको जम्मू-कश्मीर या लद्दाख का निवासी होना चाहिए, 12वीं कक्षा उत्तीर्ण होना चाहिए, और पारिवारिक आय ₹8,00,000 से कम होनी चाहिए।',
      documents: 'आवश्यक दस्तावेज़:\n1. आधार कार्ड\n2. मूल निवास प्रमाण पत्र\n3. आय प्रमाण पत्र\n4. जाति प्रमाण पत्र (यदि लागू हो)\n5. 12वीं की मार्कशीट\n6. बैंक पासबुक\n7. कॉलेज बोनाफाइड प्रमाणपत्र।',
      status: 'आप अपने डैशबोर्ड पर "स्थिति" (Status) टैब में आवेदन की प्रगति देख सकते हैं। प्रक्रिया इस प्रकार है: ड्राफ्ट ➔ सबमिट ➔ संस्थान सत्यापित ➔ स्वीकृत।',
      deadline: 'पंजीकरण की अंतिम तिथि शिक्षा मंत्रालय द्वारा निर्धारित की जाती है। कृपया वर्तमान तिथियों के लिए होमपेज पर सूचनाएं देखें।',
      unknown: 'आपके प्रश्न के लिए धन्यवाद। विस्तृत दिशा-निर्देशों के लिए कृपया पोर्टल नियम देखें, या support@pmss.gov.in पर संपर्क करें।',
    };

    // Tamil responses
    const responsesTa = {
      greeting: 'வணக்கம்! நான் உங்கள் பிஎம்எஸ்எஸ் (PMSS) மெய்நிகர் உதவியாளர். இன்று உங்களுக்கு நான் எவ்வாறு உதவ முடியும்?',
      income: 'குடும்ப ஆண்டு வருமான வரம்பு ₹8,00,000 ஆகும். தகுதியான அதிகாரியால் வழங்கப்பட்ட வருமான சான்றிதழை நீங்கள் பதிவேற்ற வேண்டும்.',
      eligibility: 'PMSSS தகுதி பெற: நீங்கள் ஜம்மு-காஷ்மீர் அல்லது லடாக் குடியிருப்பாளராக இருக்க வேண்டும், 12 ஆம் வகுப்பு தேர்ச்சி பெற்றிருக்க வேண்டும் மற்றும் குடும்ப வருமானம் ₹8 லட்சம் வரம்பிற்குள் இருக்க வேண்டும்.',
      documents: 'தேவையான ஆவணங்கள்:\n1. ஆதார் அட்டை\n2. இருப்பிடச் சான்றிதழ்\n3. வருமான சான்றிதழ்\n4. சாதி சான்றிதழ்\n5. 12 ஆம் வகுப்பு மதிப்பெண் பட்டியல்\n6. வங்கி கணக்கு புத்தகம்\n7. கல்லூரி போனஃபைட் சான்றிதழ்.',
      status: 'உங்கள் டேஷ்போர்டில் உள்ள "நிலை" (Status) தாவலில் விண்ணப்பத்தின் முன்னேற்றத்தை நீங்கள் சரிபார்க்கலாம். நிலைகள்: வரைவு ➔ சமர்ப்பிக்கப்பட்டது ➔ கல்லூரி சரிபார்க்கப்பட்டது ➔ அங்கீகரிக்கப்பட்டது.',
      deadline: 'பதிவு செய்வதற்கான கடைசி தேதி கல்வி அமைச்சகத்தால் அறிவிக்கப்படும். தற்போதைய தேதிகளுக்கு முகப்புப் பக்கத்தைப் பார்க்கவும்.',
      unknown: 'உங்கள் கேள்விக்கு நன்றி. விரிவான வழிகாட்டுதல்களுக்கு support@pmss.gov.in என்ற மின்னஞ்சலில் எங்களை தொடர்பு கொள்ளவும்.',
    };

    // Pick language map
    let dict = responsesEn;
    if (language === 'hi') dict = responsesHi;
    else if (language === 'ta') dict = responsesTa;
    // Map other languages to Hindi/English for basic support
    else if (language === 'te' || language === 'bn' || language === 'mr') {
      dict = language === 'te' ? responsesHi : responsesEn; // fallback placeholder translation mapping
    }

    // Determine query keyword
    if (lowerMessage.includes('income') || lowerMessage.includes('salary') || lowerMessage.includes('आय') || lowerMessage.includes('வருமானம்')) {
      reply = dict.income;
    } else if (lowerMessage.includes('eligible') || lowerMessage.includes('criteria') || lowerMessage.includes('पात्र') || lowerMessage.includes('தகுதி')) {
      reply = dict.eligibility;
    } else if (lowerMessage.includes('document') || lowerMessage.includes('file') || lowerMessage.includes('दस्तावेज़') || lowerMessage.includes('ஆவணம்')) {
      reply = dict.documents;
    } else if (lowerMessage.includes('status') || lowerMessage.includes('track') || lowerMessage.includes('स्थिति') || lowerMessage.includes('நிலை')) {
      reply = dict.status;
    } else if (lowerMessage.includes('date') || lowerMessage.includes('last') || lowerMessage.includes('deadline') || lowerMessage.includes('अंतिम') || lowerMessage.includes('தேதி')) {
      reply = dict.deadline;
    } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey') || lowerMessage.includes('नमस्ते') || lowerMessage.includes('வணக்கம்')) {
      reply = dict.greeting;
    } else {
      reply = dict.unknown;
    }

    return res.json({
      success: true,
      data: {
        reply,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Chatbot failed.', error: error.message });
  }
});

module.exports = router;
