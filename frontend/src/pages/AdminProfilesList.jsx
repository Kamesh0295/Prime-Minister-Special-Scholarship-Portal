import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { SkeletonTable } from '../components/ui/SkeletonLoader';
import { showError } from '../store/slices/toastSlice';
import { getAllProfiles } from '../services/adminService';
import { Search, Eye, AlertTriangle, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const AdminProfilesList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [deleteRequested, setDeleteRequested] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search,
        page,
        limit: 10,
      };
      if (verificationStatus) params.verificationStatus = verificationStatus;
      if (deleteRequested) params.deleteRequested = deleteRequested;

      const res = await getAllProfiles(params);
      if (res.data.success) {
        setProfiles(res.data.data.profiles);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      dispatch(showError('Failed to fetch student profiles.'));
    } finally {
      setLoading(false);
    }
  }, [search, verificationStatus, deleteRequested, page, dispatch]);

  useEffect(() => {
    const t = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(t);
  }, [fetchProfiles]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Profiles</h1>
          <p className="text-sm text-gray-500">{pagination.total} registered student profiles</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-card">
        
        {/* Search */}
        <div className="relative sm:col-span-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Verification Status */}
        <div className="sm:col-span-3">
          <select
            value={verificationStatus}
            onChange={handleFilterChange(setVerificationStatus)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none"
          >
            <option value="">All Verification Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Deletion Request */}
        <div className="sm:col-span-3">
          <select
            value={deleteRequested}
            onChange={handleFilterChange(setDeleteRequested)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none"
          >
            <option value="">All Profiles</option>
            <option value="true">Delete Requested</option>
            <option value="false">No Deletion Request</option>
          </select>
        </div>

      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  {['#', 'Student', 'College / Course', 'Completed %', 'Verify Status', 'Delete Request', 'Actions'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-gray-200" />
                        No profiles found matching search filters
                      </div>
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile, i) => (
                    <tr key={profile._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell text-xs text-gray-400">{(page - 1) * 10 + i + 1}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          {profile.profilePhoto ? (
                            <img
                              src={`http://localhost:5000${profile.profilePhoto}`}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {profile.fullName?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 text-sm leading-tight">
                              {profile.fullName || profile.studentId?.fullName || '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {profile.email || profile.studentId?.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="text-sm font-medium text-gray-800 leading-tight">
                            {profile.collegeName || '—'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {profile.degree || '—'} • {profile.department || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full"
                              style={{ width: `${profile.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{profile.completionPercentage}%</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          profile.verificationStatus === 'verified'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : profile.verificationStatus === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {profile.verificationStatus === 'verified' && <CheckCircle className="h-3.5 w-3.5" />}
                          {profile.verificationStatus === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
                          {profile.verificationStatus === 'pending' && <Clock className="h-3.5 w-3.5 animate-pulse" />}
                          {profile.verificationStatus}
                        </span>
                      </td>
                      <td className="table-cell">
                        {profile.deleteRequested ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-150 uppercase tracking-wide">
                            <AlertTriangle className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate(`/admin/profiles/${profile._id}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium px-3 py-1 bg-primary text-white rounded-lg">{page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page === pagination.totalPages}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
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

export default AdminProfilesList;
