import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, BookOpen,
  BarChart2, ScrollText, Megaphone, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../utils/constants';
import Avatar from '../ui/Avatar';

const ICONS = { LayoutDashboard, Users, Building2, BookOpen, BarChart2, ScrollText, Megaphone };

export default function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  );

  return (
    <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-bold text-ink text-lg tracking-tight">EduTok</span>
          <span className="text-xs font-medium text-muted bg-bg border border-border px-1.5 py-0.5 rounded ml-auto">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {visibleItems.map(({ path, label, icon }) => {
          const Icon = ICONS[icon];
          return (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              {Icon && <Icon size={17} />}
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-2">
          <Avatar src={user?.avatar_url} name={user?.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{user?.full_name}</p>
            <p className="text-xs text-muted truncate">@{user?.username}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="sidebar-link w-full hover:bg-danger/10 hover:text-danger"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
