import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure } from '../store/slices/authSlice';
import { showError, showSuccess } from '../store/slices/toastSlice';
import { loginUser } from '../services/authService';
import { GraduationCap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

const Login = () => {
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
      dispatch(showError('Please enter email and password.'));
      return;
    }
    dispatch(authStart());
    try {
      const res = await loginUser(form);
      if (res.data.success) {
        dispatch(authSuccess(res.data.data));
        dispatch(showSuccess(`Welcome back, ${res.data.data.user.fullName}!`));
        const role = res.data.data.user.role;
        navigate(
          role === 'admin'
            ? '/admin'
            : role === 'institution_officer'
            ? '/institution'
            : '/dashboard',
          { replace: true }
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      dispatch(authFailure(msg));
      dispatch(showError(msg));
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <div className="gov-banner" />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center bg-primary rounded-2xl shadow-primary mb-4">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your PMSS account</p>
          </div>

          <div className="card p-8 shadow-card-md">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div className="form-group">
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                  className="form-input"
                  autoComplete="email"
                  required
                />
                <label htmlFor="login-email" className="form-label">Email Address</label>
              </div>

              {/* Password */}
              <div className="form-group">
                <input
                  type={showPass ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="form-input pr-12"
                  autoComplete="current-password"
                  required
                />
                <label htmlFor="login-password" className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <button
                type="submit"
                id="login-btn"
                disabled={loading}
                className="btn-primary w-full py-3 text-base"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing In...</>
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Register Now
              </Link>
            </p>

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Admin?{' '}
                <Link to="/admin/login" className="text-purple-600 font-medium hover:underline">
                  Admin Login →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
