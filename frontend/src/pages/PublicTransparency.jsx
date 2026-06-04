import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BarChart3, Users, CheckCircle2, Landmark, Search, ArrowRight, ShieldCheck, Globe } from 'lucide-react';

const PublicTransparency = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/public/transparency');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        setError('Failed to load portal statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleVerifySearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/verify/${searchId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200">
      {/* Government Header */}
      <header className="bg-white border-b border-slate-200 py-3 shadow-sm px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              PM
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-tight">
                Prime Minister Special Scholarship Scheme (PMSSS)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                National Portal for Scholarship Verification & Transparency
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
            >
              Student Portal
            </Link>
            <Link
              to="/"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              Main Website
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white py-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 mb-4 backdrop-blur-sm">
            <Globe className="w-3.5 h-3.5" />
            Live Transparency Dashboard
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl mb-3">
            Empowering Education with Absolute Trust
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base mb-8">
            Real-time disbursement statistics, category distribution, and instant QR verification of scholarship certificates.
          </p>

          {/* Letter Verification Search Bar */}
          <div className="max-w-xl mx-auto bg-white p-2 rounded-xl shadow-xl border border-white/10">
            <form onSubmit={handleVerifySearch} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 text-slate-800">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Enter Application ID to verify approval status..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition flex items-center gap-1.5 shadow"
              >
                Verify Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm font-medium">Fetching real-time aggregates...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white border rounded-2xl shadow-sm">
            <p className="text-red-500 font-medium mb-2">{error}</p>
            <p className="text-slate-400 text-xs">Please check your network and refresh the page.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Registered Students</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">
                    {stats.totals.registeredStudents.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Applications</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">
                    {stats.totals.submittedApplications.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Approved Awards</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">
                    {stats.totals.approvedScholarships.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Disbursed Funds</h3>
                  <p className="text-2xl font-black text-slate-800 mt-0.5">
                    {stats.totals.disbursedScholarships.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category-wise Distribution */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider border-b pb-3">
                  Scholarships Approved by Social Category
                </h3>
                
                {stats.categoryWise.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No approved applications data available.</div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                    {/* SVG Pie Chart */}
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {/* We dynamically generate sectors */}
                        {(() => {
                          let cumulativePercent = 0;
                          const total = stats.categoryWise.reduce((acc, curr) => acc + curr.count, 0);
                          const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

                          return stats.categoryWise.map((item, idx) => {
                            const percent = (item.count / total) * 100;
                            const startAngle = (cumulativePercent / 100) * 360;
                            cumulativePercent += percent;
                            const endAngle = (cumulativePercent / 100) * 360;

                            // Calculate SVG path for sector
                            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
                            const largeArc = percent > 50 ? 1 : 0;

                            const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

                            return (
                              <path
                                key={item.category}
                                d={d}
                                fill={colors[idx % colors.length]}
                                className="transition-all hover:scale-105 origin-center cursor-pointer"
                                title={`${item.category}: ${item.count}`}
                              />
                            );
                          });
                        })()}
                        {/* Center hole for donut look */}
                        <circle cx="50" cy="50" r="22" fill="#ffffff" />
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 text-xs">
                      {(() => {
                        const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                        const total = stats.categoryWise.reduce((acc, curr) => acc + curr.count, 0);
                        return stats.categoryWise.map((item, idx) => (
                          <div key={item.category} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                            <span className="font-semibold text-slate-700">{item.category}:</span>
                            <span className="text-slate-500 font-medium">
                              {item.count} ({((item.count / total) * 100 || 0).toFixed(1)}%)
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* State-wise Distribution */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 uppercase tracking-wider border-b pb-3">
                  Top Beneficiary States (Approvals)
                </h3>

                {stats.stateWise.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">No approved applications data available.</div>
                ) : (
                  <div className="space-y-4 text-xs font-semibold">
                    {stats.stateWise.slice(0, 5).map((item) => {
                      const maxCount = Math.max(...stats.stateWise.map((s) => s.count)) || 1;
                      const percent = (item.count / maxCount) * 100;
                      return (
                        <div key={item.state} className="space-y-1">
                          <div className="flex justify-between text-slate-700">
                            <span>{item.state}</span>
                            <span className="text-slate-500 font-bold">{item.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Verification Security Statement Banner */}
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-5">
              <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm md:text-base">Anti-Fraud Verification Framework</h4>
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                  Every PMSS approval letter is issued with an encrypted QR code and virtual digital signature. 
                  Third parties and employers can verify certificates instantly by scanning the QR code, redirecting them to the authenticated Government domain for direct validation.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-6 text-center border-t border-slate-800 mt-20">
        <p className="mb-2">National Scholarship Portal – Prime Minister Special Scholarship Scheme (PMSSS)</p>
        <p className="text-slate-600">This transparency portal aggregates telemetry data for public auditing. Personal details are protected under data privacy acts.</p>
        <p className="mt-4">&copy; {new Date().getFullYear()} Ministry of Education, Govt. of India. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicTransparency;
