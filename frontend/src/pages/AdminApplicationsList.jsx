import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/ui/StatusBadge';
import { SkeletonTable } from '../components/ui/SkeletonLoader';
import { showError } from '../store/slices/toastSlice';
import { getAllApplications } from '../services/adminService';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

const AdminApplicationsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: searchParams.get('status') || '',
    state: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
  });

  const fetchApplications = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = { page: f.page, limit: 10 };
      if (f.search)   params.search   = f.search;
      if (f.status)   params.status   = f.status;
      if (f.state)    params.state    = f.state;
      if (f.category) params.category = f.category;
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo)   params.dateTo   = f.dateTo;

      const res = await getAllApplications(params);
      const data = res.data.data;
      setApplications(data.applications);
      setPagination(data.pagination);
    } catch {
      dispatch(showError('Failed to load applications.'));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchApplications(filters);
  }, [filters, fetchApplications]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((p) => ({ ...p, [name]: value, page: 1 }));
  };

  const clearFilters = () => setFilters({ search: '', status: '', state: '', category: '', dateFrom: '', dateTo: '', page: 1 });

  const hasFilters = filters.status || filters.state || filters.category || filters.dateFrom || filters.dateTo;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Applications</h1>
          <p className="text-sm text-gray-500">{pagination.total} total applications</p>
        </div>
        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`btn-secondary gap-1.5 text-sm ${hasFilters ? 'border-primary text-primary' : ''}`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && <span className="h-2 w-2 bg-primary rounded-full" />}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Search by name, email, or institution..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          id="applications-search"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 mb-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select name="status" value={filters.status} onChange={handleFilterChange} className="form-select text-sm">
              <option value="">All Statuses</option>
              {['draft','submitted','under_review','verified','approved','rejected'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <select name="category" value={filters.category} onChange={handleFilterChange} className="form-select text-sm">
              <option value="">All Categories</option>
              {['SC','ST','OBC','General'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select name="state" value={filters.state} onChange={handleFilterChange} className="form-select text-sm">
              <option value="">All States</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From Date</label>
              <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange}
                className="form-select text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To Date</label>
              <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange}
                className="form-select text-sm" />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600">
              <X className="h-3 w-3" /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr>
                  {['#','Student','Institution','Course','Category','Status','Submitted','Action'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-gray-200" />
                        No applications found
                      </div>
                    </td>
                  </tr>
                ) : (
                  applications.map((app, i) => (
                    <tr key={app._id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/applications/${app._id}`)}
                    >
                      <td className="table-cell text-gray-400 text-xs">
                        {(filters.page - 1) * 10 + i + 1}
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{app.studentId?.fullName || '—'}</p>
                          <p className="text-xs text-gray-400">{app.studentId?.email}</p>
                        </div>
                      </td>
                      <td className="table-cell text-xs text-gray-600 max-w-[140px] truncate">
                        {app.academicDetails?.institutionName || '—'}
                      </td>
                      <td className="table-cell text-xs text-gray-600">
                        {app.academicDetails?.courseName || '—'}
                      </td>
                      <td className="table-cell">
                        {app.personalDetails?.category ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            {app.personalDetails.category}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="table-cell text-xs text-gray-500">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
                          : '—'}
                      </td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/admin/applications/${app._id}`}
                          className="text-xs text-primary font-medium hover:underline"
                          id={`review-app-${app._id}`}
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(filters.page - 1) * 10 + 1}–{Math.min(filters.page * 10, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
                  disabled={filters.page === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium px-3 py-1 bg-primary text-white rounded-lg">{filters.page}</span>
                <button
                  onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
                  disabled={filters.page === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminApplicationsList;
