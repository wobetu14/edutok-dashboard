import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const { pathname } = useLocation()

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true',
  )

  const toggle = () =>
    setCollapsed((v) => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggle={toggle} />
        <main className="flex-1 p-6 overflow-y-auto">
          <div key={pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
