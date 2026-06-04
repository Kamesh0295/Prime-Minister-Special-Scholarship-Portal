import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, Eye, HelpCircle, Mic, MicOff } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

const AccessibilityController = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('pmss_contrast') === 'true');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('pmss_font_size') || 'md');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showHelper, setShowHelper] = useState(false);

  useEffect(() => {
    const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setVoiceSupported(isSupported);
  }, []);

  // Update contrast class
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('dark', 'high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
      // Only keep 'dark' if dark mode is configured, but let high-contrast override
    }
    localStorage.setItem('pmss_contrast', highContrast);
  }, [highContrast]);

  // Update root font size
  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'lg') {
      root.style.fontSize = '18px';
    } else if (fontSize === 'xl') {
      root.style.fontSize = '20px';
    } else {
      root.style.fontSize = '16px';
    }
    localStorage.setItem('pmss_font_size', fontSize);
  }, [fontSize]);

  const toggleContrast = () => setHighContrast(!highContrast);

  const adjustFont = (size) => setFontSize(size);

  const startVoiceCommands = () => {
    if (!voiceSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log('Voice Command received:', command);
      
      // Matching navigation commands
      if (command.includes('dashboard') || command.includes('home')) {
        navigate('/dashboard');
        speakResponse('Navigating to Dashboard');
      } else if (command.includes('apply') || command.includes('application')) {
        navigate('/dashboard/application');
        speakResponse('Opening Scholarship Application');
      } else if (command.includes('status') || command.includes('timeline')) {
        navigate('/dashboard/status');
        speakResponse('Opening Application Status');
      } else if (command.includes('contrast') || command.includes('dark')) {
        setHighContrast(prev => !prev);
        speakResponse('Toggling high contrast mode');
      } else if (command.includes('increase font') || command.includes('larger text')) {
        setFontSize('lg');
        speakResponse('Font size set to large');
      } else if (command.includes('decrease font') || command.includes('reset font')) {
        setFontSize('md');
        speakResponse('Font size reset');
      } else if (command.includes('transparency') || command.includes('portal')) {
        navigate('/transparency');
        speakResponse('Opening Public Transparency Portal');
      } else if (command.includes('logout') || command.includes('sign out')) {
        // Find logout button and click it
        const logoutBtn = document.getElementById('pmss-logout-btn');
        if (logoutBtn) {
          logoutBtn.click();
          speakResponse('Logging out');
        }
      } else {
        speakResponse('Command not recognized. Please try saying Go to Dashboard or Toggle Contrast.');
      }
    };

    recognition.start();
  };

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all text-xs">
      {/* Contrast Toggle */}
      <button
        onClick={toggleContrast}
        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
        title={t('highContrast')}
        aria-label={t('highContrast')}
      >
        <Eye className="w-4 h-4" />
        <span className="hidden md:inline">{highContrast ? t('normalContrast') : t('highContrast')}</span>
      </button>

      {/* Font Size Adjusters */}
      <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
      
      <div className="flex items-center gap-1">
        <span className="text-slate-500 dark:text-slate-400 mr-1">{t('textSize')}:</span>
        <button
          onClick={() => adjustFont('md')}
          className={`px-2 py-0.5 rounded font-bold transition-all ${
            fontSize === 'md'
              ? 'bg-primary text-white scale-105'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
          title="Normal Font Size"
        >
          A
        </button>
        <button
          onClick={() => adjustFont('lg')}
          className={`px-2 py-0.5 rounded font-bold text-sm transition-all ${
            fontSize === 'lg'
              ? 'bg-primary text-white scale-105'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
          title="Large Font Size"
        >
          A+
        </button>
        <button
          onClick={() => adjustFont('xl')}
          className={`px-2 py-0.5 rounded font-bold text-base transition-all ${
            fontSize === 'xl'
              ? 'bg-primary text-white scale-105'
              : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
          title="Extra Large Font Size"
        >
          A++
        </button>
      </div>

      {/* Voice Recognition Control */}
      {voiceSupported && (
        <>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
          <div className="relative">
            <button
              onClick={startVoiceCommands}
              className={`p-1.5 rounded flex items-center gap-1.5 transition-all ${
                listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Voice Commands Control"
              aria-label="Start Voice Navigation"
            >
              {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-slate-500" />}
              <span className="hidden lg:inline">{listening ? 'Listening...' : 'Voice Nav'}</span>
            </button>
          </div>
          <button
            onClick={() => setShowHelper(!showHelper)}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
            title="Show Voice Commands Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          
          {showHelper && (
            <div className="absolute top-12 right-6 z-50 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-slate-800 dark:text-slate-100">
              <h4 className="font-bold text-sm mb-1.5 border-b pb-1">Available Voice Commands:</h4>
              <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-600 dark:text-slate-300">
                <li><span className="font-semibold text-slate-800 dark:text-white">"Go to Dashboard"</span> - Open Dashboard</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Open Application"</span> - Apply for Scholarship</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Open Status"</span> - Check scholarship timeline</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Toggle Contrast"</span> - Switch high contrast mode</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Larger Text"</span> - Increase text scaling</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Reset Font"</span> - Default text scaling</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Transparency Portal"</span> - Public portal stats</li>
                <li><span className="font-semibold text-slate-800 dark:text-white">"Sign Out"</span> - Logout from PMSS</li>
              </ul>
              <button 
                onClick={() => setShowHelper(false)}
                className="mt-2.5 w-full text-center py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 text-[10px] font-semibold"
              >
                Close
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccessibilityController;
