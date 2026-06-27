import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  LogOut,
  User,
  Bell,
  ChevronDown,
  Shield,
  GraduationCap,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';


const Navbar = ({ onMenuToggle, sidebarOpen }) => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  const navLinks = isAdmin
    ? [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/applications', icon: FileText, label: 'Applications' },
        { to: '/admin/profiles', icon: User, label: 'Profiles' },
        { to: '/admin/reports', icon: BookOpen, label: 'Reports' },
        { to: '/admin/users', icon: User, label: 'Users' },
      ]
    : [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/dashboard/profile', icon: User, label: 'My Profile' },
        { to: '/dashboard/application', icon: FileText, label: 'Application' },
        { to: '/dashboard/status', icon: Bell, label: 'Status' },
      ];

  return (
    <>
      {/* Indian flag tricolor strip */}
      <div className="gov-banner" />

      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-card">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo + Sidebar toggle */}
          <div className="flex items-center gap-3">
            {user && onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors lg:hidden"
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}

            <Link to={isAdmin ? '/admin' : user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-primary/20 shadow group-hover:shadow-lg transition-shadow">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-tight">PMSS Portal</p>
                <p className="text-[10px] text-gray-400 leading-tight">Prime Minister Special Scholarship</p>
              </div>
            </Link>
          </div>

          {/* Center: Nav links (desktop) */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, icon: Icon, label }) => {
                const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to) && to !== '/admin' && to !== '/dashboard');
                const exactActive = location.pathname === to;
                const isActive = to === '/admin' || to === '/dashboard' ? exactActive : active;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-50 text-primary'
                        : 'text-gray-600 hover:text-primary hover:bg-primary-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm">Register</Link>
              </>
            ) : (
              <>
                {/* Role Badge */}
                <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isAdmin ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  user?.role === 'institution_officer' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {isAdmin ? <Shield className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                  {isAdmin ? 'Admin' : user?.role === 'institution_officer' ? 'College Nodal' : 'Student'}
                </span>



                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileOpen((p) => !p)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium text-gray-700"
                    id="profile-menu-btn"
                    aria-expanded={profileOpen}
                    aria-haspopup="true"
                  >
                    <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                      {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block max-w-[120px] truncate">{user.fullName}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-card-lg border border-gray-100 py-1 animate-fade-in z-50">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      {!isAdmin && (
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setProfileOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          My Profile
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        id="pmss-logout-btn"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => setMobileOpen((p) => !p)}
                  className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav links */}
        {user && mobileOpen && (
          <div className="md:hidden border-t border-gray-100 px-4 py-2 flex flex-col gap-1 animate-fade-in">
            {navLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary transition-all"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
