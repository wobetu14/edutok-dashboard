import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldError } from '@/components/ui/FieldError'
import { Spinner } from '@/components/ui/Spinner'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, fieldErrors } from '@/lib/schemas'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  const clearField = (field) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    const result = loginSchema.safeParse({ username, password })
    if (!result.success) { setErrors(fieldErrors(result)); return }

    setErrors({})
    setLoading(true)
    try {
      await login(result.data.username, result.data.password)
      navigate('/dashboard')
    } catch (err) {
      setApiError(
        err.message?.includes('Access denied')
          ? err.message
          : err.response?.data?.message ?? 'Invalid credentials.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <div className="login-logo-icon mb-4">
            <span className="text-white font-black text-2xl select-none">E</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">EduTok Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your admin account</p>
        </div>

        <Card className="login-card animate-fade-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. superadmin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearField('username') }}
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                />
                <FieldError message={errors.username} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    className="pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearField('password') }}
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError message={errors.password} />
              </div>

              {apiError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {apiError}
                </p>
              )}

              <Button type="submit" className="w-full mt-1" disabled={loading}>
                {loading && <Spinner size="sm" className="border-current border-t-transparent" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          EduTok Admin Dashboard — Staff access only
        </p>
      </div>
    </div>
  )
}
