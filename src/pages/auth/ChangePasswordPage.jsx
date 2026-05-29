import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { api, client } from '@/api/client'
import { useAuth } from '@/context/AuthContext'

function getStrength(pw) {
  if (!pw) return null
  if (pw.length < 8) return { label: 'Too short', color: 'bg-destructive', pct: '20%' }
  const checks = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length
  if (checks <= 1) return { label: 'Weak',   color: 'bg-orange-400', pct: '40%' }
  if (checks === 2) return { label: 'Fair',   color: 'bg-yellow-400', pct: '60%' }
  if (checks === 3) return { label: 'Good',   color: 'bg-blue-500',   pct: '80%' }
  return              { label: 'Strong', color: 'bg-success',     pct: '100%' }
}

export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()

  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [error, setError]       = useState('')
  const [isPending, setIsPending] = useState(false)
  const [done, setDone]         = useState(false)

  const strength = getStrength(newPw)
  const matches  = confirmPw.length > 0 && newPw === confirmPw

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }

    setIsPending(true)
    try {
      const res = await api.changePasswordFirstLogin({ newPassword: newPw })
      const { accessToken, refreshToken } = res.data.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)

      // Fetch the refreshed profile — must_change_password is now false
      const meRes = await client.get('/users/me')
      updateUser({ ...meRes.data.data, must_change_password: false })

      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update password. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <ShieldAlert size={24} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Your Password</h1>
          <p className="text-sm text-muted-foreground">EduTok Admin Dashboard</p>
        </div>

        {/* Mandatory notice */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 text-sm">
          <ShieldAlert size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Temporary password detected</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
              Your account was provisioned with a temporary password. You must set a permanent password before accessing the dashboard.
            </p>
          </div>
        </div>

        {/* Form card */}
        <Card className="p-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 size={44} className="text-success" />
              <p className="text-sm font-semibold text-foreground">Password updated!</p>
              <p className="text-xs text-muted-foreground">Redirecting to dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {user?.full_name && (
                <p className="text-sm text-muted-foreground">
                  Welcome, <span className="font-medium text-foreground">{user.full_name}</span>.
                  Please choose a strong, memorable password.
                </p>
              )}

              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  New Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={newPw}
                    onChange={(e) => { setNewPw(e.target.value); setError('') }}
                    placeholder="Minimum 8 characters"
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Strength bar */}
                {strength && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: strength.pct }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-14 text-right">{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Confirm Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setError('') }}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConf((v) => !v)}
                  >
                    {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPw && (
                  <p className={`text-xs ${matches ? 'text-success' : 'text-destructive'}`}>
                    {matches ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Password tips */}
              <ul className="text-xs text-muted-foreground space-y-0.5 bg-muted/40 rounded-md px-3 py-2">
                <li className={newPw.length >= 8 ? 'text-success' : ''}>
                  {newPw.length >= 8 ? '✓' : '·'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPw) ? 'text-success' : ''}>
                  {/[A-Z]/.test(newPw) ? '✓' : '·'} One uppercase letter
                </li>
                <li className={/[0-9]/.test(newPw) ? 'text-success' : ''}>
                  {/[0-9]/.test(newPw) ? '✓' : '·'} One number
                </li>
                <li className={/[^A-Za-z0-9]/.test(newPw) ? 'text-success' : ''}>
                  {/[^A-Za-z0-9]/.test(newPw) ? '✓' : '·'} One special character
                </li>
              </ul>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Set New Password'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
