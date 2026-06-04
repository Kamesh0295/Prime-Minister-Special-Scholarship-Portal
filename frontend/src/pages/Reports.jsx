import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { getReports, downloadReportCSV } from '../services/adminService';
import { Download, BarChart2, PieChart, TrendingUp, Loader2 } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BAR_COLORS = ['#2563EB','#3b82f6','#60a5fa','#93c5fd','#1d4ed8'];
const PIE_COLORS = {
  SC: '#8b5cf6', ST: '#f59e0b', OBC: '#10b981', General: '#2563EB',
};

const MiniBarChart = ({ data, labelKey, valueKey, color = '#2563EB' }) => {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-2 mt-3">
      {data.slice(0, 10).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0">{item[labelKey] || 'Unknown'}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(item[valueKey] / max) * 100}%`, background: color }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-6 text-right">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
};

const PieSegment = ({ data }) => {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let accumulated = 0;
  const radius = 70;
  const cx = 90, cy = 90;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const slices = data.map((d) => {
    const pct = d.count / total;
    const startAngle = accumulated * 360 - 90;
    accumulated += pct;
    const endAngle = accumulated * 360 - 90;
    const largeArc = pct > 0.5 ? 1 : 0;
    const x1 = cx + radius * Math.cos(toRad(startAngle));
    const y1 = cy + radius * Math.sin(toRad(startAngle));
    const x2 = cx + radius * Math.cos(toRad(endAngle));
    const y2 = cy + radius * Math.sin(toRad(endAngle));
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: PIE_COLORS[d._id] || '#94a3b8' };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r="40" fill="white" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="600">{total}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill="#9ca3af">Total</text>
      </svg>
      <div className="space-y-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-600">{s._id || 'Unknown'}</span>
            <span className="text-xs font-bold text-gray-800 ml-1">{s.count}</span>
            <span className="text-xs text-gray-400">({Math.round((s.count / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonthlyChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-2 h-36 mt-3">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col gap-0.5 items-center">
            <span className="text-[9px] text-gray-400">{d.total}</span>
            <div className="w-full bg-primary rounded-t-sm transition-all duration-500"
              style={{ height: `${(d.total / max) * 100}px` }} />
          </div>
          <span className="text-[9px] text-gray-400">{MONTHS[(d._id.month - 1)]}</span>
        </div>
      ))}
    </div>
  );
};

const AdminReports = () => {
  const dispatch = useDispatch();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csvLoading, setCsvLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getReports();
        setReports(res.data.data);
      } catch {
        dispatch(showError('Failed to load reports.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dispatch]);

  const handleCSV = async () => {
    try {
      setCsvLoading(true);
      const res = await downloadReportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pmss_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      dispatch(showSuccess('Report downloaded!'));
    } catch {
      dispatch(showError('Failed to download report.'));
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Scholarship data insights</p>
        </div>
        <button onClick={handleCSV} disabled={csvLoading}
          className="btn-secondary gap-1.5 text-sm" id="export-csv-btn">
          {csvLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      ) : !reports ? (
        <div className="card p-8 text-center text-gray-400">No report data available.</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* By State */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-gray-700">Approvals by State</h3>
            </div>
            <p className="text-xs text-gray-400 mb-2">Top 10 states</p>
            {reports.byState.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No approved applications yet</p>
            ) : (
              <MiniBarChart data={reports.byState} labelKey="_id" valueKey="count" color="#2563EB" />
            )}
          </div>

          {/* By Category */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <PieChart className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-700">Approvals by Category</h3>
            </div>
            {reports.byCategory.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No approved applications yet</p>
            ) : (
              <PieSegment data={reports.byCategory.map(d => ({ ...d, count: d.count }))} />
            )}
          </div>

          {/* Monthly */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-700">Monthly Application Trend</h3>
            </div>
            <p className="text-xs text-gray-400 mb-2">Last 12 months</p>
            {reports.monthly.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No data available</p>
            ) : (
              <MonthlyChart data={reports.monthly} />
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminReports;
