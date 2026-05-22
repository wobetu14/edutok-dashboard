import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, User, LogOut, ChevronDown } from 'lucide-react'
import { NAV_ITEMS, ROLES } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const EXTRA_TITLES = { '/profile': 'My Profile' }

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function Header({ onToggle }) {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const { user, logout } = useAuth()
  const current      = NAV_ITEMS.find((item) => item.path === pathname)
  const pageTitle    = current?.label ?? EXTRA_TITLES[pathname] ?? 'EduTok'
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
            {pageTitle}
          </h1>
          <p className="header-page-sub">EduTok Admin Platform</p>
        </div>
      </div>

      {/* Right — role badge + user menu */}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 animate-fade-in rounded-lg px-2 py-1
                         hover:bg-muted transition-colors duration-200 outline-none
                         data-[state=open]:bg-muted"
              style={{ animationDelay: '120ms' }}
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-tight">{user?.full_name}</p>
                <p className="text-[10px] text-muted-foreground">@{user?.username}</p>
              </div>
              <Avatar className="h-7 w-7 ring-2 ring-border">
                <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {initials(user?.full_name)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown
                size={13}
                className="text-muted-foreground transition-transform duration-200
                           [[data-state=open]_&]:rotate-180"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52" sideOffset={8}>
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground leading-tight">
                  {user?.full_name}
                </span>
                <span className="text-xs text-muted-foreground">@{user?.username}</span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => navigate('/profile')}
              className="gap-2 cursor-pointer"
            >
              <User size={14} />
              Account
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={logout}
              className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut size={14} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
