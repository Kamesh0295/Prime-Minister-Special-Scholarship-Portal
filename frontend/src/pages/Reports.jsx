import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatsCard from '../components/ui/StatsCard';
import { SkeletonStats, SkeletonCard } from '../components/ui/SkeletonLoader';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { getAnalyticsDashboard } from '../services/adminService';

import {
  Download,
  BarChart2,
  PieChart,
  TrendingUp,
  Loader2,
  Calendar,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

const AdminReports = () => {
  const dispatch = useDispatch();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Date Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtering, setFiltering] = useState(false);

  // Chart canvas refs
  const barCanvasRef = useRef(null);
  const pieCanvasRef = useRef(null);
  const doughnutCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);

  // Chart instances
  const barChartInstance = useRef(null);
  const pieChartInstance = useRef(null);
  const doughnutChartInstance = useRef(null);
  const lineChartInstance = useRef(null);

  const fetchDashboard = async (isFilterCall = false) => {
    if (isFilterCall) setFiltering(true);
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const res = await getAnalyticsDashboard(params);
      if (res.data.success) {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      dispatch(showError('Failed to fetch analytics dashboard.'));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [dispatch]);

  // Redraw charts when data changes
  useEffect(() => {
    if (!dashboardData) return;

    const textColor = '#4B5563';
    const gridColor = '#E5E7EB';

    // 1. Monthly Applications (Bar Chart)
    if (barCanvasRef.current && window.Chart) {
      if (barChartInstance.current) barChartInstance.current.destroy();
      
      const ctx = barCanvasRef.current.getContext('2d');
      const monthlyData = dashboardData.charts.applicationsByMonth;
      
      barChartInstance.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyData.map(d => d.month),
          datasets: [{
            label: 'Applications Submitted',
            data: monthlyData.map(d => d.count),
            backgroundColor: '#2563EB',
            borderRadius: 8,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor, font: { weight: 'bold' } } }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });
    }

    // 2. Approval vs Rejection Rate (Pie Chart)
    if (pieCanvasRef.current && window.Chart) {
      if (pieChartInstance.current) pieChartInstance.current.destroy();

      const ctx = pieCanvasRef.current.getContext('2d');
      const rate = dashboardData.charts.approvalVsRejection;

      pieChartInstance.current = new window.Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Approved', 'Rejected', 'Pending Review'],
          datasets: [{
            data: [rate.approved, rate.rejected, rate.pending],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
            borderWidth: 1,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: textColor, font: { weight: 'bold' } } }
          }
        }
      });
    }

    // 3. Category Distribution (Doughnut Chart)
    if (doughnutCanvasRef.current && window.Chart) {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

      const ctx = doughnutCanvasRef.current.getContext('2d');
      const cats = dashboardData.charts.categoryDistribution;

      doughnutChartInstance.current = new window.Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: cats.map(c => c.category),
          datasets: [{
            data: cats.map(c => c.count),
            backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'],
            borderWidth: 1,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: textColor, font: { weight: 'bold' } } }
          },
          cutout: '65%'
        }
      });
    }

    // 4. Registration Growth (Line Chart)
    if (lineCanvasRef.current && window.Chart) {
      if (lineChartInstance.current) lineChartInstance.current.destroy();

      const ctx = lineCanvasRef.current.getContext('2d');
      const growth = dashboardData.charts.registrationGrowth;

      lineChartInstance.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: growth.map(g => g.date),
          datasets: [{
            label: 'Cumulative Registered Students',
            data: growth.map(g => g.count),
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor, font: { weight: 'bold' } } }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });
    }

    return () => {
      if (barChartInstance.current) barChartInstance.current.destroy();
      if (pieChartInstance.current) pieChartInstance.current.destroy();
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();
      if (lineChartInstance.current) lineChartInstance.current.destroy();
    };
  }, [dashboardData]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchDashboard(true);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    fetchDashboard(true);
  };

  const handleExportPDF = () => {
    if (!dashboardData || !window.jspdf) {
      dispatch(showError('PDF export library not loaded.'));
      return;
    }

    setExporting(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');

      // Colors
      const primaryColor = [37, 99, 235];
      const textColor = [30, 41, 59];

      // Header Banner
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, 'F');

      // Title text inside banner
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("PRIME MINISTER SPECIAL SCHOLARSHIP PORTAL", 14, 18);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 230, 255);
      doc.text("Official Scholarship Administration Report — Central Analytics System", 14, 26);
      
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Generated on: ${dateStr}`, 14, 33);

      // Reset Text Color
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Subtitle Box
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`FILTER DATE RANGE: ${dateFrom || 'All Time'} to ${dateTo || 'Present'}`, 14, 50);

      // Section 1: Stats summary
      doc.setFontSize(12);
      doc.text("1. Overall Statistics Summary", 14, 58);

      const statsRows = [
        ["Total Registered Students", dashboardData.cards.totalStudents],
        ["Total Applications Filed", dashboardData.cards.totalApplications],
        ["Approved Applications", dashboardData.cards.approvedApplications],
        ["Rejected Applications", dashboardData.cards.rejectedApplications],
        ["Pending Review Applications", dashboardData.cards.pendingApplications],
        ["Scholarships Disbursed (Released)", dashboardData.cards.totalScholarships]
      ];

      doc.autoTable({
        startY: 62,
        head: [["Metric Parameter", "Value Count"]],
        body: statsRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        margin: { left: 14, right: 14 }
      });

      let currentY = doc.lastAutoTable.finalY + 12;

      // Section 2: Category distribution
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("2. Scholarship Category Distribution", 14, currentY);

      const catRows = dashboardData.charts.categoryDistribution.map(item => [item.category, item.count]);
      doc.autoTable({
        startY: currentY + 4,
        head: [["Category", "Applicants Count"]],
        body: catRows,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 12;

      // Section 3: Monthly volumes
      if (currentY > 220) { doc.addPage(); currentY = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("3. Monthly Application Volume Trends", 14, currentY);

      const monthRows = dashboardData.charts.applicationsByMonth.map(item => [item.month, item.count]);
      doc.autoTable({
        startY: currentY + 4,
        head: [["Month", "Submissions Volume"]],
        body: monthRows,
        theme: 'grid',
        headStyles: { fillColor: [75, 85, 99] },
        margin: { left: 14, right: 14 }
      });

      // Signature Area
      currentY = doc.lastAutoTable.finalY + 20;
      if (currentY > 230) { doc.addPage(); currentY = 30; }

      doc.setDrawColor(220, 225, 230);
      doc.line(14, currentY, 196, currentY);
      
      currentY += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("REPORT COMPILED BY:", 14, currentY);
      doc.text("VERIFYING AUTHORITY SEAL:", 120, currentY);

      currentY += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Ministry of Education", 14, currentY);
      doc.text("Digital Sign / Stamp Section", 120, currentY);
      
      currentY += 4;
      doc.text("Central Scholarship Admin Office, New Delhi", 14, currentY);
      doc.text("PMSS Nodal Verification Officer", 120, currentY);

      doc.save(`PMSSS_Scholarship_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      dispatch(showSuccess('Analytics PDF report exported successfully.'));
    } catch (err) {
      console.error(err);
      dispatch(showError('Failed to compile PDF report document.'));
    } finally {
      setExporting(false);
    }
  };

  const cards = dashboardData ? [
    { title: 'Total Students', value: dashboardData.cards.totalStudents, icon: Users, iconBg: 'bg-purple-50 text-purple-600', iconColor: 'text-purple-600' },
    { title: 'Total Applications', value: dashboardData.cards.totalApplications, icon: FileText, iconBg: 'bg-blue-50 text-blue-600', iconColor: 'text-blue-600' },
    { title: 'Approved Applications', value: dashboardData.cards.approvedApplications, icon: CheckCircle, iconBg: 'bg-emerald-50 text-emerald-600', iconColor: 'text-emerald-600' },
    { title: 'Rejected Applications', value: dashboardData.cards.rejectedApplications, icon: XCircle, iconBg: 'bg-red-50 text-red-600', iconColor: 'text-red-600' },
    { title: 'Pending Review', value: dashboardData.cards.pendingApplications, icon: Clock, iconBg: 'bg-amber-50 text-amber-600', iconColor: 'text-amber-600' },
    { title: 'Disbursed count', value: dashboardData.cards.totalScholarships, icon: ShieldCheck, iconBg: 'bg-green-50 text-green-600', iconColor: 'text-green-600' },
  ] : [];

  return (
    <DashboardLayout>
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Real-time statistics and scholarship tracking data</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={loading || exporting}
          className="btn-primary flex items-center gap-2"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Analytics PDF
        </button>
      </div>

      {/* Date Filters Form */}
      <form onSubmit={handleFilterSubmit} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-card flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date Submitted From</label>
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="form-input pt-3.5 pb-3.5"
            />
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date Submitted To</label>
          <div className="relative">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="form-input pt-3.5 pb-3.5"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="submit"
            disabled={filtering || loading}
            className="btn-primary py-3.5 flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            {filtering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={filtering || loading || (!dateFrom && !dateTo)}
            className="px-4 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
          >
            Reset
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-6">
          <SkeletonStats />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
      ) : !dashboardData ? (
        <div className="card p-12 text-center text-slate-400 font-bold">
          No analytics data matches found.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card) => (
              <StatsCard key={card.title} {...card} />
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* applicationsByMonth */}
            <div className="card p-5 bg-white border border-gray-100 shadow-card flex flex-col h-80">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                Applications By Month
              </h3>
              <div className="flex-1 relative">
                <canvas ref={barCanvasRef} />
              </div>
            </div>

            {/* approvalVsRejection */}
            <div className="card p-5 bg-white border border-gray-100 shadow-card flex flex-col h-80">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                <PieChart className="h-4 w-4 text-emerald-600" />
                Approval vs Rejection Rate
              </h3>
              <div className="flex-1 relative">
                <canvas ref={pieCanvasRef} />
              </div>
            </div>

            {/* categoryDistribution */}
            <div className="card p-5 bg-white border border-gray-100 shadow-card flex flex-col h-80">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                <PieChart className="h-4 w-4 text-purple-600" />
                Scholarship Category Distribution
              </h3>
              <div className="flex-1 relative">
                <canvas ref={doughnutCanvasRef} />
              </div>
            </div>

            {/* registrationGrowth */}
            <div className="card p-5 bg-white border border-gray-100 shadow-card flex flex-col h-80">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Student Registration Growth
              </h3>
              <div className="flex-1 relative">
                <canvas ref={lineCanvasRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminReports;
