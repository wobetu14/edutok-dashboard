import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { updateProfileSchema, changePasswordSchema, fieldErrors } from '@/lib/schemas'

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const fileInputRef = useRef(null)
  const [preview, setPreview]               = useState(null)
  const [avatarLoading, setAvatarLoading]   = useState(false)
  const [avatarError, setAvatarError]       = useState('')

  // ── Profile form ───────────────────────────────────────────────────────────
  const [profileForm, setProfileForm]         = useState({ full_name: '', bio: '' })
  const [profileErrors, setProfileErrors]     = useState({})
  const [profileApiError, setProfileApiError] = useState('')
  const [profileSuccess, setProfileSuccess]   = useState(false)

  // ── Password form ──────────────────────────────────────────────────────────
  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwApiError, setPwApiError]   = useState('')
  const [pwSuccess, setPwSuccess]     = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (user) setProfileForm({ full_name: user.full_name ?? '', bio: user.bio ?? '' })
  }, [user?.id])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const profileMutation = useMutation({
    mutationFn: (data) => api.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data.data)
      setProfileApiError('')
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    },
    onError: (err) => setProfileApiError(err.response?.data?.message ?? 'Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (data) => api.changePassword(data),
    onSuccess: () => {
      setPwApiError('')
      setPwSuccess(true)
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => logout(), 2500)
    },
    onError: (err) => setPwApiError(err.response?.data?.message ?? 'Failed to change password'),
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setPreview(URL.createObjectURL(file))
    setAvatarLoading(true)
    setAvatarError('')

    try {
      const uploadRes = await api.uploadAvatar(file)
      const url = uploadRes.data.data.url
      await api.updateMe({ avatar_url: url })
      updateUser({ avatar_url: url })
    } catch (err) {
      setAvatarError(err.response?.data?.message ?? 'Failed to upload photo')
      setPreview(null)
    } finally {
      setAvatarLoading(false)
    }
  }

  const clearProfile = (f) => setProfileErrors((p) => { const n = { ...p }; delete n[f]; return n })
  const clearPw      = (f) => setPwErrors((p)      => { const n = { ...p }; delete n[f]; return n })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    setProfileApiError('')
    setProfileSuccess(false)
    const result = updateProfileSchema.safeParse(profileForm)
    if (!result.success) { setProfileErrors(fieldErrors(result)); return }
    setProfileErrors({})
    profileMutation.mutate({ full_name: result.data.full_name, bio: result.data.bio || undefined })
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPwApiError('')
    setPwSuccess(false)
    const result = changePasswordSchema.safeParse(pwForm)
    if (!result.success) { setPwErrors(fieldErrors(result)); return }
    setPwErrors({})
    passwordMutation.mutate({ current_password: result.data.current_password, new_password: result.data.new_password })
  }

  const currentAvatar = preview ?? user?.avatar_url

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Profile Information ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
          <CardDescription>Update your display name, bio, and profile photo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5" noValidate>

            {/* Avatar row */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-16 w-16 ring-2 ring-border">
                  <AvatarImage src={currentAvatar} alt={user?.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {initials(user?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
                             opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer
                             disabled:cursor-not-allowed"
                  title="Change photo"
                >
                  {avatarLoading
                    ? <Spinner size="sm" className="border-white border-t-transparent" />
                    : <Camera size={15} className="text-white" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">@{user?.username}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarLoading}
                  className="text-xs text-primary hover:underline disabled:opacity-50 mt-1 text-left"
                >
                  {avatarLoading ? 'Uploading…' : 'Change photo'}
                </button>
                {avatarError && <p className="text-xs text-destructive mt-0.5">{avatarError}</p>}
              </div>
            </div>

            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={profileForm.full_name}
                onChange={(e) => { setProfileForm({ ...profileForm, full_name: e.target.value }); clearProfile('full_name') }}
                aria-invalid={!!profileErrors.full_name}
              />
              <FieldError message={profileErrors.full_name} />
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Bio{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <textarea
                className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                rows={3}
                placeholder="Tell us a little about yourself…"
                value={profileForm.bio}
                onChange={(e) => { setProfileForm({ ...profileForm, bio: e.target.value }); clearProfile('bio') }}
                aria-invalid={!!profileErrors.bio}
              />
              <FieldError message={profileErrors.bio} />
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">Username</Label>
                <Input value={user?.username ?? ''} readOnly className="opacity-60 cursor-default select-none" tabIndex={-1} />
                <p className="text-[11px] text-muted-foreground">Cannot be changed</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">Phone</Label>
                <Input value={user?.phone ?? ''} readOnly className="opacity-60 cursor-default select-none" tabIndex={-1} />
                <p className="text-[11px] text-muted-foreground">Contact admin to update</p>
              </div>
            </div>

            {profileApiError && <p className="text-xs text-destructive">{profileApiError}</p>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
              {profileSuccess && (
                <span className="flex items-center gap-1.5 text-xs text-success animate-fade-in">
                  <CheckCircle size={13} /> Profile updated
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Change Password ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
          <CardDescription>Keep your account secure with a strong password.</CardDescription>
        </CardHeader>
        <CardContent>
          {pwSuccess ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={16} />
                <span className="text-sm font-semibold">Password changed successfully</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All sessions have been revoked. Signing you out…
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4" noValidate>

              {/* Current password */}
              <div className="flex flex-col gap-1.5">
                <Label>Current Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={pwForm.current_password}
                    onChange={(e) => { setPwForm({ ...pwForm, current_password: e.target.value }); clearPw('current_password') }}
                    aria-invalid={!!pwErrors.current_password}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError message={pwErrors.current_password} />
              </div>

              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <Label>New Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={pwForm.new_password}
                    onChange={(e) => { setPwForm({ ...pwForm, new_password: e.target.value }); clearPw('new_password') }}
                    aria-invalid={!!pwErrors.new_password}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError message={pwErrors.new_password} />
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <Label>Confirm New Password <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirm_password}
                    onChange={(e) => { setPwForm({ ...pwForm, confirm_password: e.target.value }); clearPw('confirm_password') }}
                    aria-invalid={!!pwErrors.confirm_password}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError message={pwErrors.confirm_password} />
              </div>

              {pwApiError && <p className="text-xs text-destructive">{pwApiError}</p>}

              <div className="flex">
                <Button variant="destructive" type="submit" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? <Spinner size="sm" /> : 'Change Password'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
