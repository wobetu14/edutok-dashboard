import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Search, PowerOff, Pencil, KeyRound, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/api/client'
import { ROLES } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'
import { createUserSchema, updateUserSchema, reassignOrgSchema, fieldErrors } from '@/lib/schemas'

const LIMIT = 20

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function OrgCombobox({ value, orgSearch, setOrgSearch, selectedOrg, setSelectedOrg, onSelect, error, clearError, enabled }) {
  const [open, setOpen] = useState(false)

  const { data: orgOptions = [] } = useQuery({
    queryKey: ['orgs-picker', orgSearch],
    queryFn: () => api.listOrgs({ search: orgSearch || undefined, limit: 30 }).then((r) => r.data.data ?? []),
    enabled,
    staleTime: 30_000,
  })

  return (
    <div className="flex flex-col gap-1.5 relative">
      <Label>Organization <span className="text-destructive">*</span></Label>
      <Input
        placeholder="Search organization…"
        autoComplete="off"
        value={selectedOrg ? selectedOrg.name : orgSearch}
        onChange={(e) => {
          setOrgSearch(e.target.value)
          setSelectedOrg(null)
          onSelect('')
          setOpen(true)
          clearError()
        }}
        onFocus={() => { if (!selectedOrg) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-invalid={!!error}
      />
      {open && orgOptions.length > 0 && (
        <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg max-h-44 overflow-y-auto">
          {orgOptions.map((org) => (
            <button
              key={org.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onMouseDown={() => {
                setSelectedOrg(org)
                onSelect(org.id)
                setOrgSearch('')
                setOpen(false)
                clearError()
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}
      {!selectedOrg && !open && !orgSearch && (
        <p className="text-[11px] text-muted-foreground">Type to search organizations by name</p>
      )}
      <FieldError message={error} />
    </div>
  )
}

const INIT_CREATE = { full_name: '', username: '', phone: '', email: '', role: 'instructor', org_id: '' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const isSuperAdmin = me?.role === 'super_admin'

  // ── List state ──
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRole] = useState('')

  // ── Create modal ──
  const [createOpen, setCreateOpen]   = useState(false)
  const [createForm, setCreateForm]   = useState(INIT_CREATE)
  const [createErrors, setCreateErrors] = useState({})
  const [createApiErr, setCreateApiErr] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [createOrgSearch, setCreateOrgSearch]   = useState('')
  const [createSelectedOrg, setCreateSelectedOrg] = useState(null)

  // ── Edit modal ──
  const [editTarget, setEditTarget]   = useState(null)
  const [editForm, setEditForm]       = useState({ full_name: '', phone: '', email: '' })
  const [editErrors, setEditErrors]   = useState({})
  const [editApiErr, setEditApiErr]   = useState('')

  // ── Reset password ──
  const [resetTarget, setResetTarget]     = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetApiErr, setResetApiErr]     = useState('')

  // ── Reassign org ──
  const [reassignTarget, setReassignTarget]         = useState(null)
  const [reassignOrgSearch, setReassignOrgSearch]   = useState('')
  const [reassignSelectedOrg, setReassignSelectedOrg] = useState(null)
  const [reassignOrgId, setReassignOrgId]           = useState('')
  const [reassignErrors, setReassignErrors]         = useState({})
  const [reassignApiErr, setReassignApiErr]         = useState('')

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () =>
      api.listUsers({ page, limit: LIMIT, search: search || undefined, role: roleFilter || undefined })
        .then((r) => ({ users: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  // ── Mutations ──
  const createUser = useMutation({
    mutationFn: (body) => api.createManaged(body),
    onSuccess: (res) => {
      setTempPassword(res.data.data.tempPassword)
      qc.invalidateQueries(['users'])
    },
    onError: (err) => setCreateApiErr(err.response?.data?.message ?? 'Failed to create user'),
  })

  const editUser = useMutation({
    mutationFn: ({ id, ...body }) => api.updateUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      setEditTarget(null)
    },
    onError: (err) => setEditApiErr(err.response?.data?.message ?? 'Failed to update user'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => api.adminResetPassword(id),
    onSuccess: (res) => {
      setResetPassword(res.data.data.tempPassword)
      qc.invalidateQueries(['users'])
    },
    onError: (err) => setResetApiErr(err.response?.data?.message ?? 'Failed to reset password'),
  })

  const reassignOrgMutation = useMutation({
    mutationFn: ({ id, org_id }) => api.reassignOrg(id, org_id),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      closeReassign()
    },
    onError: (err) => setReassignApiErr(err.response?.data?.message ?? 'Failed to reassign organization'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.setActiveStatus(id, is_active),
    onSuccess: () => qc.invalidateQueries(['users']),
  })

  // ── Helpers ──
  const clearCreateField = (f) => setCreateErrors((p) => { const n = { ...p }; delete n[f]; return n })
  const clearEditField   = (f) => setEditErrors((p)   => { const n = { ...p }; delete n[f]; return n })

  const closeCreate = () => {
    setCreateOpen(false); setTempPassword(''); setCreateApiErr('')
    setCreateErrors({}); setCreateForm(INIT_CREATE)
    setCreateOrgSearch(''); setCreateSelectedOrg(null)
  }

  const openEdit = (row) => {
    setEditForm({ full_name: row.full_name, phone: row.phone ?? '', email: row.email ?? '' })
    setEditErrors({}); setEditApiErr('')
    setEditTarget(row)
  }

  const openReset = (row) => {
    setResetPassword(''); setResetApiErr('')
    setResetTarget(row)
  }

  const closeReset = () => { setResetTarget(null); setResetPassword(''); setResetApiErr('') }

  const openReassign = (row) => {
    setReassignOrgSearch(''); setReassignSelectedOrg(null); setReassignOrgId('')
    setReassignErrors({}); setReassignApiErr('')
    setReassignTarget(row)
  }

  const closeReassign = () => {
    setReassignTarget(null); setReassignOrgSearch(''); setReassignSelectedOrg(null)
    setReassignOrgId(''); setReassignErrors({}); setReassignApiErr('')
  }

  const handleCreate = (e) => {
    e.preventDefault()
    setCreateApiErr('')
    const result = createUserSchema.safeParse(createForm)
    if (!result.success) { setCreateErrors(fieldErrors(result)); return }
    setCreateErrors({})
    createUser.mutate(result.data)
  }

  const handleEdit = (e) => {
    e.preventDefault()
    setEditApiErr('')
    const result = updateUserSchema.safeParse(editForm)
    if (!result.success) { setEditErrors(fieldErrors(result)); return }
    setEditErrors({})
    editUser.mutate({ id: editTarget.id, ...result.data })
  }

  const handleReassign = (e) => {
    e.preventDefault()
    setReassignApiErr('')
    const result = reassignOrgSchema.safeParse({ org_id: reassignOrgId })
    if (!result.success) { setReassignErrors(fieldErrors(result)); return }
    setReassignErrors({})
    reassignOrgMutation.mutate({ id: reassignTarget.id, org_id: result.data.org_id })
  }

  // ── Table columns ──
  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.avatar_url} alt={row.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(row.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">@{row.username}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (row) => <span className="text-sm">{row.phone ?? '—'}</span> },
    {
      key: 'org',
      label: 'Organization',
      render: (row) => {
        const memberships = row.org_memberships ?? []
        if (memberships.length === 0) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div className="flex flex-col gap-0.5">
            {memberships.map((m) => (
              <span key={m.org.id} className="text-xs text-foreground">{m.org.name}</span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => <Badge color={ROLES[row.role]?.color}>{ROLES[row.role]?.label ?? row.role}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge color={row.is_active ? 'bg-success/10 text-green-700' : 'bg-destructive/10 text-red-700'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {row.must_change_password && (
            <span className="text-[10px] text-warning font-medium">Temp pwd</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {/* Edit */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => openEdit(row)}
            title="Edit user"
          >
            <Pencil size={13} />
          </Button>

          {/* Reset password */}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-warning hover:bg-warning/10"
            onClick={() => openReset(row)}
            title="Reset password"
          >
            <KeyRound size={13} />
          </Button>

          {/* Reassign org — super_admin only, for org_admin/instructor */}
          {isSuperAdmin && (row.role === 'org_admin' || row.role === 'instructor') && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-secondary hover:bg-secondary/10"
              onClick={() => openReassign(row)}
              title="Reassign organization"
            >
              <Building2 size={13} />
            </Button>
          )}

          {/* Activate / Deactivate */}
          <Button
            variant="ghost" size="sm"
            className={`gap-1 text-xs ${row.is_active
              ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
              : 'text-success hover:text-success hover:bg-success/10'}`}
            onClick={() => toggleActive.mutate({ id: row.id, is_active: !row.is_active })}
          >
            <PowerOff size={13} />
            {row.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search users…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          {/* Role filter — super_admin only; org_admin always sees instructors */}
          {isSuperAdmin && (
            <select
              className="w-36 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={roleFilter}
              onChange={(e) => { setRole(e.target.value); setPage(1) }}
            >
              <option value="">All roles</option>
              {Object.entries(ROLES).map(([v, r]) => (
                <option key={v} value={v}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus size={15} />
          Add User
        </Button>
      </div>

      {/* ── Table ── */}
      <Card>
        <DataTable
          columns={columns}
          rows={data?.users ?? []}
          isLoading={isLoading}
          emptyMessage="No users found."
          page={page}
          total={data?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Card>

      {/* ════════════ Create dialog ════════════ */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) closeCreate() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Managed User</DialogTitle>
          </DialogHeader>

          {tempPassword ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-success font-medium">User created successfully!</p>
              <div className="bg-muted rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Temporary password (shown once):</p>
                <p className="text-base font-mono font-bold text-foreground tracking-widest">{tempPassword}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this securely. The user must change it on first login.
              </p>
              <Button onClick={closeCreate}>Done</Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-3" noValidate>

              <div className="flex flex-col gap-1.5">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  value={createForm.full_name}
                  onChange={(e) => { setCreateForm({ ...createForm, full_name: e.target.value }); clearCreateField('full_name') }}
                  aria-invalid={!!createErrors.full_name}
                />
                <FieldError message={createErrors.full_name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Username <span className="text-destructive">*</span></Label>
                <Input
                  value={createForm.username}
                  onChange={(e) => { setCreateForm({ ...createForm, username: e.target.value }); clearCreateField('username') }}
                  aria-invalid={!!createErrors.username}
                />
                <FieldError message={createErrors.username} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input
                  value={createForm.phone}
                  onChange={(e) => { setCreateForm({ ...createForm, phone: e.target.value }); clearCreateField('phone') }}
                  placeholder="+1234567890"
                  aria-invalid={!!createErrors.phone}
                />
                <FieldError message={createErrors.phone} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => { setCreateForm({ ...createForm, email: e.target.value }); clearCreateField('email') }}
                  aria-invalid={!!createErrors.email}
                />
                <FieldError message={createErrors.email} />
              </div>

              {/* Role — super_admin can pick org_admin or instructor; org_admin can only create instructors */}
              {isSuperAdmin && (
                <div className="flex flex-col gap-1.5">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <select
                    className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                    value={createForm.role}
                    onChange={(e) => { setCreateForm({ ...createForm, role: e.target.value }); clearCreateField('role') }}
                  >
                    <option value="instructor">Instructor</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                  <FieldError message={createErrors.role} />
                </div>
              )}

              <OrgCombobox
                orgSearch={createOrgSearch}
                setOrgSearch={setCreateOrgSearch}
                selectedOrg={createSelectedOrg}
                setSelectedOrg={setCreateSelectedOrg}
                onSelect={(id) => setCreateForm((f) => ({ ...f, org_id: id }))}
                error={createErrors.org_id}
                clearError={() => clearCreateField('org_id')}
                enabled={createOpen}
              />

              {createApiErr && <p className="text-xs text-destructive">{createApiErr}</p>}

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" type="button" onClick={closeCreate}>Cancel</Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? <Spinner size="sm" /> : 'Create User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════ Edit dialog ════════════ */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit — {editTarget?.full_name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="flex flex-col gap-3" noValidate>

            <div className="flex flex-col gap-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => { setEditForm({ ...editForm, full_name: e.target.value }); clearEditField('full_name') }}
                aria-invalid={!!editErrors.full_name}
              />
              <FieldError message={editErrors.full_name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => { setEditForm({ ...editForm, phone: e.target.value }); clearEditField('phone') }}
                placeholder="+1234567890"
                aria-invalid={!!editErrors.phone}
              />
              <FieldError message={editErrors.phone} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => { setEditForm({ ...editForm, email: e.target.value }); clearEditField('email') }}
                aria-invalid={!!editErrors.email}
              />
              <FieldError message={editErrors.email} />
            </div>

            {editApiErr && <p className="text-xs text-destructive">{editApiErr}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={editUser.isPending}>
                {editUser.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════ Reset password dialog ════════════ */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) closeReset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>

          {resetPassword ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-success font-medium">Password reset successfully!</p>
              <div className="bg-muted rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">New temporary password (shown once):</p>
                <p className="text-base font-mono font-bold text-foreground tracking-widest">{resetPassword}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                The user's sessions have been revoked. Share this securely — they must change it on next login.
              </p>
              <Button onClick={closeReset}>Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                This will generate a new temporary password for <strong className="text-foreground">{resetTarget?.full_name}</strong> and revoke all their active sessions.
              </p>
              {resetApiErr && <p className="text-xs text-destructive">{resetApiErr}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={closeReset}>Cancel</Button>
                <Button
                  variant="warning"
                  disabled={resetPasswordMutation.isPending}
                  onClick={() => resetPasswordMutation.mutate(resetTarget.id)}
                >
                  {resetPasswordMutation.isPending ? <Spinner size="sm" /> : 'Reset Password'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════ Reassign org dialog (super_admin only) ════════════ */}
      <Dialog open={!!reassignTarget} onOpenChange={(open) => { if (!open) closeReassign() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign Organization</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleReassign} className="flex flex-col gap-4" noValidate>
            <p className="text-sm text-muted-foreground">
              Move <strong className="text-foreground">{reassignTarget?.full_name}</strong> to a different organization.
              Their current org membership will be replaced.
            </p>

            <OrgCombobox
              orgSearch={reassignOrgSearch}
              setOrgSearch={setReassignOrgSearch}
              selectedOrg={reassignSelectedOrg}
              setSelectedOrg={setReassignSelectedOrg}
              onSelect={(id) => setReassignOrgId(id)}
              error={reassignErrors.org_id}
              clearError={() => setReassignErrors((p) => { const n = { ...p }; delete n.org_id; return n })}
              enabled={!!reassignTarget}
            />

            {reassignApiErr && <p className="text-xs text-destructive">{reassignApiErr}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeReassign}>Cancel</Button>
              <Button type="submit" disabled={reassignOrgMutation.isPending}>
                {reassignOrgMutation.isPending ? <Spinner size="sm" /> : 'Reassign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
