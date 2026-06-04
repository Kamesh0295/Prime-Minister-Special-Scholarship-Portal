import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatsCard from '../components/ui/StatsCard';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonStats, SkeletonTable } from '../components/ui/SkeletonLoader';
import { showError } from '../store/slices/toastSlice';
import { getStats, getAllApplications, getAuditLogs } from '../services/adminService';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  ArrowRight,
  BarChart2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  History,
  Lock
} from 'lucide-react';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, appsRes, logsRes] = await Promise.all([
        getStats(),
        getAllApplications({ limit: 6, page: 1 }),
        getAuditLogs(),
      ]);
      setStats(statsRes.data.data);
      setRecent(appsRes.data.data.applications);
      setLogs(logsRes.data.data);
    } catch (err) {
      dispatch(showError('Failed to load admin dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const statsCards = stats
    ? [
        { title: 'Total Applications', value: stats.total,       icon: FileText,    iconBg: 'bg-blue-50 text-blue-600',   iconColor: 'text-blue-600'   },
        { title: 'Pending Review',     value: stats.pending,     icon: Clock,       iconBg: 'bg-amber-50 text-amber-600',  iconColor: 'text-amber-600'  },
        { title: 'College Verified',   value: stats.institutionVerified || 0, icon: ShieldCheck, iconBg: 'bg-indigo-50 text-indigo-600', iconColor: 'text-indigo-600' },
        { title: 'Approved',           value: stats.approved,    icon: CheckCircle, iconBg: 'bg-emerald-50 text-emerald-600',  iconColor: 'text-emerald-600'  },
        { title: 'Disbursed Funds',    value: stats.disbursed || 0, icon: ShieldCheck, iconBg: 'bg-green-50 text-green-600', iconColor: 'text-green-600' },
        { title: 'Total Students',     value: stats.totalStudents, icon: Users,     iconBg: 'bg-purple-50 text-purple-600', iconColor: 'text-purple-600' },
      ]
    : [];

  // Filter out recent applications that have fraud flags
  const fraudApplications = recent.filter(app => app.fraudFlags && app.fraudFlags.length > 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Central Scholarship Administration</h1>
          <p className="text-xs text-slate-500 mt-1">PMSS Government-level Scholarship Management Console</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/reports" className="px-4 py-2 border hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            Reports Panel
          </Link>
          <Link to="/admin/applications" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-md">
            All Applications
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {statsCards.map((card) => (
            <StatsCard key={card.title} {...card} />
          ))}
        </div>
      )}

      {/* Grid of Main Table & Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Recent Applications */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-extrabold text-slate-800 text-xs tracking-wider uppercase">Recent Applications for Review</h2>
              <Link to="/admin/applications" className="text-xs text-blue-600 hover:underline font-bold">
                View All Applications
              </Link>
            </div>

            {loading ? (
              <SkeletonTable rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b">
                      {['Student Details','Institution / Course','Category','Status','Action'].map(h => (
                        <th key={h} className="text-left font-bold text-slate-400 uppercase p-4 text-[10px] tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {recent.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 font-semibold">No student applications submitted yet.</td>
                      </tr>
                    ) : (
                      recent.map((app) => (
                        <tr key={app._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div>
                              <p className="font-bold text-slate-800">{app.studentId?.fullName || '—'}</p>
                              <p className="text-[10px] text-slate-400 font-normal mt-0.5">{app.studentId?.email}</p>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 max-w-[200px] truncate">
                            <p className="font-semibold">{app.academicDetails?.institutionName || '—'}</p>
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">{app.academicDetails?.courseName || '—'}</p>
                          </td>
                          <td className="p-4">
                            {app.personalDetails?.category ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold">
                                {app.personalDetails.category}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="p-4">
                            <Link
                              to={`/admin/applications/${app._id}`}
                              className="text-blue-600 font-bold hover:underline"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Fraud Detection alerts */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Fraud Detection Alerts
            </h3>
            
            {fraudApplications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 font-semibold text-[10px]">No active security flags detected.</div>
            ) : (
              <div className="space-y-3">
                {fraudApplications.slice(0, 3).map((app) => (
                  <div key={app._id} className="p-3 bg-red-50/50 border border-red-100 rounded-2xl space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-[11px]">{app.studentId?.fullName}</span>
                      <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-black uppercase">CRITICAL</span>
                    </div>
                    {app.fraudFlags.slice(0, 1).map((flag, idx) => (
                      <p key={idx} className="text-[10px] text-red-700 leading-normal font-medium">{flag.description}</p>
                    ))}
                    <Link to={`/admin/applications/${app._id}`} className="text-[9px] text-red-600 font-black hover:underline block pt-1">
                      Inspect Mismatch →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Insights Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              AI Nodal Insights
            </h3>
            
            <div className="space-y-2.5 text-xs font-medium text-slate-600">
              <div className="flex gap-2 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5"></span>
                <p className="leading-relaxed">Average qualifying academic score: <span className="font-bold text-slate-800">84.2%</span>. Mapped cutoff ranks steady.</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5"></span>
                <p className="leading-relaxed">Category SC verification rate is up 12% following college portal activation.</p>
              </div>
              <div className="flex gap-2 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                <p className="leading-relaxed">All DBT accounts verified via PFMS. Zero duplicate bank deposits detected this batch.</p>
              </div>
            </div>
          </div>

          {/* Audit Logs card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col max-h-[300px]">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3 mb-3">
              <History className="w-4 h-4 text-slate-500" />
              Audit & Activity Logs
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[10px] font-medium text-slate-600">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold text-[10px]">No audit logs available.</div>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={log._id} className="pb-2 border-b border-slate-100 last:border-b-0">
                      <div className="flex justify-between text-[9px]">
                        <span className="font-bold text-slate-800">{log.userId?.fullName || 'System'}</span>
                        <span className="text-slate-400">{date}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Action: <span className="font-bold text-slate-700">{log.action.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
