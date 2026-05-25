import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/FieldError'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/Spinner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/api/client'
import { createCategorySchema, updateCategorySchema, fieldErrors } from '@/lib/schemas'

// Suggested icon names matching Ionicons used in the mobile app
const ICON_SUGGESTIONS = [
  'construct', 'hardware-chip', 'globe', 'calculator', 'brain',
  'briefcase', 'cash', 'color-palette', 'flask', 'book',
  'heart', 'leaf', 'musical-notes', 'bar-chart', 'school',
  'laptop', 'analytics', 'fitness', 'camera', 'code-slash',
]

const INIT_CREATE = { id: '', label: '', icon: '', color: '#6C63FF' }
const INIT_EDIT   = { label: '', icon: '', color: '' }

export default function CategoriesPage() {
  const qc = useQueryClient()

  const [createModal, setCreateModal] = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)  // category object
  const [deleteTarget, setDeleteTarget] = useState(null) // category object

  const [createForm, setCreateForm] = useState(INIT_CREATE)
  const [editForm,   setEditForm]   = useState(INIT_EDIT)

  const [createErrors, setCreateErrors] = useState({})
  const [editErrors,   setEditErrors]   = useState({})
  const [createApiErr, setCreateApiErr] = useState('')
  const [editApiErr,   setEditApiErr]   = useState('')
  const [deleteApiErr, setDeleteApiErr] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.listCategories().then((r) => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.createCategory(body),
    onSuccess: () => {
      qc.invalidateQueries(['categories'])
      setCreateModal(false)
      setCreateForm(INIT_CREATE)
      setCreateErrors({})
      setCreateApiErr('')
    },
    onError: (err) => setCreateApiErr(err.response?.data?.message ?? 'Failed to create category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.updateCategory(id, body),
    onSuccess: () => {
      qc.invalidateQueries(['categories'])
      setEditTarget(null)
      setEditErrors({})
      setEditApiErr('')
    },
    onError: (err) => setEditApiErr(err.response?.data?.message ?? 'Failed to update category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries(['categories'])
      setDeleteTarget(null)
      setDeleteApiErr('')
    },
    onError: (err) => setDeleteApiErr(err.response?.data?.message ?? 'Failed to delete category'),
  })

  const clearCreateField = (f) =>
    setCreateErrors((p) => { const n = { ...p }; delete n[f]; return n })
  const clearEditField = (f) =>
    setEditErrors((p) => { const n = { ...p }; delete n[f]; return n })

  const openCreate = () => {
    setCreateForm(INIT_CREATE)
    setCreateErrors({})
    setCreateApiErr('')
    setCreateModal(true)
  }

  const openEdit = (cat) => {
    setEditForm({ label: cat.label, icon: cat.icon, color: cat.color })
    setEditErrors({})
    setEditApiErr('')
    setEditTarget(cat)
  }

  const openDelete = (cat) => {
    setDeleteApiErr('')
    setDeleteTarget(cat)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    setCreateApiErr('')
    const result = createCategorySchema.safeParse(createForm)
    if (!result.success) { setCreateErrors(fieldErrors(result)); return }
    setCreateErrors({})
    createMutation.mutate(result.data)
  }

  const handleEdit = (e) => {
    e.preventDefault()
    setEditApiErr('')
    const result = updateCategorySchema.safeParse(editForm)
    if (!result.success) { setEditErrors(fieldErrors(result)); return }
    setEditErrors({})
    updateMutation.mutate({ id: editTarget.id, ...result.data })
  }

  const categories = data ?? []

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage course categories. Categories are used to group courses and personalise learner feeds.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} />
          New Category
        </Button>
      </div>

      {/* ── Category grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Tags size={36} className="opacity-30" />
            <p className="text-sm">No categories yet. Create the first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Card
              key={cat.id}
              className="animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Color accent strip */}
              <div className="h-1.5 w-full" style={{ background: cat.color }} />

              <CardContent className="p-4 flex flex-col gap-3">
                {/* Icon + label row */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-lg font-bold"
                    style={{ background: cat.color + '33', color: cat.color }}
                    title={`icon: ${cat.icon}`}
                  >
                    {cat.label.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{cat.label}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{cat.id}</p>
                  </div>
                </div>

                {/* Stats + actions row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {cat.course_count} course{cat.course_count !== 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(cat)}
                      title="Edit category"
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDelete(cat)}
                      title="Delete category"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Icon name + color chip */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                    style={{ background: cat.color + '22', color: cat.color }}
                  >
                    <span className="font-mono">{cat.icon}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase">{cat.color}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createModal} onOpenChange={(open) => { if (!open) setCreateModal(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="flex flex-col gap-3" noValidate>

            <div className="flex flex-col gap-1.5">
              <Label>Slug / ID <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. stem, health, finance"
                value={createForm.id}
                onChange={(e) => {
                  setCreateForm({ ...createForm, id: e.target.value.toLowerCase() })
                  clearCreateField('id')
                }}
                aria-invalid={!!createErrors.id}
              />
              <p className="text-[11px] text-muted-foreground">
                Lowercase, letters/numbers/hyphens/underscores. Used as a stable identifier.
              </p>
              <FieldError message={createErrors.id} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Display Label <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. STEM, Health & Fitness"
                value={createForm.label}
                onChange={(e) => { setCreateForm({ ...createForm, label: e.target.value }); clearCreateField('label') }}
                aria-invalid={!!createErrors.label}
              />
              <FieldError message={createErrors.label} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Icon Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. flask, heart, school"
                value={createForm.icon}
                onChange={(e) => { setCreateForm({ ...createForm, icon: e.target.value }); clearCreateField('icon') }}
                aria-invalid={!!createErrors.icon}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {ICON_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setCreateForm({ ...createForm, icon: s }); clearCreateField('icon') }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <FieldError message={createErrors.icon} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Color <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => { setCreateForm({ ...createForm, color: e.target.value }); clearCreateField('color') }}
                  className="h-10 w-12 rounded cursor-pointer border border-input"
                />
                <Input
                  placeholder="#FF6B35"
                  value={createForm.color}
                  onChange={(e) => { setCreateForm({ ...createForm, color: e.target.value }); clearCreateField('color') }}
                  aria-invalid={!!createErrors.color}
                  className="flex-1 font-mono uppercase"
                />
              </div>
              <FieldError message={createErrors.color} />
            </div>

            {createApiErr && <p className="text-xs text-destructive">{createApiErr}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Spinner size="sm" /> : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Category — {editTarget?.label}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="flex flex-col gap-3" noValidate>

            <div className="flex flex-col gap-1.5">
              <Label className="text-muted-foreground text-xs">Slug (read-only)</Label>
              <Input value={editTarget?.id ?? ''} disabled className="font-mono bg-muted/50" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Display Label <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.label}
                onChange={(e) => { setEditForm({ ...editForm, label: e.target.value }); clearEditField('label') }}
                aria-invalid={!!editErrors.label}
              />
              <FieldError message={editErrors.label} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Icon Name <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.icon}
                onChange={(e) => { setEditForm({ ...editForm, icon: e.target.value }); clearEditField('icon') }}
                aria-invalid={!!editErrors.icon}
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {ICON_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setEditForm({ ...editForm, icon: s }); clearEditField('icon') }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <FieldError message={editErrors.icon} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Color <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => { setEditForm({ ...editForm, color: e.target.value }); clearEditField('color') }}
                  className="h-10 w-12 rounded cursor-pointer border border-input"
                />
                <Input
                  placeholder="#FF6B35"
                  value={editForm.color}
                  onChange={(e) => { setEditForm({ ...editForm, color: e.target.value }); clearEditField('color') }}
                  aria-invalid={!!editErrors.color}
                  className="flex-1 font-mono uppercase"
                />
              </div>
              <FieldError message={editErrors.color} />
            </div>

            {editApiErr && <p className="text-xs text-destructive">{editApiErr}</p>}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {deleteTarget && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: deleteTarget.color }}
                >
                  {deleteTarget.label.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{deleteTarget.label}</p>
                  <p className="text-xs text-muted-foreground font-mono">{deleteTarget.id}</p>
                </div>
              </div>
            )}

            {deleteTarget?.course_count > 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <strong>Cannot delete:</strong> {deleteTarget.course_count} course
                {deleteTarget.course_count !== 1 ? 's are' : ' is'} using this category.
                Reassign or delete those courses first.
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Are you sure you want to delete the <strong>{deleteTarget?.label}</strong> category?
              </p>
            )}

            {deleteApiErr && <p className="text-xs text-destructive">{deleteApiErr}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || (deleteTarget?.course_count ?? 0) > 0}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
