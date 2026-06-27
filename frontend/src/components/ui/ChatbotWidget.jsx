import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import API from '../../services/api';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

const ChatbotWidget = () => {
  const { token, user } = useSelector((s) => s.auth);
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Load chat history and FAQs on mount (if authenticated)
  useEffect(() => {
    if (!token) return;

    const loadChatLogs = async () => {
      try {
        const [historyRes, faqsRes] = await Promise.all([
          API.get('/ai/chatbot/history'),
          API.get('/ai/chatbot/faqs')
        ]);
        if (historyRes.data.success && historyRes.data.data?.messages) {
          setMessages(historyRes.data.data.messages);
        } else {
          setMessages([
            { sender: 'bot', text: 'Hello! I am your PMSS Virtual Assistant. How can I help you today?' }
          ]);
        }
        if (faqsRes.data.success) {
          setSuggestions(faqsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load chatbot details:', err);
      }
    };

    loadChatLogs();
  }, [token]);

  // Scroll to bottom when messages or open state updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  if (!token) return null; // Hide chatbot for guests

  const handleSend = async (messageText) => {
    const query = messageText || input;
    if (!query.trim()) return;

    // Append user message immediately
    const userMsg = { sender: 'user', text: query, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await API.post('/ai/chatbot/message', { message: query });
      if (res.data.success) {
        const botReply = {
          sender: 'bot',
          text: res.data.data.reply,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, botReply]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'I am experiencing connection issues. Please try again shortly.', timestamp: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const defaultSuggestions = [
    { question: 'Am I eligible for this scholarship?' },
    { question: 'What documents are required?' },
    { question: 'How do I apply?' },
    { question: 'When is the deadline?' },
    { question: 'Why was my application rejected?' },
    { question: 'How can I update my profile?' }
  ];

  const suggestionsList = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none font-sans">
      {/* Floating Toggle Bubble */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95 duration-200"
          aria-label="Open support chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[450px] bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
          
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-200" />
              <div>
                <span className="font-bold text-xs tracking-wider block">PMSS Virtual Assistant</span>
                <span className="text-[9px] text-blue-200 block">AI Chatbot Offline/Online Engine</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-blue-700 rounded-xl transition text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Logs Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed shadow-sm border ${
                  m.sender === 'user'
                    ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none'
                    : 'bg-white border-gray-100 text-slate-700 rounded-tl-none'
                }`}>
                  {m.text.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                  {m.timestamp && (
                    <span className={`block text-[8px] mt-1.5 text-right font-medium ${
                      m.sender === 'user' ? 'text-white/60' : 'text-slate-400'
                    }`}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions scroll */}
          <div className="px-3 py-2 border-t border-gray-100 bg-white flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
            {suggestionsList.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s.question)}
                className="px-2.5 py-1 border border-gray-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-full transition"
              >
                {s.question.replace('Am I eligible for this scholarship?', 'Eligibility?').replace('What documents are required?', 'Documents?').replace('How do I apply?', 'Apply?')}
              </button>
            ))}
          </div>

          {/* Submit form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2 border-t border-gray-100 bg-white flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask support query..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-gray-200 text-gray-800 rounded-xl outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
