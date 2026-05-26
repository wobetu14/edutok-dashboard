import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/api/client'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { FieldError } from '@/components/ui/FieldError'
import { rejectReasonSchema, createCourseSchema, fieldErrors } from '@/lib/schemas'

const LIMIT = 10

const TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

const initForm = () => ({
  title:         '',
  description:   '',
  category_ids:  [],
  difficulty:    'Beginner',
  visibility:    'public',
  org_id:        '',
  instructor_id: '',
})

const inputClass  = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectClass = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default function CoursesPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const qc         = useQueryClient()

  const [page, setPage]                 = useState(1)
  const [tab, setTab]                   = useState('all')
  const [reviewModal, setModal]         = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError]   = useState('')
  const [actionError, setActionError]   = useState('')
  const [createOpen, setCreateOpen]     = useState(false)
  const [form, setForm]                 = useState(initForm)
  const [formErrors, setFormErrors]     = useState({})

  const isSuperAdmin = user?.role === 'super_admin'
  const isOrgAdmin   = user?.role === 'org_admin'

  // Full profile with org_memberships
  const { data: me } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  () => api.getMe().then((r) => r.data.data),
    initialData: user?.org_memberships ? user : undefined,
  })

  const userOrgs = me?.org_memberships?.map((m) => ({ id: m.org.id, name: m.org.name })) ?? []

  // Categories — fetched only when create dialog is open
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.listCategories().then((r) => r.data.data),
    enabled:  createOpen,
    staleTime: 5 * 60 * 1000,
  })

  // Org members for instructor assignment (org_admin only)
  const { data: orgMembers = [] } = useQuery({
    queryKey: ['org-members', form.org_id],
    queryFn:  () => api.listOrgMembers(form.org_id).then((r) => r.data.data),
    enabled:  isOrgAdmin && !!form.org_id && createOpen,
  })

  // Course list
  const { data, isLoading } = useQuery({
    queryKey: ['courses', tab, page],
    queryFn:  () =>
      api.listMyCourses({
        page,
        limit:  LIMIT,
        status: tab === 'all' ? undefined : tab,
      }).then((r) => ({ courses: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  // Approve / Reject (org_admin only)
  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }) =>
      api.approveCourse(id, { action, rejection_reason }),
    onSuccess: () => {
      qc.invalidateQueries(['courses'])
      setModal(null)
      setRejectReason('')
      setRejectError('')
      setActionError('')
    },
    onError: (err) => setActionError(err.response?.data?.message ?? 'Action failed'),
  })

  // Create course
  const createMutation = useMutation({
    mutationFn: (data) => api.createCourse(data),
    onSuccess: () => {
      qc.invalidateQueries(['courses'])
      setCreateOpen(false)
      setForm(initForm())
      setFormErrors({})
    },
    onError: (err) =>
      setFormErrors((prev) => ({
        ...prev,
        _submit: err.response?.data?.message ?? 'Failed to create course',
      })),
  })

  const courses = data?.courses ?? []

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleOpenCreate = () => {
    const autoOrg = userOrgs.length === 1 ? userOrgs[0].id : ''
    setForm({ ...initForm(), org_id: autoOrg })
    setFormErrors({})
    setCreateOpen(true)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const result = createCourseSchema.safeParse(form)
    if (!result.success) {
      setFormErrors(fieldErrors(result))
      return
    }
    const payload = {
      org_id:       result.data.org_id,
      title:        result.data.title,
      category_ids: result.data.category_ids,
      difficulty:   result.data.difficulty,
      visibility:   result.data.visibility,
    }
    if (result.data.description) payload.description = result.data.description
    if (isOrgAdmin && result.data.instructor_id) payload.instructor_id = result.data.instructor_id
    createMutation.mutate(payload)
  }

  const columns = [
    {
      key:   'title',
      label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.organization?.name}
            {row.instructor ? ` · ${row.instructor.full_name}` : ''}
          </p>
        </div>
      ),
    },
    {
      key:   'categories',
      label: 'Categories',
      render: (row) => {
        const cats = row.categories ?? []
        if (cats.length === 0) {
          return <span className="text-xs text-muted-foreground">{row.category || '—'}</span>
        }
        return (
          <div className="flex gap-1 flex-wrap max-w-[180px]">
            {cats.map((cat) => (
              <span
                key={cat.id}
                className="inline-block px-1.5 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: cat.color }}
              >
                {cat.label}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key:   'difficulty',
      label: 'Level',
      render: (row) => (
        <Badge color={DIFFICULTY[row.difficulty]?.color}>{row.difficulty}</Badge>
      ),
    },
    {
      key:   'status',
      label: 'Status',
      render: (row) => (
        <Badge color={COURSE_STATUS[row.status]?.color}>{COURSE_STATUS[row.status]?.label}</Badge>
      ),
    },
    {
      key:   'lessons',
      label: 'Lessons',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.lesson_count ?? 0}</span>
      ),
    },
    ...(isOrgAdmin && tab === 'pending'
      ? [{
          key:   'actions',
          label: '',
          render: (row) => (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost" size="sm"
                className="gap-1 text-xs text-success hover:text-success hover:bg-success/10"
                onClick={() => { setModal({ ...row, action: 'approve' }); setActionError('') }}
              >
                <CheckCircle size={13} /> Approve
              </Button>
              <Button
                variant="ghost" size="sm"
                className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => { setModal({ ...row, action: 'reject' }); setActionError(''); setRejectReason('') }}
              >
                <XCircle size={13} /> Reject
              </Button>
            </div>
          ),
        }]
      : []
    ),
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isSuperAdmin ? 'All Courses' : isOrgAdmin ? 'Courses' : 'My Courses'}
          </h1>
          {isSuperAdmin && (
            <p className="text-sm text-muted-foreground">
              View-only — course management belongs to org admins and instructors
            </p>
          )}
        </div>
        {!isSuperAdmin && (
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus size={15} /> New Course
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => { setTab(t.key); setPage(1) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <DataTable
          columns={columns}
          rows={courses}
          isLoading={isLoading}
          emptyMessage="No courses found."
          page={page}
          total={data?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/courses/${row.id}`)}
        />
      </Card>

      {/* Approve / Reject dialog — org_admin only */}
      {isOrgAdmin && (
        <Dialog
          open={!!reviewModal}
          onOpenChange={(open) => {
            if (!open) { setModal(null); setRejectReason(''); setRejectError(''); setActionError('') }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {reviewModal?.action === 'approve' ? 'Approve Course' : 'Reject Course'}
              </DialogTitle>
            </DialogHeader>

            {reviewModal && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground">
                  {reviewModal.action === 'approve'
                    ? `Approve "${reviewModal.title}"? It will become publicly accessible.`
                    : `Reject "${reviewModal.title}"?`}
                </p>

                {reviewModal.action === 'reject' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">
                      Reason <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => { setRejectReason(e.target.value); setRejectError('') }}
                      placeholder="Explain why this course is being rejected…"
                    />
                    <FieldError message={rejectError} />
                  </div>
                )}

                {actionError && <p className="text-xs text-destructive">{actionError}</p>}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => { setModal(null); setRejectReason(''); setRejectError(''); setActionError('') }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={reviewModal.action === 'approve' ? 'default' : 'destructive'}
                    disabled={reviewMutation.isPending}
                    onClick={() => {
                      if (reviewModal.action === 'reject') {
                        const result = rejectReasonSchema.safeParse({ reason: rejectReason })
                        if (!result.success) {
                          setRejectError(result.error.issues[0]?.message ?? 'Reason is required')
                          return
                        }
                        reviewMutation.mutate({
                          id: reviewModal.id,
                          action: 'reject',
                          rejection_reason: result.data.reason,
                        })
                      } else {
                        reviewMutation.mutate({ id: reviewModal.id, action: 'approve' })
                      }
                    }}
                  >
                    {reviewMutation.isPending
                      ? <Spinner size="sm" />
                      : reviewModal.action === 'approve' ? 'Approve' : 'Reject'
                    }
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Create Course dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) { setCreateOpen(false); setForm(initForm()); setFormErrors({}) }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Course</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} noValidate>
            <div className="flex flex-col gap-4 py-1">
              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="e.g. Introduction to Python"
                />
                <FieldError message={formErrors.title} />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Brief overview of what learners will gain…"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Categories <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-input rounded-md p-2 bg-background">
                  {categories.length === 0 ? (
                    <span className="text-xs text-muted-foreground col-span-2 text-center py-2">
                      Loading categories…
                    </span>
                  ) : (
                    categories.map((cat) => (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/40 rounded px-1.5 py-1"
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={form.category_ids.includes(cat.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...form.category_ids, cat.id]
                              : form.category_ids.filter((id) => id !== cat.id)
                            setField('category_ids', ids)
                          }}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: cat.color }}
                        />
                        <span className="truncate">{cat.label}</span>
                      </label>
                    ))
                  )}
                </div>
                <FieldError message={formErrors.category_ids} />
              </div>

              {/* Difficulty + Visibility */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Difficulty</label>
                  <select
                    className={selectClass}
                    value={form.difficulty}
                    onChange={(e) => setField('difficulty', e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Visibility</label>
                  <select
                    className={selectClass}
                    value={form.visibility}
                    onChange={(e) => setField('visibility', e.target.value)}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              {/* Organization — only show dropdown if instructor has multiple orgs */}
              {!isOrgAdmin && userOrgs.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    Organization <span className="text-destructive">*</span>
                  </label>
                  <select
                    className={selectClass}
                    value={form.org_id}
                    onChange={(e) => setField('org_id', e.target.value)}
                  >
                    <option value="">Select organization</option>
                    {userOrgs.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <FieldError message={formErrors.org_id} />
                </div>
              )}

              {/* Read-only org name when there's only one */}
              {userOrgs.length === 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Organization</label>
                  <p className="text-sm text-foreground px-3 py-2 bg-muted/40 rounded-md">
                    {userOrgs[0].name}
                  </p>
                </div>
              )}

              {/* Instructor assignment — org_admin only */}
              {isOrgAdmin && orgMembers.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Assign Instructor</label>
                  <select
                    className={selectClass}
                    value={form.instructor_id}
                    onChange={(e) => setField('instructor_id', e.target.value)}
                  >
                    <option value="">Yourself (default)</option>
                    {orgMembers
                      .filter((m) => m.user.id !== me?.id)
                      .map((m) => (
                        <option key={m.user.id} value={m.user.id}>
                          {m.user.full_name} (@{m.user.username})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {formErrors._submit && (
                <p className="text-xs text-destructive">{formErrors._submit}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setCreateOpen(false); setForm(initForm()); setFormErrors({}) }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Spinner size="sm" /> : 'Create Course'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
