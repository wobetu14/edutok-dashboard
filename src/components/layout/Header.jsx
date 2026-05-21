import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import Badge from '../ui/Badge';
import { ROLES } from '../../utils/constants';

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const current = NAV_ITEMS.find((item) => item.path === pathname);
  const roleInfo = ROLES[user?.role];

  return (
    <header className="h-14 px-6 border-b border-border bg-surface flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-base font-semibold text-ink">{current?.label ?? 'EduTok'}</h1>
      <div className="flex items-center gap-3">
        {roleInfo && (
          <Badge color={roleInfo.color}>{roleInfo.label}</Badge>
        )}
        <span className="text-sm text-muted hidden sm:block">{user?.full_name}</span>
      </div>
    </header>
  );
}
