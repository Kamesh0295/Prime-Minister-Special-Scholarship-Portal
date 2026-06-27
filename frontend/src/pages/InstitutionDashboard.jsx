import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, CheckCircle, AlertTriangle, FileText, ExternalLink, ShieldCheck, LogOut, CheckSquare, RefreshCw, UserCheck } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import StatusBadge from '../components/ui/StatusBadge';
import { API_BASE_URL, BACKEND_ORIGIN } from '../services/apiBase';

const InstitutionDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((s) => s.auth);
  
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Verification states
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [bonafideChecked, setBonafideChecked] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/institution/applications?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setApplications(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== 'institution_officer') {
      navigate('/login');
    } else {
      fetchApps();
    }
  }, [token, search]);

  const selectApp = (app) => {
    setSelectedApp(app);
    setEnrollmentChecked(false);
    setBonafideChecked(false);
    setRemarks(app.institutionRemarks || '');
    setMessage(null);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!enrollmentChecked || !bonafideChecked) {
      setMessage({ type: 'error', text: 'You must check all verification verification fields.' });
      return;
    }

    try {
      setActionLoading(true);
      const res = await axios.patch(
        `${API_BASE_URL}/institution/applications/${selectedApp._id}/verify`,
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Application verified and forwarded to Administration.' });
        setSelectedApp(null);
        fetchApps();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Verification failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevision = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setMessage({ type: 'error', text: 'Remarks are required to request a revision.' });
      return;
    }

    try {
      setActionLoading(true);
      const res = await axios.patch(
        `${API_BASE_URL}/institution/applications/${selectedApp._id}/reject`,
        { remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Application sent back to student for correction.' });
        setSelectedApp(null);
        fetchApps();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Action failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-lg border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-tight">PMSS Institution Verifier Portal</h1>
            <p className="text-[10px] text-slate-400 font-semibold">{user?.institution || 'College Office'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{user?.fullName}</p>
            <p className="text-[9px] text-slate-400">College Nodal Officer</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-slate-800 hover:bg-red-900 rounded-lg text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left List Pane */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase">Student Applications</h2>
            
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition placeholder-slate-400"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20">
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mb-2" />
                <p className="text-slate-400 text-xs">Loading Applications...</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex-1 py-16 text-center text-slate-400 text-xs font-semibold">
                No submitted applications found for verification.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
                {applications.map((app) => (
                  <button
                    key={app._id}
                    onClick={() => selectApp(app)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition flex justify-between items-center gap-3 ${
                      selectedApp?._id === app._id ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{app.studentId?.fullName}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {app.academicDetails?.courseName} ({app.academicDetails?.rollNumber || 'N/A'})
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Details Pane */}
        <div className="lg:col-span-7">
          {!selectedApp ? (
            <div className="h-full bg-white border border-slate-200/80 border-dashed rounded-3xl flex flex-col items-center justify-center p-10 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">Select an Application</h3>
              <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                Click on a student from the application list on the left to begin inspecting college enrollment certificates and documents.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-6">
              
              {/* Student Header */}
              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h2 className="font-black text-slate-800 text-base">{selectedApp.studentId?.fullName}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Course: <span className="font-semibold text-slate-700">{selectedApp.academicDetails?.courseName}</span> | Year: <span className="font-semibold text-slate-700">{selectedApp.academicDetails?.yearOfStudy} Year</span>
                  </p>
                </div>
                <StatusBadge status={selectedApp.status} />
              </div>

              {/* Document List */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase">Uploaded Verification Documents</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedApp.documents?.bonafide ? (
                    <a
                        href={`${BACKEND_ORIGIN}${selectedApp.documents.bonafide}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border rounded-xl hover:bg-slate-50 border-blue-200 bg-blue-50/20 flex items-center justify-between text-xs text-blue-700 font-bold"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4.5 h-4.5 text-blue-600" />
                        Bonafide Certificate
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <div className="p-3 border border-dashed rounded-xl flex items-center gap-2 text-xs text-slate-400">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Bonafide Certificate Missing
                    </div>
                  )}

                  {selectedApp.documents?.marksheet && (
                    <a
                        href={`${BACKEND_ORIGIN}${selectedApp.documents.marksheet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-semibold"
                    >
                      <span className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4.5 h-4.5 text-slate-400" />
                        12th Marksheet
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {selectedApp.documents?.aadhaar && (
                    <a
                        href={`${BACKEND_ORIGIN}${selectedApp.documents.aadhaar}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-semibold"
                    >
                      <span className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4.5 h-4.5 text-slate-400" />
                        Aadhaar Card File
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {selectedApp.documents?.incomeCertificate && (
                    <a
                        href={`${BACKEND_ORIGIN}${selectedApp.documents.incomeCertificate}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-semibold"
                    >
                      <span className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4.5 h-4.5 text-slate-400" />
                        Income Certificate
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* College verification action card */}
              <div className="p-5 border border-slate-200 rounded-2xl space-y-4">
                <h3 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  College Verification Action Checklist
                </h3>

                <div className="space-y-2 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrollmentChecked}
                      onChange={(e) => setEnrollmentChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-slate-600 font-medium leading-tight">
                      I have verified the student enrollment details and confirm the candidate is currently enrolled.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bonafideChecked}
                      onChange={(e) => setBonafideChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-blue-600"
                    />
                    <span className="text-slate-600 font-medium leading-tight">
                      I validate that the uploaded Bonafide Certificate is authentic and signed by authorized college authorities.
                    </span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 font-bold uppercase">Nodal Officer Remarks / Audit Notes</label>
                  <textarea
                    placeholder="Enter verification comments or reason for requesting a revision..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-xs p-3 border rounded-xl outline-none focus:border-blue-500 transition min-h-[70px] bg-slate-50"
                  />
                </div>

                {message && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading || selectedApp.status === 'institution_verified'}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Verification
                  </button>
                  <button
                    onClick={handleRevision}
                    disabled={actionLoading}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Request Revision
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InstitutionDashboard;
