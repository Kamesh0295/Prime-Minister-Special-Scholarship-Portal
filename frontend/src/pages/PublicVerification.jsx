import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle2, ChevronLeft, Calendar, User, Landmark, BookOpen } from 'lucide-react';

const PublicVerification = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyLetter = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/public/verify/${id}`);
        setData(res.data.data);
        setVerified(res.data.verified);
      } catch (err) {
        setError(err.response?.data?.message || 'Error occurred during verification process.');
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };
    if (id) verifyLetter();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b py-3 px-6 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              PM
            </div>
            <span className="font-bold text-slate-800 text-sm md:text-base">PMSS Verification Portal</span>
          </div>
          <Link to="/transparency" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Public Portal
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Verifying Reference ID...</p>
            </div>
          ) : error || !data ? (
            <div>
              {/* Error Header */}
              <div className="bg-red-500 text-white p-8 text-center flex flex-col items-center gap-3">
                <ShieldAlert className="w-12 h-12" />
                <h2 className="text-xl font-extrabold tracking-tight">Verification Failed</h2>
                <p className="text-xs text-red-100 max-w-xs">{error || 'This application has not been approved.'}</p>
              </div>
              <div className="p-6 text-center space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  No certified scholarship award record exists in the Central PMSS Database for this reference. 
                  Please inspect the document reference or contact the scholarship desk.
                </p>
                <Link
                  to="/transparency"
                  className="inline-block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Verify Another Certificate
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Success Header */}
              <div className={`p-8 text-center flex flex-col items-center gap-3 text-white ${
                verified ? 'bg-emerald-600' : 'bg-orange-500'
              }`}>
                {verified ? <ShieldCheck className="w-12 h-12" /> : <ShieldAlert className="w-12 h-12" />}
                <h2 className="text-xl font-extrabold tracking-tight">
                  {verified ? 'Official PMSS Record' : 'Record Unapproved'}
                </h2>
                <span className="px-2.5 py-1 bg-white/20 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  {data.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Data Table */}
              <div className="p-6 space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 text-xs">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Reference Number</p>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{data.refNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Student Name</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{data.studentName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Landmark className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">College / Institution</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{data.institution}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Course of Study</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{data.course} ({data.yearOfStudy} Year)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Evaluation Timestamp</p>
                      <p className="font-medium text-slate-600 mt-0.5">
                        {new Date(data.verifiedAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed text-center">
                  This validation is verified in real-time by the Ministry of Education Scholarship Registry. 
                  Digital checks block forged letters and security compromises.
                </div>

                <Link
                  to="/transparency"
                  className="inline-block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 text-[10px] py-4 text-center border-t border-slate-800">
        &copy; {new Date().getFullYear()} Ministry of Education, Govt. of India.
      </footer>
    </div>
  );
};

export default PublicVerification;
