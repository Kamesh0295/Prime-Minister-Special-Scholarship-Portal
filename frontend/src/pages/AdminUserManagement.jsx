import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import DashboardLayout from '../components/layout/DashboardLayout';
import { SkeletonTable } from '../components/ui/SkeletonLoader';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { getAllUsers, toggleUserStatus } from '../services/adminService';
import { Search, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminUserManagement = () => {
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllUsers({ search, page, limit: 10 });
      const data = res.data.data;
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      dispatch(showError('Failed to load users.'));
    } finally {
      setLoading(false);
    }
  }, [search, page, dispatch]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const handleToggle = async (user) => {
    setToggling(user._id);
    try {
      await toggleUserStatus(user._id, !user.isActive);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u))
      );
      dispatch(showSuccess(`Account ${!user.isActive ? 'activated' : 'deactivated'}.`));
    } catch {
      dispatch(showError('Failed to update account status.'));
    } finally {
      setToggling(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Accounts</h1>
          <p className="text-sm text-gray-500">{pagination.total} registered students</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          id="user-search"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>
                  {['#','Student','Phone','State','Institution','Status','Action'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-gray-200" />
                        No students found
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, i) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell text-xs text-gray-400">{(page - 1) * 10 + i + 1}</td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="table-cell text-xs text-gray-600">{user.phone || '—'}</td>
                      <td className="table-cell text-xs text-gray-600">{user.state || '—'}</td>
                      <td className="table-cell text-xs text-gray-600 max-w-[140px] truncate">
                        {user.institution || '—'}
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          user.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={toggling === user._id}
                          id={`toggle-user-${user._id}`}
                          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                            user.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {toggling === user._id ? (
                            <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : user.isActive ? (
                            <UserX className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          {user.isActive ? 'Deactivate' : 'Activate'}
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

export default AdminUserManagement;
