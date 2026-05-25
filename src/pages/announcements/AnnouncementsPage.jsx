import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { api } from '@/api/client'
import { announcementSchema, fieldErrors } from '@/lib/schemas'

const LIMIT = 10

const ROLE_OPTIONS = [
  { value: '',           label: 'All roles' },
  { value: 'learner',    label: 'Learners only' },
  { value: 'instructor', label: 'Instructors only' },
  { value: 'org_admin',  label: 'Org Admins only' },
]

const ROLE_BADGE = {
  '':         'bg-muted text-muted-foreground',
  learner:    'bg-blue-100 text-blue-700',
  instructor: 'bg-purple-100 text-purple-700',
  org_admin:  'bg-secondary/20 text-teal-700',
}

const INIT_FORM = { title: '', body: '', target_role: '', expires_at: '' }

export default function AnnouncementsPage() {
  const qc = useQueryClient()
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm]           = useState(INIT_FORM)
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['announcements', page],
    queryFn: () =>
      api.listAnnouncements({ page, limit: LIMIT })
        .then((r) => r.data.data),
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.createAnnouncement(body),
    onSuccess: () => {
      qc.invalidateQueries(['announcements'])
      setModal(false)
      setForm(INIT_FORM)
      setErrors({})
      setPage(1)
    },
    onError: (err) => setApiError(err.response?.data?.message ?? 'Failed to create'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries(['announcements'])
      setDeleteTarget(null)
      if ((data?.announcements?.length ?? 0) === 1 && page > 1) setPage((p) => p - 1)
    },
  })

  const clearField = (field) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })

  const openModal = () => { setForm(INIT_FORM); setErrors({}); setApiError(''); setModal(true) }

  const handleSubmit = (e) => {
    e.preventDefault()
    setApiError('')
    const result = announcementSchema.safeParse(form)
    if (!result.success) { setErrors(fieldErrors(result)); return }
    setErrors({})
    createMutation.mutate({
      title:       result.data.title,
      body:        result.data.body,
      target_role: result.data.target_role || undefined,
      expires_at:  result.data.expires_at  || undefined,
    })
  }

  const announcements = data?.announcements ?? []
  const total         = data?.total ?? 0
  const totalPages    = Math.ceil(total / LIMIT)
  const start         = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const end           = Math.min(page * LIMIT, total)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total > 0 ? `${start}–${end} of ${total} announcement${total !== 1 ? 's' : ''}` : ''}
        </p>
        <Button onClick={openModal}>
          <Plus size={15} />
          New Announcement
        </Button>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground text-sm">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a, i) => (
            <Card key={a.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    <Badge color={ROLE_BADGE[a.target_role ?? '']}>
                      {a.target_role
                        ? ROLE_OPTIONS.find((r) => r.value === a.target_role)?.label
                        : 'All roles'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.published_at ?? a.created_at).toLocaleDateString()}
                    {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={() => setDeleteTarget(a)}
                >
                  <Trash2 size={15} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">{start}–{end} of {total}</p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={13} />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline" size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      )}

      {/* ── Delete confirm dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Announcement</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            {deleteTarget && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-semibold text-foreground">{deleteTarget.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{deleteTarget.body}</p>
              </div>
            )}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle size={15} className="text-warning flex-shrink-0 mt-0.5" />
              <span>This announcement will be permanently deleted and removed for all recipients.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create dialog ── */}
      <Dialog open={modal} onOpenChange={(open) => { if (!open) setModal(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); clearField('title') }}
                aria-invalid={!!errors.title}
              />
              <FieldError message={errors.title} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Message <span className="text-destructive">*</span></Label>
              <textarea
                className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                rows={3}
                placeholder="Announcement message…"
                value={form.body}
                onChange={(e) => { setForm({ ...form, body: e.target.value }); clearField('body') }}
                aria-invalid={!!errors.body}
              />
              <FieldError message={errors.body} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Target Audience</Label>
              <select
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Expires At <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            {apiError && <p className="text-xs text-destructive">{apiError}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner size="sm" /> : 'Publish'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
