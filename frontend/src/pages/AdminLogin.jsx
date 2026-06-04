import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure } from '../store/slices/authSlice';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { loginUser } from '../services/authService';
import { Shield, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

const AdminLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      dispatch(showError('Please enter admin email and password.'));
      return;
    }
    dispatch(authStart());
    try {
      const res = await loginUser(form);
      if (res.data.success) {
        const user = res.data.data.user;
        if (user.role !== 'admin') {
          dispatch(authFailure('Access denied. This login is for admins only.'));
          dispatch(showError('Access denied. Use the student login instead.'));
          return;
        }
        dispatch(authSuccess(res.data.data));
        dispatch(showSuccess(`Welcome, ${user.fullName}!`));
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      dispatch(authFailure(msg));
      dispatch(showError(msg));
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)' }}>
      <div className="gov-banner" />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
            <p className="text-white/60 text-sm mt-1">PMSS Administration Access</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="admin-email" className="text-xs font-medium text-white/70 block mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  id="admin-email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@pmss.gov.in"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="relative">
                <label htmlFor="admin-password" className="text-xs font-medium text-white/70 block mb-1.5">
                  Password
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  id="admin-password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 bottom-3 text-white/40 hover:text-white/70 p-1 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Demo credentials hint */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60">
                <p className="font-medium text-white/80 mb-1">Demo Credentials:</p>
                <p>Email: admin@pmss.gov.in</p>
                <p>Password: Admin@123</p>
              </div>

              <button
                type="submit"
                id="admin-login-btn"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm shadow-lg"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-primary" /> Signing In...</>
                ) : (
                  <>Sign In to Admin Panel <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-white/50 mt-6">
              Student?{' '}
              <Link to="/login" className="text-white font-semibold hover:underline">
                Student Login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
