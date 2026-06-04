import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { Orbit, Activity, Brain, FileText, Settings, LogOut, ShieldAlert, User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
      isActive(path)
        ? 'bg-scifi-cyan/10 text-scifi-cyan border-b-2 border-scifi-cyan shadow-[0_0_10px_rgba(6,182,212,0.2)]'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
    }`;

  const roleColors = {
    admin: 'border-scifi-red text-scifi-red bg-scifi-red/10 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
    researcher: 'border-scifi-cyan text-scifi-cyan bg-scifi-cyan/10 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
    viewer: 'border-gray-500 text-gray-400 bg-gray-500/10',
  };

  return (
    <nav className="glass-panel border-b border-white/5 sticky top-0 z-50 w-full px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
      {/* Brand logo */}
      <Link to="/dashboard" className="flex items-center gap-3 group">
        <div className="p-2 bg-gradient-to-tr from-scifi-violet to-scifi-cyan rounded-xl relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <Orbit className="h-6 w-6 text-white animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div>
          <span className="font-extrabold text-lg text-white tracking-widest block font-sans">
            ANTIGRAVITY
          </span>
          <span className="text-[10px] text-scifi-cyan tracking-wider font-mono uppercase block -mt-1">
            Research & Simulation
          </span>
        </div>
      </Link>

      {/* Nav items */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link to="/dashboard" className={navLinkClass('/dashboard')}>
          <Activity className="h-4 w-4" />
          Dashboard
        </Link>

        <Link to="/simulator" className={navLinkClass('/simulator')}>
          <Orbit className="h-4 w-4" />
          3D Simulator
        </Link>

        {(user.role === 'researcher' || user.role === 'admin') && (
          <Link to="/ai-assistant" className={navLinkClass('/ai-assistant')}>
            <Brain className="h-4 w-4" />
            AI Assistant
          </Link>
        )}

        <Link to="/reports" className={navLinkClass('/reports')}>
          <FileText className="h-4 w-4" />
          Reports
        </Link>

        {user.role === 'admin' && (
          <Link to="/admin" className={navLinkClass('/admin')}>
            <Settings className="h-4 w-4" />
            Admin Panel
          </Link>
        )}
      </div>

      {/* Profile & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">{user.name}</span>
            <span
              className={`text-[9px] px-2 py-0.5 border rounded-full font-mono uppercase font-bold tracking-wider ${
                roleColors[user.role]
              }`}
            >
              {user.role}
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
            {user.institution}
          </span>
        </div>

        <div className="h-8 w-px bg-white/5" />

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-scifi-red hover:bg-scifi-red/10 rounded-lg transition-all duration-300"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
