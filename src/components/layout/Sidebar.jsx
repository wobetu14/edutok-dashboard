import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, BookOpen,
  BarChart2, ScrollText, Megaphone, LogOut,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/utils/constants'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const ICONS = { LayoutDashboard, Users, Building2, BookOpen, BarChart2, ScrollText, Megaphone }

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role),
  )

  return (
    <TooltipProvider>
      <aside className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0 animate-slide-left">
        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-2.5 animate-fade-in" style={{ animationDelay: '60ms' }}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm transition-transform duration-300 hover:scale-110">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-bold text-foreground text-base tracking-tight">EduTok</span>
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-md">
            Admin
          </span>
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="flex flex-col gap-0.5">
            {visibleItems.map(({ path, label, icon }, i) => {
              const Icon = ICONS[icon]
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                      'transition-all duration-200',
                      'animate-slide-left',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5',
                    )
                  }
                  style={{ animationDelay: `${80 + i * 45}ms` }}
                >
                  {Icon && (
                    <Icon
                      size={17}
                      className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    />
                  )}
                  {label}
                </NavLink>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator />

        {/* User footer */}
        <div
          className="px-3 py-3 flex flex-col gap-1 animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg">
            <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-transparent transition-all duration-200 hover:ring-primary/30">
              <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials(user?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-full group"
          >
            <LogOut size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Sign out
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
