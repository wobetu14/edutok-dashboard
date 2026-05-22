import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Search, Trash2, CheckCircle, UserPlus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { createOrgSchema, createOrgAdminSchema, fieldErrors } from '@/lib/schemas'

const LIMIT = 20

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

const EMPTY_ORG   = { name: '', description: '', website: '', logo_url: '' }
const EMPTY_ADMIN = { full_name: '', username: '', phone: '', email: '' }

export default function OrgsPage() {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const isSuperAdmin = user?.role === 'super_admin'

  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')

  // Dialog state
  const [step, setStep]         = useState(null)
  const [orgForm, setOrgForm]   = useState(EMPTY_ORG)
  const [orgErrors, setOrgErrors]   = useState({})
  const [orgApiError, setOrgApiError] = useState('')
  const [createdOrg, setCreatedOrg]   = useState(null)

  const [adminForm, setAdminForm]         = useState(EMPTY_ADMIN)
  const [adminErrors, setAdminErrors]     = useState({})
  const [adminApiError, setAdminApiError] = useState('')
  const [tempPassword, setTempPassword]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orgs', page, search],
    queryFn: () =>
      api.listOrgs({ page, limit: LIMIT, search: search || undefined })
        .then((r) => ({ organizations: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createOrgMutation = useMutation({
    mutationFn: (body) => api.createOrg(body),
    onSuccess: (res) => {
      setCreatedOrg(res.data.data)
      qc.invalidateQueries(['orgs'])
      setStep('admin')
    },
    onError: (err) => setOrgApiError(err.response?.data?.message ?? 'Failed to create organization'),
  })

  const createAdminMutation = useMutation({
    mutationFn: (body) => api.createManaged(body),
    onSuccess: (res) => {
      setTempPassword(res.data.data.tempPassword)
      qc.invalidateQueries(['users'])
      setStep('done')
    },
    onError: (err) => setAdminApiError(err.response?.data?.message ?? 'Failed to create org admin'),
  })

  const deleteOrgMutation = useMutation({
    mutationFn: (id) => api.deleteOrg(id),
    onSuccess: () => qc.invalidateQueries(['orgs']),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearOrgField = (field) =>
    setOrgErrors((prev) => { const next = { ...prev }; delete next[field]; return next })

  const clearAdminField = (field) =>
    setAdminErrors((prev) => { const next = { ...prev }; delete next[field]; return next })

  const openDialog = () => {
    setOrgForm(EMPTY_ORG)
    setAdminForm(EMPTY_ADMIN)
    setOrgErrors({})
    setOrgApiError('')
    setAdminErrors({})
    setAdminApiError('')
    setCreatedOrg(null)
    setTempPassword('')
    setStep('org')
  }

  const closeDialog = () => setStep(null)

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleOrgSubmit = (e) => {
    e.preventDefault()
    setOrgApiError('')

    const result = createOrgSchema.safeParse(orgForm)
    if (!result.success) { setOrgErrors(fieldErrors(result)); return }

    setOrgErrors({})
    const { name, description, website, logo_url } = result.data
    const body = { name }
    if (description) body.description = description
    if (website)     body.website     = website
    if (logo_url)    body.logo_url    = logo_url
    createOrgMutation.mutate(body)
  }

  const handleAdminSubmit = (e) => {
    e.preventDefault()
    setAdminApiError('')

    const result = createOrgAdminSchema.safeParse(adminForm)
    if (!result.success) { setAdminErrors(fieldErrors(result)); return }

    setAdminErrors({})
    createAdminMutation.mutate({
      ...result.data,
      role:   'org_admin',
      org_id: createdOrg?.id,
    })
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'name',
      label: 'Organization',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.logo_url} alt={row.name} />
            <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-semibold">
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            {row.website && (
              <a href={row.website} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline truncate max-w-[160px] block">
                {row.website}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <p className="text-sm text-muted-foreground max-w-xs truncate">{row.description ?? '—'}</p>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    ...(isSuperAdmin ? [{
      key: 'actions',
      label: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm(`Delete "${row.name}"? This cannot be undone.`)) {
              deleteOrgMutation.mutate(row.id)
            }
          }}
        >
          <Trash2 size={14} />
        </Button>
      ),
    }] : []),
  ]

  const stepMeta = {
    org:   { title: 'New Organization',           sub: 'Fill in the organization profile.' },
    admin: { title: 'Create Org Admin (optional)', sub: `Assign an admin to "${createdOrg?.name}". You can skip and do this later from the Users page.` },
    done:  { title: 'All done!',                  sub: 'Organization and admin account created.' },
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        {isSuperAdmin && (
          <Button onClick={openDialog}>
            <Plus size={15} />
            New Organization
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <DataTable
          columns={columns}
          rows={data?.organizations ?? []}
          isLoading={isLoading}
          emptyMessage="No organizations found."
          page={page}
          total={data?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Card>

      {/* ── Wizard dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!step} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{step ? stepMeta[step]?.title : ''}</DialogTitle>
            {step && (
              <p className="text-sm text-muted-foreground mt-1">{stepMeta[step]?.sub}</p>
            )}
          </DialogHeader>

          {step !== 'done' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={step === 'org' ? 'text-primary font-semibold' : 'text-success font-semibold'}>
                {step === 'org' ? '① Organization details' : '✓ Organization created'}
              </span>
              <span className="text-border">›</span>
              <span className={step === 'admin' ? 'text-primary font-semibold' : ''}>
                ② Org admin account
              </span>
            </div>
          )}

          <Separator />

          {/* ── Step 1: Organization form ──────────────────────────────── */}
          {step === 'org' && (
            <form onSubmit={handleOrgSubmit} className="flex flex-col gap-3" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label>Organization Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. TechLearn Institute"
                  value={orgForm.name}
                  onChange={(e) => { setOrgForm({ ...orgForm, name: e.target.value }); clearOrgField('name') }}
                  aria-invalid={!!orgErrors.name}
                />
                <FieldError message={orgErrors.name} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Description</Label>
                <textarea
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  rows={3}
                  placeholder="Brief description of the organization…"
                  value={orgForm.description}
                  onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Website URL</Label>
                <Input
                  placeholder="https://example.com"
                  value={orgForm.website}
                  onChange={(e) => { setOrgForm({ ...orgForm, website: e.target.value }); clearOrgField('website') }}
                  aria-invalid={!!orgErrors.website}
                />
                <FieldError message={orgErrors.website} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Logo URL</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={orgForm.logo_url}
                  onChange={(e) => { setOrgForm({ ...orgForm, logo_url: e.target.value }); clearOrgField('logo_url') }}
                  aria-invalid={!!orgErrors.logo_url}
                />
                <FieldError message={orgErrors.logo_url} />
              </div>

              {orgApiError && <p className="text-xs text-destructive">{orgApiError}</p>}

              <DialogFooter className="pt-1">
                <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={createOrgMutation.isPending}>
                  {createOrgMutation.isPending ? <Spinner size="sm" /> : 'Create Organization →'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ── Step 2: Org admin form ─────────────────────────────────── */}
          {step === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="flex flex-col gap-3" noValidate>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{createdOrg?.name}</span>
                <Badge variant="muted" className="ml-auto flex-shrink-0">org_admin</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Jane Smith"
                    value={adminForm.full_name}
                    onChange={(e) => { setAdminForm({ ...adminForm, full_name: e.target.value }); clearAdminField('full_name') }}
                    aria-invalid={!!adminErrors.full_name}
                  />
                  <FieldError message={adminErrors.full_name} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Username <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="jane_smith"
                    value={adminForm.username}
                    onChange={(e) => { setAdminForm({ ...adminForm, username: e.target.value }); clearAdminField('username') }}
                    aria-invalid={!!adminErrors.username}
                  />
                  <FieldError message={adminErrors.username} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Phone <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="+1234567890"
                    value={adminForm.phone}
                    onChange={(e) => { setAdminForm({ ...adminForm, phone: e.target.value }); clearAdminField('phone') }}
                    aria-invalid={!!adminErrors.phone}
                  />
                  <FieldError message={adminErrors.phone} />
                </div>

                <div className="flex flex-col gap-1.5 col-span-2">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="jane@example.com"
                    value={adminForm.email}
                    onChange={(e) => { setAdminForm({ ...adminForm, email: e.target.value }); clearAdminField('email') }}
                    aria-invalid={!!adminErrors.email}
                  />
                  <FieldError message={adminErrors.email} />
                </div>
              </div>

              {adminApiError && <p className="text-xs text-destructive">{adminApiError}</p>}

              <DialogFooter className="pt-1">
                <Button variant="outline" type="button" onClick={closeDialog}>
                  Skip for now
                </Button>
                <Button type="submit" disabled={createAdminMutation.isPending}>
                  {createAdminMutation.isPending
                    ? <Spinner size="sm" />
                    : <><UserPlus size={14} /> Create Admin</>}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ── Step 3: Done ───────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle size={18} />
                  <span className="text-sm font-semibold">Organization created</span>
                </div>
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle size={18} />
                  <span className="text-sm font-semibold">Org admin account created</span>
                </div>
              </div>

              <div className="bg-muted rounded-lg border border-border p-4 flex flex-col gap-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Temporary password — shown once, share securely:
                </p>
                <p className="text-lg font-mono font-bold text-foreground tracking-widest select-all">
                  {tempPassword}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                The admin will be required to change this password on first login.
              </p>

              <DialogFooter>
                <Button className="w-full" onClick={closeDialog}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
