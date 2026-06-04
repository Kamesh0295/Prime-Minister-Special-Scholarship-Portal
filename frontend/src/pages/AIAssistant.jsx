import React, { useState } from 'react';
import API from '../services/api';
import { Brain, HelpCircle, Copy, Check, Sparkles, AlertTriangle, ShieldCheck, Play, ArrowLeft } from 'lucide-react';

const AIAssistant = () => {
  // Input fields
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [methodology, setMethodology] = useState('');

  // Status & results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setAnalysisResult(null);

    if (!title || !hypothesis || !methodology) {
      setError('Please fill in all three fields to begin calculation.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.post('/ai/hypothesis', {
        title,
        hypothesis,
        methodology,
      });

      if (response.data?.success) {
        setAnalysisResult(response.data.data);
      } else {
        setError(response.data?.message || 'Hypothesis scan failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete AI evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    const copyText = `
--- AI HYPOTHESIS EVALUATION REPORT ---
Title: ${title}
Validity: ${analysisResult.validity ? 'PHYSICALLY PLAUSIBLE' : 'THEORETICALLY INCOHERENT'}
Score: ${analysisResult.score}/10

Suggestions:
${analysisResult.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join('\n')}

Summary Analysis:
${analysisResult.summary}
    `.trim();

    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
          <Brain className="h-8 w-8 text-scifi-cyan animate-pulse" />
          AI Hypothesis Assistant
        </h1>
        <p className="text-xs text-scifi-cyan font-mono uppercase tracking-widest mt-1">
          // Model: Claude 3.5 Sonnet Gravity Co-Pilot
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Inputs panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel border border-white/5 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white tracking-widest font-mono uppercase mb-4 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-scifi-cyan" /> // Physics Input Console
            </h3>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">
                  Research Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Superconducting Magnetic Gravity Metric Distortion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">
                  Theoretical Hypothesis
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your hypothesis regarding gravity modification..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  className="w-full px-3 py-2.5 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">
                  Proposed Methodology
                </label>
                <textarea
                  rows={5}
                  placeholder="Describe the instrumentation, electromagnetic coils, laser grid arrays, or cooling chambers..."
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="w-full px-3 py-2.5 bg-scifi-darkest/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-scifi-cyan text-xs"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-scifi-red/10 border border-scifi-red/35 text-scifi-red rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-scifi-violet to-scifi-cyan hover:from-scifi-violet/90 hover:to-scifi-cyan/90 text-white font-bold rounded-xl shadow-cyan-glow hover:shadow-cyan-glow-intense flex items-center justify-center gap-2 transition-all text-xs font-mono uppercase tracking-widest disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" /> Begin AI Evaluation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Evaluation Output panel */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="glass-panel border border-scifi-cyan/30 rounded-2xl p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px] pulse-cyan-glow">
              <div className="h-16 w-16 border-4 border-scifi-cyan border-t-transparent rounded-full animate-spin shadow-cyan-glow-intense mb-6" />
              <h3 className="text-lg font-bold text-white mb-2 font-mono tracking-wider animate-pulse uppercase">AI SCANNING HYPOTHESIS</h3>
              <p className="text-gray-500 text-xs max-w-sm font-mono leading-relaxed">
                Analyzing metric constraints... Evaluating energy-momentum tensor consistency... Isolating electromagnetic noise coefficients...
              </p>
            </div>
          ) : analysisResult ? (
            <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-6 h-full flex flex-col justify-between">
              
              {/* Badges and Score header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                
                {/* Validity Badge */}
                <div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1.5">Theory Validity</div>
                  {analysisResult.validity ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-scifi-green/10 border border-scifi-green/30 rounded-full text-scifi-green font-bold text-xs tracking-wider uppercase font-mono">
                      <ShieldCheck className="h-4 w-4" /> Plausible Model
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-scifi-red/10 border border-scifi-red/30 rounded-full text-scifi-red font-bold text-xs tracking-wider uppercase font-mono">
                      <AlertTriangle className="h-4 w-4" /> Hypothetical / Fringe
                    </div>
                  )}
                </div>

                {/* Score Dial */}
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <svg className="absolute transform -rotate-90 w-14 h-14">
                      <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                      <circle cx="28" cy="28" r="24" stroke="#06B6D4" strokeWidth="4" fill="transparent"
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={2 * Math.PI * 24 * (1 - analysisResult.score / 10)}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="text-sm font-extrabold text-white font-mono">{analysisResult.score}/10</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Physics Score</div>
                    <div className="text-xs text-white font-semibold">Scientific Rigor Index</div>
                  </div>
                </div>

              </div>

              {/* Suggestions bullets */}
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Key Optimization Suggestions</div>
                <ul className="space-y-2">
                  {analysisResult.suggestions.map((s, idx) => (
                    <li key={idx} className="p-3 bg-scifi-violet/5 border border-scifi-violet/10 rounded-xl text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                      <span className="text-scifi-violet font-bold font-mono">#{idx+1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Text Area Summary */}
              <div className="flex-grow space-y-2">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Structured Review Summary</div>
                <div className="p-4 bg-scifi-darkest/60 border border-white/5 rounded-xl text-xs font-sans text-gray-300 leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-line border-t border-t-scifi-cyan/25">
                  {analysisResult.summary}
                </div>
              </div>

              {/* Footer commands */}
              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-xl hover:border-scifi-cyan text-xs font-mono font-bold text-gray-400 hover:text-white transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-scifi-green" /> COPIED REPORT
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> COPY SUMMARY
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-panel border border-white/5 rounded-2xl p-12 text-center h-full min-h-[400px] flex flex-col items-center justify-center">
              <HelpCircle className="h-16 w-16 text-gray-700 mb-4 animate-bounce" />
              <h3 className="text-base font-bold text-white mb-1 font-mono uppercase tracking-wider">Awaiting Simulation Physics Data</h3>
              <p className="text-gray-500 text-xs max-w-xs mx-auto leading-relaxed">
                Provide research title, hypothesis statements, and methodologies in the console to evaluate physical coherence.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
