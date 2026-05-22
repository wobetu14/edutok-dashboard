import { NavLink, useMatch } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, BookOpen,
  BarChart2, ScrollText, Megaphone, Settings, LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/utils/constants'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ICONS = { LayoutDashboard, Users, Building2, BookOpen, BarChart2, ScrollText, Megaphone, Settings }

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

/*
 * Separate component so useMatch runs at component level → className on
 * NavLink is a plain string → Radix Slot can merge it without stripping it.
 * (When className is a function, Slot's cloneElement call drops it entirely.)
 */
function IconNavItem({ path, label, iconName }) {
  const isActive = !!useMatch({ path, end: path === '/' })
  const Icon = ICONS[iconName]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={path}
          className={cn('sidebar-icon-item', isActive && 'active')}
        >
          {Icon && <Icon size={18} />}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  )

  return (
    <aside
      className={cn(
        'sidebar-shell flex-shrink-0 flex flex-col h-screen sticky top-0 animate-slide-left',
        'transition-[width] duration-300 ease-spring',
        collapsed ? 'w-[72px]' : 'w-60',
      )}
      style={{ overflow: 'clip' }}
    >

        {/* ── Logo zone ────────────────────────────────────────────── */}
        <div
          className="sidebar-logo-zone flex-shrink-0"
          style={{
            justifyContent: collapsed ? 'center' : undefined,
            gap:            collapsed ? 0 : undefined,
            padding:        collapsed ? '16px 8px' : undefined,
          }}
        >
          <div className="sidebar-logo-icon flex-shrink-0">
            <span className="text-white font-black text-sm select-none">E</span>
          </div>
          {!collapsed && (
            <>
              <span className="sidebar-brand flex-1">EduTok</span>
              <span className="sidebar-badge">Admin</span>
            </>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visibleItems.map(({ path, label, icon }, i) => {
              const Icon = ICONS[icon]

              if (collapsed) {
                return (
                  <IconNavItem
                    key={path}
                    path={path}
                    label={label}
                    iconName={icon}
                  />
                )
              }

              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    cn('sidebar-nav-item animate-slide-left', isActive && 'active')
                  }
                  style={{ animationDelay: `${80 + i * 45}ms` }}
                >
                  {Icon && <Icon size={16} className="flex-shrink-0" />}
                  {label}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* ── User footer ──────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col gap-2"
          style={{ borderTop: '1px solid hsl(var(--sidebar-border))', padding: '12px 8px' }}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div style={{ cursor: 'default' }}>
                    <Avatar className="h-7 w-7" style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}>
                      <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                      <AvatarFallback
                        className="text-[10px] font-bold"
                        style={{ background: 'rgba(254,44,85,0.2)', color: '#ff8fa8' }}
                      >
                        {initials(user?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p className="font-semibold text-xs">{user?.full_name}</p>
                  <p className="text-[10px] opacity-70">@{user?.username}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={logout}
                    className="sidebar-icon-item"
                    style={{ padding: '8px' }}
                  >
                    <LogOut size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Sign out</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
              <div className="sidebar-user-card">
                <Avatar className="h-7 w-7 flex-shrink-0" style={{ boxShadow: '0 0 0 2px rgba(255,255,255,0.12)' }}>
                  <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{ background: 'rgba(254,44,85,0.2)', color: '#ff8fa8' }}
                  >
                    {initials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'hsl(var(--sidebar-fg))' }}>
                    {user?.full_name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'hsl(var(--sidebar-muted))' }}>
                    @{user?.username}
                  </p>
                </div>
                <div className="sidebar-presence" title="Online" />
              </div>

              <button onClick={logout} className="sidebar-signout-btn group">
                <LogOut size={14} className="flex-shrink-0" />
                Sign out
              </button>
            </>
          )}
        </div>

    </aside>
  )
}
