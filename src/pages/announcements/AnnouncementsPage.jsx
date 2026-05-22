import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
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
  const [modal, setModal]   = useState(false)
  const [form, setForm]     = useState(INIT_FORM)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.listAnnouncements().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.createAnnouncement(body),
    onSuccess: () => {
      qc.invalidateQueries(['announcements'])
      setModal(false)
      setForm(INIT_FORM)
      setErrors({})
    },
    onError: (err) => setApiError(err.response?.data?.message ?? 'Failed to create'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAnnouncement(id),
    onSuccess: () => qc.invalidateQueries(['announcements']),
  })

  const clearField = (field) =>
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next })

  const openModal = () => {
    setForm(INIT_FORM)
    setErrors({})
    setApiError('')
    setModal(true)
  }

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

  const announcements = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openModal}>
          <Plus size={15} />
          New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
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
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={() => deleteMutation.mutate(a.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modal} onOpenChange={(open) => { if (!open) setModal(false) }}>
        <DialogContent className="max-w-sm">
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
              <Button variant="outline" type="button" onClick={() => setModal(false)}>
                Cancel
              </Button>
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
