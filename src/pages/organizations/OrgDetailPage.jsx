import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, Globe, Calendar, Users, BookOpen,
  Pencil, PowerOff, Trash2, ShieldCheck, ShieldOff, AlertTriangle,
  UserCheck, Crown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import { Spinner } from '@/components/ui/Spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/api/client'
import { updateOrgSchema, fieldErrors } from '@/lib/schemas'
import { OrgLogoUpload } from '@/components/ui/OrgLogoUpload'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'

const LIMIT = 10

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const ORG_ROLE_BADGE = {
  org_admin:  'bg-primary/10 text-primary',
  instructor: 'bg-secondary/10 text-secondary-foreground',
}

export default function OrgDetailPage() {
  const { orgId }  = useParams()
  const navigate   = useNavigate()
  const qc         = useQueryClient()

  const [tab, setTab]         = useState('members')
  const [coursePage, setCoursePage] = useState(1)

  // ── Edit state ─────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]       = useState(false)
  const [editForm, setEditForm]       = useState({ name: '', description: '', website: '', logo_url: '' })
  const [editErrors, setEditErrors]   = useState({})
  const [editApiError, setEditApiError] = useState('')

  // ── Activate/suspend state ─────────────────────────────────────────────
  const [activeOpen, setActiveOpen]       = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendError, setSuspendError]   = useState('')

  // ── Delete state ───────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn:  () => api.getOrg(orgId).then((r) => r.data.data),
  })

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn:  () => api.listOrgMembers(orgId).then((r) => r.data.data ?? []),
    enabled: tab === 'members',
  })

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['org-courses', orgId, coursePage],
    queryFn:  () =>
      api.listOrgCourses(orgId, { page: coursePage, limit: LIMIT })
        .then((r) => ({ courses: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
    enabled: tab === 'courses',
  })

  // ── Mutations ──────────────────────────────────────────────────────────

  const updateOrgMutation = useMutation({
    mutationFn: (data) => api.updateOrg(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries(['org', orgId])
      qc.invalidateQueries(['orgs'])
      setEditOpen(false)
    },
    onError: (err) => setEditApiError(err.response?.data?.message ?? 'Failed to update'),
  })

  const setActiveMutation = useMutation({
    mutationFn: ({ is_active, suspended_reason }) =>
      api.setOrgActiveStatus(orgId, { is_active, suspended_reason }),
    onSuccess: () => {
      qc.invalidateQueries(['org', orgId])
      qc.invalidateQueries(['orgs'])
      setActiveOpen(false)
    },
    onError: (err) => setSuspendError(err.response?.data?.message ?? 'Action failed'),
  })

  const deleteOrgMutation = useMutation({
    mutationFn: () => api.deleteOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries(['orgs'])
      navigate('/organizations')
    },
  })

  // ── Edit handlers ──────────────────────────────────────────────────────

  const openEdit = () => {
    setEditForm({
      name:        org?.name ?? '',
      description: org?.description ?? '',
      website:     org?.website ?? '',
      logo_url:    org?.logo_url ?? '',
    })
    setEditErrors({})
    setEditApiError('')
    setEditOpen(true)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    setEditApiError('')
    const result = updateOrgSchema.safeParse(editForm)
    if (!result.success) { setEditErrors(fieldErrors(result)); return }
    setEditErrors({})
    const body = {}
    if (result.data.name !== org?.name)                           body.name        = result.data.name
    if ((result.data.description ?? '') !== (org?.description ?? '')) body.description = result.data.description
    if ((result.data.website  ?? '') !== (org?.website  ?? ''))   body.website  = result.data.website  || null
    if ((result.data.logo_url ?? '') !== (org?.logo_url ?? ''))   body.logo_url = result.data.logo_url || null
    if (Object.keys(body).length === 0) { setEditOpen(false); return }
    updateOrgMutation.mutate(body)
  }

  // ── Activate/suspend handler ───────────────────────────────────────────

  const handleActiveSubmit = () => {
    const willActivate = !org?.is_active
    if (!willActivate && !suspendReason.trim()) {
      setSuspendError('Please provide a suspension reason')
      return
    }
    setActiveMutation.mutate({
      is_active:        willActivate,
      suspended_reason: willActivate ? undefined : suspendReason.trim(),
    })
  }

  // ── Members table ──────────────────────────────────────────────────────

  const memberColumns = [
    {
      key: 'user',
      label: 'Member',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.user?.avatar_url} alt={row.user?.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials(row.user?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.user?.full_name}</p>
            <p className="text-xs text-muted-foreground">@{row.user?.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (row) => (
        <div>
          <p className="text-xs text-foreground">{row.user?.phone ?? '—'}</p>
          {row.user?.email && <p className="text-xs text-muted-foreground">{row.user.email}</p>}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => (
        <Badge className={`${ORG_ROLE_BADGE[row.role] ?? ''} text-xs capitalize`}>
          {row.role === 'org_admin' ? 'Org Admin' : 'Instructor'}
        </Badge>
      ),
    },
    {
      key: 'joined_at',
      label: 'Joined',
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.joined_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  // ── Courses table ──────────────────────────────────────────────────────

  const courseColumns = [
    {
      key: 'title',
      label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.category}</p>
        </div>
      ),
    },
    {
      key: 'difficulty',
      label: 'Level',
      render: (row) => (
        <Badge color={DIFFICULTY[row.difficulty]?.color}>{row.difficulty}</Badge>
      ),
    },
    {
      key: 'visibility',
      label: 'Visibility',
      render: (row) => (
        <Badge color={COURSE_VISIBILITY[row.visibility]?.color}>
          {COURSE_VISIBILITY[row.visibility]?.label}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge color={COURSE_STATUS[row.status]?.color}>{COURSE_STATUS[row.status]?.label}</Badge>
      ),
    },
    {
      key: 'lessons',
      label: 'Lessons',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.lesson_count ?? '—'}</span>
      ),
    },
  ]

  // ── Loading skeleton ───────────────────────────────────────────────────

  if (orgLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <Building2 size={36} className="opacity-30" />
        <p className="text-sm">Organization not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/organizations')}>
          Back to Organizations
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate('/organizations')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Building2 size={14} />
          Organizations
        </button>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{org.name}</span>
      </div>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <Button
          variant="outline" size="icon"
          className="h-8 w-8 flex-shrink-0 mt-1"
          onClick={() => navigate('/organizations')}
        >
          <ArrowLeft size={15} />
        </Button>

        <Avatar className="h-16 w-16 rounded-xl flex-shrink-0">
          <AvatarImage src={org.logo_url} alt={org.name} className="object-cover" />
          <AvatarFallback className="bg-secondary/20 text-secondary text-xl font-bold rounded-xl">
            {initials(org.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{org.name}</h1>
            {org.is_active
              ? <Badge className="bg-success/15 text-success border-success/20 text-xs">Active</Badge>
              : <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-xs">Suspended</Badge>
            }
          </div>

          {org.website && (
            <a
              href={org.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline mt-0.5 w-fit"
            >
              <Globe size={12} />
              {org.website}
            </a>
          )}

          {!org.is_active && org.suspended_reason && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-destructive">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>{org.suspended_reason}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}     label="Members"  value={org.member_count ?? members.length} />
        <StatCard icon={BookOpen}  label="Courses"  value={org.course_count ?? '—'} />
        <StatCard icon={Calendar}  label="Created"  value={new Date(org.created_at).toLocaleDateString()} />
        <StatCard
          icon={Crown}
          label="Owner"
          value={org.owner?.full_name ?? '—'}
        />
      </div>

      {/* ── Description ─────────────────────────────────────────────────── */}
      {org.description && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
            <p className="text-sm text-foreground leading-relaxed">{org.description}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Owner detail ────────────────────────────────────────────────── */}
      {org.owner && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Organization Owner</p>
              <p className="text-sm font-semibold text-foreground">{org.owner.full_name}</p>
              <p className="text-xs text-muted-foreground">@{org.owner.username}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Members / Courses tabs ──────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users size={14} />
            Members {members.length > 0 && `(${members.length})`}
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen size={14} />
            Courses {org.course_count > 0 && `(${org.course_count})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3">
          <Card>
            <DataTable
              columns={memberColumns}
              rows={members}
              isLoading={membersLoading}
              emptyMessage="No members yet."
              page={1}
              total={members.length}
              limit={members.length || 10}
              onPageChange={() => {}}
            />
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="mt-3">
          <Card>
            <DataTable
              columns={courseColumns}
              rows={coursesData?.courses ?? []}
              isLoading={coursesLoading}
              emptyMessage="No published courses yet."
              page={coursePage}
              total={coursesData?.total ?? 0}
              limit={LIMIT}
              onPageChange={setCoursePage}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <Separator />
      <div className="flex flex-wrap items-center gap-3 pb-4">
        <Button variant="outline" className="gap-2" onClick={openEdit}>
          <Pencil size={14} />
          Edit Organization
        </Button>

        <Button
          variant="outline"
          className={`gap-2 ${org.is_active
            ? 'text-destructive border-destructive/30 hover:bg-destructive/5'
            : 'text-success border-success/30 hover:bg-success/5'}`}
          onClick={() => { setSuspendReason(''); setSuspendError(''); setActiveOpen(true) }}
        >
          {org.is_active
            ? <><ShieldOff size={14} /> Suspend Organization</>
            : <><ShieldCheck size={14} /> Activate Organization</>}
        </Button>

        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 ml-auto"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 size={14} />
          Delete Organization
        </Button>
      </div>

      {/* ══ Edit dialog ══════════════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditOpen(false) }}>
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
              <Label>Organization Logo</Label>
              <OrgLogoUpload
                value={editForm.logo_url}
                orgName={editForm.name}
                onChange={(url) => { setEditForm((f) => ({ ...f, logo_url: url })); setEditErrors((p) => { const n = { ...p }; delete n.logo_url; return n }) }}
              />
            </div>
            {editApiError && <p className="text-xs text-destructive">{editApiError}</p>}
            <DialogFooter className="pt-1">
              <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateOrgMutation.isPending}>
                {updateOrgMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══ Activate / Suspend dialog ════════════════════════════════════ */}
      <Dialog open={activeOpen} onOpenChange={(open) => { if (!open) setActiveOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {org.is_active ? 'Suspend Organization' : 'Activate Organization'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <p className="text-sm text-muted-foreground">
              {org.is_active
                ? `"${org.name}" will lose access to the platform. All associated instructors and courses will be affected.`
                : `"${org.name}" will regain full access to the platform.`}
            </p>
            {org.is_active && (
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
            <Button variant="outline" onClick={() => setActiveOpen(false)}>Cancel</Button>
            <Button
              variant={org.is_active ? 'destructive' : 'default'}
              disabled={setActiveMutation.isPending}
              onClick={handleActiveSubmit}
            >
              {setActiveMutation.isPending
                ? <Spinner size="sm" />
                : org.is_active ? 'Suspend' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Delete dialog ════════════════════════════════════════════════ */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) setDeleteOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-9 w-9 rounded-lg">
                <AvatarImage src={org.logo_url} alt={org.name} />
                <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-bold rounded-lg">
                  {initials(org.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  {org.member_count} member{org.member_count !== 1 ? 's' : ''} · {org.course_count} course{org.course_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
              <span>
                This will permanently delete <strong className="text-foreground">{org.name}</strong> along with all its courses and members. This action cannot be undone.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteOrgMutation.isPending}
              onClick={() => deleteOrgMutation.mutate()}
            >
              {deleteOrgMutation.isPending ? <Spinner size="sm" /> : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
