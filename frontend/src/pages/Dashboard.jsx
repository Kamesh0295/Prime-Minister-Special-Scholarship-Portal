import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { showError, showSuccess, showInfo } from '../store/slices/toastSlice';
import { applicationSuccess } from '../store/slices/applicationSlice';
import { getApplication } from '../services/studentService';
import { useTranslation } from '../context/LanguageContext';
import {
  FileText,
  PlusCircle,
  Eye,
  Download,
  Bell,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MessageSquare,
  X,
  Send,
  Loader2,
  BookmarkCheck,
  CheckSquare,
  ShieldCheck,
  Globe
} from 'lucide-react';

const STATUS_STEPS = ['submitted', 'institution_verified', 'under_review', 'approved', 'disbursed'];
const STEP_LABELS = {
  submitted: 'Submitted',
  institution_verified: 'College Verified',
  under_review: 'Under Review',
  approved: 'Approved',
  disbursed: 'Disbursed',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user, token } = useSelector((s) => s.auth);
  const { application } = useSelector((s) => s.application);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your PMSS Virtual Assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLang, setChatLang] = useState('en');
  const [chatLoading, setChatLoading] = useState(false);

  const fetchApp = async () => {
    try {
      const res = await getApplication();
      if (res.data.success) {
        dispatch(applicationSuccess(res.data.data));
      }
    } catch {
      // no application yet
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.data.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setRecsLoading(true);
      const res = await axios.get('http://localhost:5000/api/ai/recommendations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setRecommendations(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRecsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApp();
      fetchNotifications();
      fetchRecommendations();
    }
  }, [token]);

  const handleMarkAllRead = async () => {
    try {
      await axios.patch('http://localhost:5000/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotifications();
      dispatch(showSuccess('All notifications marked as read.'));
    } catch (err) {
      dispatch(showError('Failed to clear notifications.'));
    }
  };

  const handleDownloadLetter = async () => {
    if (!application?._id) return;
    try {
      setDownloading(true);
      const res = await axios.get(`http://localhost:5000/api/admin/applications/${application._id}/letter`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `PMSS_Approval_Letter_${user.fullName.replace(/ /g, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      dispatch(showSuccess('Letter downloaded successfully!'));
    } catch {
      dispatch(showError('Could not generate letter PDF.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleSendChat = async (textToSend) => {
    const msg = textToSend || chatInput;
    if (!msg.trim()) return;

    const userMsg = { sender: 'user', text: msg };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post(
        'http://localhost:5000/api/ai/chat',
        { message: msg, language: chatLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setChatMessages((prev) => [...prev, { sender: 'bot', text: res.data.data.reply }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: 'bot', text: 'Sorry, I am facing connectivity issues. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getProfilePercent = () => {
    if (!application) return 0;
    let score = 0;
    const personal = application.personalDetails || {};
    const personalCount = [personal.fullName, personal.dateOfBirth, personal.gender, personal.category, personal.aadhaarNumber, personal.state].filter(Boolean).length;
    score += (personalCount / 6) * 25;

    const academic = application.academicDetails || {};
    const academicCount = [academic.institutionName, academic.courseName, academic.yearOfStudy, academic.previousYearMarks].filter(Boolean).length;
    score += (academicCount / 4) * 25;

    const bank = application.bankDetails || {};
    const bankCount = [bank.accountHolderName, bank.bankName, bank.accountNumber, bank.ifscCode].filter(Boolean).length;
    score += (bankCount / 4) * 25;

    const docsCount = Object.values(application.documents || {}).filter(Boolean).length;
    score += (docsCount / 4) * 25;

    return Math.min(Math.round(score), 100);
  };

  const appStatus = application?.status;
  const isApproved = ['approved', 'disbursed'].includes(appStatus);
  const isRejected = appStatus === 'rejected';
  const hasDraft   = appStatus === 'draft';
  const profilePercent = getProfilePercent();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Welcome Banner */}
        <div className="dash-header-blue rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
          <div
            className="absolute right-0 top-0 bottom-0 w-64 opacity-15"
            style={{ background: 'radial-gradient(circle at 80% 50%, white, transparent)' }}
          />
          <div className="flex items-center gap-4 relative">
            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black shadow flex-shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">{t('home')} / {t('dashboard')}</p>
              <h1 className="text-2xl font-black tracking-tight mt-0.5">Welcome, {user?.fullName}</h1>
              {user?.institution && (
                <p className="text-white/70 text-xs mt-1 flex items-center gap-1 font-medium">
                  <GraduationCap className="h-4 w-4" />
                  {user.institution}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Application Timeline Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                {t('timeline')}
              </h2>

              {loading ? (
                <SkeletonCard />
              ) : !application || hasDraft ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                    <PlusCircle className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {hasDraft ? 'Draft Application Saved' : 'Start Application'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {hasDraft
                      ? 'You have a saved draft application. Continue filling details to submit.'
                      : 'Get financial support. Apply for the Prime Minister Special Scholarship Scheme.'}
                  </p>
                  <Link
                    to="/dashboard/application"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl mt-5 shadow transition"
                  >
                    {hasDraft ? 'Continue Application' : t('apply')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Status Badge & Download Letter */}
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Application Status:</span>
                      <StatusBadge status={appStatus} />
                    </div>
                    {isApproved && (
                      <button
                        onClick={handleDownloadLetter}
                        disabled={downloading}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloading ? 'Generating...' : 'Download Award Letter'}
                      </button>
                    )}
                  </div>

                  {/* Horizontal Timeline */}
                  {!isRejected && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4 overflow-x-auto">
                      {STATUS_STEPS.map((s, i) => {
                        const currentIdx = STATUS_STEPS.indexOf(appStatus);
                        const isDone = i <= currentIdx;
                        const isActive = i === currentIdx;

                        return (
                          <React.Fragment key={s}>
                            <div className="flex flex-col items-center gap-2 relative shrink-0">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all shadow-sm ${
                                isDone ? 'bg-blue-600 border-blue-600 text-white' :
                                'border-slate-200 text-slate-400 bg-white'
                              }`}>
                                {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                              </div>
                              <span className={`text-[10px] font-bold text-center leading-tight max-w-[65px] ${
                                isActive ? 'text-blue-600' : isDone ? 'text-slate-700' : 'text-slate-400'
                              }`}>
                                {STEP_LABELS[s]}
                              </span>
                            </div>
                            {i < STATUS_STEPS.length - 1 && (
                              <div className={`hidden sm:block flex-1 h-0.5 -mt-6 mx-2 min-w-[30px] ${
                                i < currentIdx ? 'bg-blue-600' : 'bg-slate-200'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Rejection remarks */}
                  {isRejected && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <h4 className="font-extrabold text-red-800">Application Disapproved</h4>
                        <p className="text-red-700 mt-1">{application.reviewerRemarks || 'Please review your uploaded documents.'}</p>
                      </div>
                    </div>
                  )}

                  {/* College remarks if verified */}
                  {application.institutionRemarks && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] text-slate-500 font-medium">
                      <span className="font-bold text-slate-700">College Nodal Officer Remarks:</span> {application.institutionRemarks}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Recommendations Panel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                {t('recommendations')}
              </h2>

              {recsLoading ? (
                <div className="py-6 text-center text-slate-400 text-xs">Matching recommendations...</div>
              ) : recommendations.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-semibold">No scholarship matches found.</div>
              ) : (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.name} className="p-4 border rounded-2xl hover:bg-slate-50/50 transition flex items-start gap-4 justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs">{rec.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-normal">{rec.description}</p>
                        <div className="flex gap-4 text-[9px] font-bold text-slate-500 pt-1.5">
                          <span>Amount: <span className="text-blue-600">{rec.amount}</span></span>
                          <span>Provider: {rec.provider}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black ${
                          rec.eligibilityMatch >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {rec.eligibilityMatch}% Match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Completion card */}
            {application && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('profileCompletion')}</h3>
                  <span className="text-xs font-black text-blue-600">{profilePercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${profilePercent}%` }}></div>
                </div>
              </div>
            )}

            {/* Notifications Drawer Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col max-h-[350px]">
              <div className="flex justify-between items-center border-b pb-3 mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-600" />
                  {t('notifications')}
                  {unreadCount > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold">{unreadCount}</span>}
                </h3>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] text-blue-600 font-bold hover:underline">
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-semibold text-[10px]">No new alerts.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id} className={`p-2.5 rounded-xl border border-slate-100 ${!n.isRead ? 'bg-blue-50/20' : 'bg-slate-50/40'}`}>
                      <div className="flex justify-between">
                        <span className={`font-bold ${!n.isRead ? 'text-blue-700' : 'text-slate-700'}`}>{n.title}</span>
                        <span className="text-[8px] text-slate-400 font-medium">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Scholarship benefits info */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Disbursement Scales</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>General Degree:</span>
                  <span className="font-bold text-slate-800">₹30,000 / Yr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Engineering degree:</span>
                  <span className="font-bold text-slate-800">₹1,25,000 / Yr</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Medical Degree:</span>
                  <span className="font-bold text-slate-800">₹3,00,000 / Yr</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Chatbot Assistant Widget */}
        <div className="fixed bottom-6 right-6 z-50">
          {!chatOpen ? (
            <button
              onClick={() => setChatOpen(true)}
              className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-2xl transition hover:scale-105 active:scale-95"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-80 h-96 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Chat Header */}
              <div className="bg-blue-600 text-white p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span className="font-bold text-xs tracking-wide">PMSS Virtual Assistant</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* Language Selector */}
                  <Globe className="w-3.5 h-3.5 text-blue-200" />
                  <select
                    value={chatLang}
                    onChange={(e) => setChatLang(e.target.value)}
                    className="bg-blue-700 text-[10px] text-white font-bold outline-none rounded border border-blue-500 py-0.5 px-1 cursor-pointer"
                  >
                    <option value="en">EN</option>
                    <option value="hi">HI</option>
                    <option value="ta">TA</option>
                  </select>
                  <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-blue-700 rounded transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat history */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50/50">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                      m.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border text-slate-700 rounded-tl-none shadow-sm'
                    }`}>
                      {m.text.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white border rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions chips */}
              <div className="px-3 py-1.5 border-t bg-white flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
                <button
                  onClick={() => handleSendChat('What is the income limit?')}
                  className="px-2 py-0.5 border border-slate-200 hover:bg-slate-50 text-[9px] font-bold text-slate-600 rounded-full transition"
                >
                  Income Limit?
                </button>
                <button
                  onClick={() => handleSendChat('Which documents do I need?')}
                  className="px-2 py-0.5 border border-slate-200 hover:bg-slate-50 text-[9px] font-bold text-slate-600 rounded-full transition"
                >
                  Required Docs?
                </button>
                <button
                  onClick={() => handleSendChat('Who is eligible?')}
                  className="px-2 py-0.5 border border-slate-200 hover:bg-slate-50 text-[9px] font-bold text-slate-600 rounded-full transition"
                >
                  Eligibility?
                </button>
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="p-2 border-t bg-white flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Ask a scholarship query..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-slate-50 border rounded-xl outline-none focus:border-blue-500 transition"
                />
                <button
                  type="submit"
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
