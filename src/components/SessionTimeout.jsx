import { useEffect, useRef, useState, useCallback } from 'react'
import { LogOut, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// Show warning after 25 min idle; auto-logout 5 min later (total = 30 min)
const IDLE_MS = 25 * 60 * 1000
const WARN_MS =  5 * 60 * 1000

function fmt(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function SessionTimeout() {
  const { logout } = useAuth()
  const [warning, setWarning]     = useState(false)
  const [countdown, setCountdown] = useState(WARN_MS / 1000)

  const idleTimerRef  = useRef(null)
  const warnTimerRef  = useRef(null)
  const countTimerRef = useRef(null)
  const warningRef    = useRef(false)  // track in ref so event handler can read it

  const clearAll = () => {
    clearTimeout(idleTimerRef.current)
    clearTimeout(warnTimerRef.current)
    clearInterval(countTimerRef.current)
  }

  const startWarningCountdown = useCallback(() => {
    warningRef.current = true
    setWarning(true)
    setCountdown(WARN_MS / 1000)

    countTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countTimerRef.current)
          return 0
        }
        return c - 1
      })
    }, 1000)

    warnTimerRef.current = setTimeout(() => {
      logout()
    }, WARN_MS)
  }, [logout])

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(startWarningCountdown, IDLE_MS)
  }, [startWarningCountdown])

  const handleActivity = useCallback(() => {
    // Don't reset the idle timer once the warning dialog is visible —
    // the user must explicitly click "Stay Logged In"
    if (warningRef.current) return
    resetIdle()
  }, [resetIdle])

  const stayLoggedIn = () => {
    clearAll()
    warningRef.current = false
    setWarning(false)
    setCountdown(WARN_MS / 1000)
    resetIdle()
  }

  const handleLogout = () => {
    clearAll()
    logout()
  }

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))
    resetIdle()

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      clearAll()
    }
  }, [handleActivity, resetIdle])

  return (
    <Dialog open={warning} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm text-center"
        // Prevent clicking outside from closing
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-warning/15 flex items-center justify-center mx-auto">
            <Clock size={24} className="text-warning" />
          </div>
          <DialogTitle className="text-center">Session Expiring Soon</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            You've been inactive for a while. To protect your account, you'll be
            automatically logged out in:
          </p>

          <div className="text-4xl font-mono font-bold text-foreground tabular-nums">
            {fmt(countdown)}
          </div>

          <p className="text-xs text-muted-foreground">
            Click <strong>Stay Logged In</strong> to continue your session.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Log Out
          </Button>
          <Button className="flex-1" onClick={stayLoggedIn}>
            Stay Logged In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
