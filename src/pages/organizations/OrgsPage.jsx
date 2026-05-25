import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Search, Trash2, CheckCircle, UserPlus,
  Pencil, PowerOff, ClipboardList, CheckCheck, XCircle,
} from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { createOrgSchema, createOrgAdminSchema, updateOrgSchema, rejectReasonSchema, fieldErrors } from '@/lib/schemas'

const LIMIT = 10

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

const EMPTY_ORG   = { name: '', description: '', website: '', logo_url: '' }
const EMPTY_ADMIN = { full_name: '', username: '', phone: '', email: '' }

// ── OrgStatusBadge ─────────────────────────────────────────────────────────

function OrgStatusBadge({ isActive }) {
  return isActive
    ? <Badge className="bg-success/15 text-success border-success/20 text-xs">Active</Badge>
    : <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-xs">Suspended</Badge>
}

// ── AppStatusBadge ─────────────────────────────────────────────────────────

function AppStatusBadge({ status }) {
  const map = {
    pending:  'bg-warning/15 text-warning border-warning/20',
    approved: 'bg-success/15 text-success border-success/20',
    rejected: 'bg-destructive/15 text-destructive border-destructive/20',
  }
  return (
    <Badge className={`${map[status] ?? ''} text-xs capitalize`}>{status}</Badge>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function OrgsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const isSuperAdmin = user?.role === 'super_admin'

  const [tab, setTab]       = useState('orgs')
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [appPage, setAppPage]   = useState(1)
  const [appStatus, setAppStatus] = useState('')

  // ── Create wizard state ────────────────────────────────────────────────
  const [step, setStep]         = useState(null)
  const [orgForm, setOrgForm]   = useState(EMPTY_ORG)
  const [orgErrors, setOrgErrors]     = useState({})
  const [orgApiError, setOrgApiError] = useState('')
  const [createdOrg, setCreatedOrg]   = useState(null)
  const [adminForm, setAdminForm]         = useState(EMPTY_ADMIN)
  const [adminErrors, setAdminErrors]     = useState({})
  const [adminApiError, setAdminApiError] = useState('')
  const [tempPassword, setTempPassword]   = useState('')

  // ── Edit org state ─────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState(EMPTY_ORG)
  const [editErrors, setEditErrors] = useState({})
  const [editApiError, setEditApiError] = useState('')

  // ── Activate/deactivate state ──────────────────────────────────────────
  const [activeTarget, setActiveTarget] = useState(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendError, setSuspendError]   = useState('')

  // ── Delete org state ───────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ── Review application state ───────────────────────────────────────────
  const [reviewTarget, setReviewTarget]   = useState(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [rejectError, setRejectError]     = useState('')

  // ── Queries ────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['orgs', page, search],
    queryFn: () =>
      api.listOrgs({ page, limit: LIMIT, search: search || undefined })
        .then((r) => ({ organizations: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['org-applications', appPage, appStatus],
    queryFn: () =>
      api.listApplications({
        page:   appPage,
        limit:  LIMIT,
        status: appStatus || undefined,
      }).then((r) => ({ applications: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
    enabled: isSuperAdmin && tab === 'applications',
  })

  // ── Mutations ──────────────────────────────────────────────────────────

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

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateOrg(id, data),
    onSuccess: () => { qc.invalidateQueries(['orgs']); setEditTarget(null) },
    onError: (err) => setEditApiError(err.response?.data?.message ?? 'Failed to update organization'),
  })

  const setActiveMutation = useMutation({
    mutationFn: ({ id, is_active, suspended_reason }) =>
      api.setOrgActiveStatus(id, { is_active, suspended_reason }),
    onSuccess: () => { qc.invalidateQueries(['orgs']); setActiveTarget(null) },
    onError: (err) => setSuspendError(err.response?.data?.message ?? 'Action failed'),
  })

  const deleteOrgMutation = useMutation({
    mutationFn: (id) => api.deleteOrg(id),
    onSuccess: () => qc.invalidateQueries(['orgs']),
  })

  const reviewAppMutation = useMutation({
    mutationFn: ({ appId, action, reject_reason }) =>
      api.reviewApplication(appId, { action, reject_reason }),
    onSuccess: () => { qc.invalidateQueries(['org-applications']); setReviewTarget(null) },
    onError: (err) => setRejectError(err.response?.data?.message ?? 'Review failed'),
  })

  // ── Create wizard helpers ──────────────────────────────────────────────

  const clearOrgField  = (f) => setOrgErrors((p) => { const n = { ...p }; delete n[f]; return n })
  const clearAdminField = (f) => setAdminErrors((p) => { const n = { ...p }; delete n[f]; return n })

  const openCreateDialog = () => {
    setOrgForm(EMPTY_ORG); setAdminForm(EMPTY_ADMIN)
    setOrgErrors({}); setOrgApiError('')
    setAdminErrors({}); setAdminApiError('')
    setCreatedOrg(null); setTempPassword('')
    setStep('org')
  }
  const closeDialog = () => setStep(null)

  const handleOrgSubmit = (e) => {
    e.preventDefault(); setOrgApiError('')
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
    e.preventDefault(); setAdminApiError('')
    const result = createOrgAdminSchema.safeParse(adminForm)
    if (!result.success) { setAdminErrors(fieldErrors(result)); return }
    setAdminErrors({})
    createAdminMutation.mutate({ ...result.data, role: 'org_admin', org_id: createdOrg?.id })
  }

  // ── Edit helpers ───────────────────────────────────────────────────────

  const openEdit = (row) => {
    setEditTarget(row)
    setEditForm({ name: row.name, description: row.description ?? '', website: row.website ?? '', logo_url: row.logo_url ?? '' })
    setEditErrors({}); setEditApiError('')
  }

  const handleEditSubmit = (e) => {
    e.preventDefault(); setEditApiError('')
    const result = updateOrgSchema.safeParse(editForm)
    if (!result.success) { setEditErrors(fieldErrors(result)); return }
    setEditErrors({})
    const body = {}
    if (result.data.name !== editTarget.name)                 body.name        = result.data.name
    if (result.data.description !== editTarget.description)   body.description = result.data.description
    if ((result.data.website ?? '') !== (editTarget.website ?? ''))   body.website = result.data.website || null
    if ((result.data.logo_url ?? '') !== (editTarget.logo_url ?? '')) body.logo_url = result.data.logo_url || null
    if (Object.keys(body).length === 0) { setEditTarget(null); return }
    updateOrgMutation.mutate({ id: editTarget.id, data: body })
  }

  // ── Activate/deactivate helpers ────────────────────────────────────────

  const openActive = (row) => {
    setActiveTarget(row); setSuspendReason(''); setSuspendError('')
  }

  const handleActiveSubmit = () => {
    const willActivate = !activeTarget.is_active
    if (!willActivate && !suspendReason.trim()) {
      setSuspendError('Please provide a suspension reason'); return
    }
    setActiveMutation.mutate({
      id:               activeTarget.id,
      is_active:        willActivate,
      suspended_reason: willActivate ? undefined : suspendReason.trim(),
    })
  }

  // ── Review helpers ─────────────────────────────────────────────────────

  const openReview = (app) => {
    setReviewTarget(app); setRejectReason(''); setRejectError('')
  }

  const handleApprove = () => {
    reviewAppMutation.mutate({ appId: reviewTarget.id, action: 'approved' })
  }

  const handleReject = () => {
    const result = rejectReasonSchema.safeParse({ reason: rejectReason })
    if (!result.success) { setRejectError(fieldErrors(result).reason ?? 'Invalid reason'); return }
    reviewAppMutation.mutate({ appId: reviewTarget.id, action: 'rejected', reject_reason: rejectReason })
  }

  // ── Orgs table columns ─────────────────────────────────────────────────

  const orgColumns = [
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
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div>
          <OrgStatusBadge isActive={row.is_active} />
          {!row.is_active && row.suspended_reason && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[160px] truncate">
              {row.suspended_reason}
            </p>
          )}
        </div>
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Edit organization"
            onClick={() => openEdit(row)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={row.is_active
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground hover:text-success hover:bg-success/10'}
            title={row.is_active ? 'Suspend organization' : 'Activate organization'}
            onClick={() => openActive(row)}
          >
            <PowerOff size={14} />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete organization"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    }] : []),
  ]

  // ── Applications table columns ─────────────────────────────────────────

  const appColumns = [
    {
      key: 'org_name',
      label: 'Organization',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.org_name}</p>
          {row.website && (
            <a href={row.website} target="_blank" rel="noreferrer"
              className="text-xs text-primary hover:underline">
              {row.website}
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div>
          <p className="text-sm text-foreground">{row.contact_name}</p>
          <p className="text-xs text-muted-foreground">{row.contact_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <AppStatusBadge status={row.status} />,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      render: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => row.status === 'pending' ? (
        <Button variant="outline" size="sm" onClick={() => openReview(row)}>
          Review
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground capitalize">{row.status}</span>
      ),
    },
  ]

  const stepMeta = {
    org:   { title: 'New Organization',            sub: 'Fill in the organization profile.' },
    admin: { title: 'Create Org Admin (optional)', sub: `Assign an admin to "${createdOrg?.name}". You can skip and do this later from the Users page.` },
    done:  { title: 'All done!',                   sub: 'Organization and admin account created.' },
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
          <Button onClick={openCreateDialog}>
            <Plus size={15} />
            New Organization
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="orgs" className="gap-2">
            <Building2 size={14} /> Organizations
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="applications" className="gap-2">
              <ClipboardList size={14} /> Applications
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Orgs tab ────────────────────────────────────────────────── */}
        <TabsContent value="orgs" className="mt-3">
          <Card>
            <DataTable
              columns={orgColumns}
              rows={data?.organizations ?? []}
              isLoading={isLoading}
              emptyMessage="No organizations found."
              page={page}
              total={data?.total ?? 0}
              limit={LIMIT}
              onPageChange={setPage}
              onRowClick={(row) => navigate(`/organizations/${row.id}`)}
            />
          </Card>
        </TabsContent>

        {/* ── Applications tab ─────────────────────────────────────────── */}
        {isSuperAdmin && (
          <TabsContent value="applications" className="mt-3">
            <div className="flex items-center gap-2 mb-3">
              {['', 'pending', 'approved', 'rejected'].map((s) => (
                <Button
                  key={s}
                  variant={appStatus === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setAppStatus(s); setAppPage(1) }}
                >
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Card>
              <DataTable
                columns={appColumns}
                rows={appsData?.applications ?? []}
                isLoading={appsLoading}
                emptyMessage="No applications found."
                page={appPage}
                total={appsData?.total ?? 0}
                limit={LIMIT}
                onPageChange={setAppPage}
              />
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Create wizard dialog ───────────────────────────────────────── */}
      <Dialog open={!!step} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{step ? stepMeta[step]?.title : ''}</DialogTitle>
            {step && <p className="text-sm text-muted-foreground mt-1">{stepMeta[step]?.sub}</p>}
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

          {/* Step 1 */}
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
                  placeholder="Brief description…"
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

          {/* Step 2 */}
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
                <Button variant="outline" type="button" onClick={closeDialog}>Skip for now</Button>
                <Button type="submit" disabled={createAdminMutation.isPending}>
                  {createAdminMutation.isPending ? <Spinner size="sm" /> : <><UserPlus size={14} /> Create Admin</>}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Step done */}
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

      {/* ── Edit org dialog ────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label>Organization Name <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.name}
                onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); setEditErrors((p) => { const n = { ...p }; delete n.name; return n }) }}
                aria-invalid={!!editErrors.name}
              />
              <FieldError message={editErrors.name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <textarea
                className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Website URL</Label>
              <Input
                placeholder="https://example.com"
                value={editForm.website}
                onChange={(e) => { setEditForm({ ...editForm, website: e.target.value }); setEditErrors((p) => { const n = { ...p }; delete n.website; return n }) }}
                aria-invalid={!!editErrors.website}
              />
              <FieldError message={editErrors.website} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://example.com/logo.png"
                value={editForm.logo_url}
                onChange={(e) => { setEditForm({ ...editForm, logo_url: e.target.value }); setEditErrors((p) => { const n = { ...p }; delete n.logo_url; return n }) }}
                aria-invalid={!!editErrors.logo_url}
              />
              <FieldError message={editErrors.logo_url} />
            </div>
            {editApiError && <p className="text-xs text-destructive">{editApiError}</p>}
            <DialogFooter className="pt-1">
              <Button variant="outline" type="button" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={updateOrgMutation.isPending}>
                {updateOrgMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Activate / Deactivate dialog ───────────────────────────────── */}
      <Dialog open={!!activeTarget} onOpenChange={(open) => { if (!open) setActiveTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeTarget?.is_active ? 'Suspend Organization' : 'Activate Organization'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              {activeTarget?.is_active
                ? `"${activeTarget?.name}" will lose access to the platform. Provide a reason for suspension.`
                : `"${activeTarget?.name}" will regain full access to the platform.`}
            </p>
            {activeTarget?.is_active && (
              <div className="flex flex-col gap-1.5">
                <Label>Suspension Reason <span className="text-destructive">*</span></Label>
                <textarea
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  rows={3}
                  placeholder="e.g. Payment overdue, policy violation…"
                  value={suspendReason}
                  onChange={(e) => { setSuspendReason(e.target.value); setSuspendError('') }}
                />
                {suspendError && <p className="text-xs text-destructive">{suspendError}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveTarget(null)}>Cancel</Button>
            <Button
              variant={activeTarget?.is_active ? 'destructive' : 'default'}
              disabled={setActiveMutation.isPending}
              onClick={handleActiveSubmit}
            >
              {setActiveMutation.isPending
                ? <Spinner size="sm" />
                : activeTarget?.is_active ? 'Suspend' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete org dialog ─────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            {deleteTarget && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={deleteTarget.logo_url} alt={deleteTarget.name} />
                  <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-semibold">
                    {initials(deleteTarget.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{deleteTarget.name}</p>
                  {deleteTarget.website && (
                    <p className="text-xs text-muted-foreground">{deleteTarget.website}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{deleteTarget?.name}</strong> and all its courses and members. This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteOrgMutation.isPending}
              onClick={() => {
                deleteOrgMutation.mutate(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              {deleteOrgMutation.isPending ? <Spinner size="sm" /> : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review application dialog ──────────────────────────────────── */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) setReviewTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="flex flex-col gap-4 py-1">
              <div className="bg-muted rounded-lg p-3 flex flex-col gap-1 text-sm">
                <p><span className="text-muted-foreground">Org:</span> <strong>{reviewTarget.org_name}</strong></p>
                <p><span className="text-muted-foreground">Contact:</span> {reviewTarget.contact_name}</p>
                <p><span className="text-muted-foreground">Email:</span> {reviewTarget.contact_email}</p>
                {reviewTarget.contact_phone && <p><span className="text-muted-foreground">Phone:</span> {reviewTarget.contact_phone}</p>}
                {reviewTarget.website && <p><span className="text-muted-foreground">Website:</span> {reviewTarget.website}</p>}
                {reviewTarget.description && (
                  <p className="text-muted-foreground mt-1 text-xs">{reviewTarget.description}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Rejection Reason <span className="text-muted-foreground text-xs">(required if rejecting)</span></Label>
                <textarea
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  rows={3}
                  placeholder="Reason for rejection…"
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectError('') }}
                />
                {rejectError && <p className="text-xs text-destructive">{rejectError}</p>}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setReviewTarget(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-1.5"
                  disabled={reviewAppMutation.isPending}
                  onClick={handleReject}
                >
                  <XCircle size={14} /> Reject
                </Button>
                <Button
                  className="flex-1 gap-1.5"
                  disabled={reviewAppMutation.isPending}
                  onClick={handleApprove}
                >
                  <CheckCheck size={14} /> Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
