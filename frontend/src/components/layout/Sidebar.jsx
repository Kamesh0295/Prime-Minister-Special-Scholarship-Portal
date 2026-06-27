import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Download,
  Users,
  User,
  BarChart2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSelector } from 'react-redux';

const StudentLinks = [
  { to: '/dashboard',              icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/dashboard/profile',      icon: User,            label: 'My Profile'  },
  { to: '/dashboard/application',  icon: FileText,        label: 'Application' },
  { to: '/dashboard/status',       icon: Clock,           label: 'Track Status'},
];

const AdminLinks = [
  { to: '/admin',                  icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/admin/applications',     icon: FileText,        label: 'Applications'},
  { to: '/admin/profiles',         icon: Users,           label: 'Profiles'    },
  { to: '/admin/reports',          icon: BarChart2,       label: 'Reports'     },
  { to: '/admin/users',            icon: Users,           label: 'Users'       },
];

const Sidebar = ({ isOpen, onToggle }) => {
  const { user } = useSelector((s) => s.auth);
  if (!user) return null;

  const links = user.role === 'admin' ? AdminLinks : StudentLinks;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 flex flex-col
          bg-white border-r border-gray-100 shadow-card-md
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-60' : 'w-0 lg:w-16 overflow-hidden'}
          lg:relative lg:translate-x-0 lg:flex lg:flex-shrink-0`}
        aria-label="Sidebar"
      >
        {/* Spacer for navbar */}
        <div className="h-[69px] flex-shrink-0" />

        {/* Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin' || to === '/dashboard'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''} ${!isOpen ? 'lg:justify-center lg:px-0' : ''}`
              }
              title={!isOpen ? label : ''}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {isOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center h-10 border-t border-gray-100 text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
