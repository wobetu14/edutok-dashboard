import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NAV_ITEMS, ROLES } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Header({ onToggle }) {
  const { pathname } = useLocation()
  const { user }     = useAuth()
  const current      = NAV_ITEMS.find((item) => item.path === pathname)
  const roleInfo     = ROLES[user?.role]

  return (
    <header className="header-glass animate-slide-down">
      {/* Left — hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground
                     hover:bg-muted hover:text-foreground transition-all duration-200 flex-shrink-0"
          title="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <div>
          <h1 key={pathname} className="header-page-title animate-fade-in">
            {current?.label ?? 'EduTok'}
          </h1>
          <p className="header-page-sub">EduTok Admin Platform</p>
        </div>
      </div>

      {/* Right — role badge + user */}
      <div className="flex items-center gap-3">
        {roleInfo && (
          <Badge
            className="animate-fade-in shadow-e1 text-[11px] px-2.5"
            style={{ animationDelay: '80ms' }}
          >
            {roleInfo.label}
          </Badge>
        )}

        <Separator orientation="vertical" className="h-5 opacity-50" />

        <div
          className="flex items-center gap-2.5 animate-fade-in"
          style={{ animationDelay: '120ms' }}
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{user?.full_name}</p>
            <p className="text-[10px] text-muted-foreground">@{user?.username}</p>
          </div>
          <Avatar className="h-7 w-7 ring-2 ring-border hidden sm:flex">
            <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
              {initials(user?.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
