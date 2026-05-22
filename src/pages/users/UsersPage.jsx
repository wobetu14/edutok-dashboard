import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Search, PowerOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/api/client'
import { ROLES } from '@/utils/constants'

const LIMIT = 20

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRole] = useState('')
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({
    full_name: '', username: '', phone: '', email: '', role: 'instructor', org_id: '',
  })
  const [tempPassword, setTempPassword] = useState('')
  const [formError, setFormError]       = useState('')

  // Org combobox state
  const [orgSearch, setOrgSearch]   = useState('')
  const [orgDropOpen, setOrgDropOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () =>
      api.listUsers({ page, limit: LIMIT, search: search || undefined, role: roleFilter || undefined })
        .then((r) => ({ users: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  const { data: orgOptions = [] } = useQuery({
    queryKey: ['orgs-picker', orgSearch],
    queryFn: () =>
      api.listOrgs({ search: orgSearch || undefined, limit: 30 })
        .then((r) => r.data.data ?? []),
    enabled: modal,
    staleTime: 30_000,
  })

  const createUser = useMutation({
    mutationFn: (body) => api.createManaged(body),
    onSuccess: (res) => {
      setTempPassword(res.data.data.tempPassword)
      qc.invalidateQueries(['users'])
    },
    onError: (err) => setFormError(err.response?.data?.message ?? 'Failed to create user'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.setActiveStatus(id, is_active),
    onSuccess: () => qc.invalidateQueries(['users']),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.org_id) {
      setFormError('Please select an organization.')
      return
    }
    createUser.mutate(form)
  }

  const closeModal = () => {
    setModal(false)
    setTempPassword('')
    setFormError('')
    setForm({ full_name: '', username: '', phone: '', email: '', role: 'instructor', org_id: '' })
    setOrgSearch('')
    setSelectedOrg(null)
    setOrgDropOpen(false)
  }

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
    { key: 'phone', label: 'Phone' },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge color={ROLES[row.role]?.color}>{ROLES[row.role]?.label ?? row.role}</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge color={row.is_active ? 'bg-success/10 text-green-700' : 'bg-destructive/10 text-red-700'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1 text-xs ${row.is_active ? 'text-destructive hover:text-destructive hover:bg-destructive/10' : 'text-success hover:text-success hover:bg-success/10'}`}
          onClick={() => toggleActive.mutate({ id: row.id, is_active: !row.is_active })}
        >
          <PowerOff size={13} />
          {row.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
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
          <select
            className="input w-36 h-10 px-3 rounded-md border border-input bg-background text-sm"
            value={roleFilter}
            onChange={(e) => { setRole(e.target.value); setPage(1) }}
          >
            <option value="">All roles</option>
            {Object.entries(ROLES).map(([v, r]) => (
              <option key={v} value={v}>{r.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setModal(true)}>
          <UserPlus size={15} />
          Add User
        </Button>
      </div>

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

      {/* Create managed user dialog */}
      <Dialog open={modal} onOpenChange={(open) => { if (!open) closeModal() }}>
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
                Share this password securely. The user must change it on first login.
              </p>
              <Button onClick={closeModal}>Done</Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Full Name</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Username</Label>
                <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email (optional)</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <select
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="instructor">Instructor</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 relative">
                <Label>Organization</Label>
                <Input
                  placeholder="Search organization…"
                  autoComplete="off"
                  value={selectedOrg ? selectedOrg.name : orgSearch}
                  onChange={(e) => {
                    setOrgSearch(e.target.value)
                    setSelectedOrg(null)
                    setForm((f) => ({ ...f, org_id: '' }))
                    setOrgDropOpen(true)
                  }}
                  onFocus={() => { if (!selectedOrg) setOrgDropOpen(true) }}
                  onBlur={() => setTimeout(() => setOrgDropOpen(false), 150)}
                />
                {orgDropOpen && orgOptions.length > 0 && (
                  <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-lg max-h-44 overflow-y-auto">
                    {orgOptions.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
                        onMouseDown={() => {
                          setSelectedOrg(org)
                          setForm((f) => ({ ...f, org_id: org.id }))
                          setOrgSearch('')
                          setOrgDropOpen(false)
                        }}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
                {!selectedOrg && !orgDropOpen && form.org_id === '' && orgSearch === '' && (
                  <p className="text-[11px] text-muted-foreground">Type to search organizations by name</p>
                )}
              </div>
              {formError && <p className="text-xs text-destructive">{formError}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Spinner size="sm" className="border-current border-t-transparent" />}
                  {createUser.isPending ? 'Creating…' : 'Create User'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
