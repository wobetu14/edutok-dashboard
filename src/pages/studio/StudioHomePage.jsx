import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, Clock, Users, Clapperboard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/Spinner'
import { FieldError } from '@/components/ui/FieldError'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'
import { cn } from '@/lib/utils'

const inputClass  = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectClass = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const initForm = () => ({
  title:        '',
  description:  '',
  category_ids: [],
  difficulty:   'Beginner',
  visibility:   'private',
})

export default function StudioHomePage() {
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const qc         = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)

  const { data: me } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  () => api.getMe().then((r) => r.data.data),
    initialData: user?.org_memberships ? user : undefined,
  })

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['studio-courses'],
    queryFn:  () => api.listMyCourses({ limit: 50, page: 1 }).then((r) => r.data),
  })

  const courses = coursesData?.data ?? []

  const stats = {
    total:    courses.length,
    approved: courses.filter((c) => c.status === 'approved').length,
    pending:  courses.filter((c) => c.status === 'pending').length,
    rejected: courses.filter((c) => c.status === 'rejected').length,
  }

  const createMutation = useMutation({
    mutationFn: (data) => api.createCourse(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['studio-courses'])
      navigate(`/studio/course/${res.data.data.id}`)
    },
  })

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clapperboard size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Course Creator Studio</h1>
            <p className="text-sm text-muted-foreground">Build and manage your courses</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> New Course
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: stats.total,    color: 'text-foreground' },
          { label: 'Approved',      value: stats.approved, color: 'text-green-600' },
          { label: 'Pending Review',value: stats.pending,  color: 'text-yellow-600' },
          { label: 'Rejected',      value: stats.rejected, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : courses.length === 0 ? (
        <Card className="p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <BookOpen size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first course to get started
            </p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Course
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`/studio/course/${course.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Course Dialog */}
      <CreateCourseDialog
        open={createOpen}
        me={me}
        isPending={createMutation.isPending}
        error={createMutation.error?.response?.data?.message}
        onClose={() => setCreateOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
      />
    </div>
  )
}

function CourseCard({ course, onClick }) {
  const lessons = course.lesson_count ?? course.lessons?.length ?? 0

  // Collect category labels from join table or legacy string field
  const categories = course.course_categories?.length
    ? course.course_categories.map((cc) => cc.category ?? cc)
    : course.category
      ? [{ label: course.category, color: null }]
      : []

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="h-36 bg-muted relative overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen size={32} className="text-primary/30" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge color={COURSE_STATUS[course.status]?.color} className="text-xs shadow">
            {COURSE_STATUS[course.status]?.label}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {categories.slice(0, 3).map((cat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {cat.color && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cat.color }} />
                )}
                {cat.label}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{categories.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={11} /> {lessons} lesson{lessons !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} /> {course.enrolled_count ?? 0} enrolled
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <Badge color={DIFFICULTY[course.difficulty]?.color} className="text-xs">
            {course.difficulty}
          </Badge>
          <Badge color={COURSE_VISIBILITY[course.visibility]?.color} className="text-xs">
            {COURSE_VISIBILITY[course.visibility]?.label}
          </Badge>
        </div>
      </div>
    </Card>
  )
}

function CreateCourseDialog({ open, me, isPending, error, onClose, onSave }) {
  const [form, setForm]     = useState(initForm)
  const [errors, setErrors] = useState({})

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.listCategories().then((r) => r.data.data),
    enabled:  open,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (open) { setForm(initForm()); setErrors({}) }
  }, [open])

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim())         errs.title        = 'Title is required'
    if (!form.category_ids.length)  errs.category_ids = 'Select at least one category'
    if (Object.keys(errs).length)   { setErrors(errs); return }

    const orgId = me?.org_memberships?.[0]?.org?.id
    if (!orgId) { setErrors({ _root: 'No organization found for your account' }); return }

    onSave({
      title:         form.title.trim(),
      description:   form.description || undefined,
      category_ids:  form.category_ids,
      difficulty:    form.difficulty,
      visibility:    form.visibility,
      org_id:        orgId,
      instructor_id: me?.id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Course Title <span className="text-destructive">*</span></label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="e.g. Introduction to Python"
                autoFocus
              />
              <FieldError message={errors.title} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Briefly describe what students will learn…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Categories <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto border border-input rounded-md p-2 bg-background">
                {categories.length === 0
                  ? <span className="text-xs text-muted-foreground col-span-2 text-center py-2">Loading…</span>
                  : categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/40 rounded px-1.5 py-1">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={form.category_ids.includes(cat.id)}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...form.category_ids, cat.id]
                            : form.category_ids.filter((x) => x !== cat.id)
                          setField('category_ids', ids)
                        }}
                      />
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                      <span className="truncate">{cat.label}</span>
                    </label>
                  ))
                }
              </div>
              <FieldError message={errors.category_ids} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Difficulty</label>
                <select className={selectClass} value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Visibility</label>
                <select className={selectClass} value={form.visibility} onChange={(e) => setField('visibility', e.target.value)}>
                  <option value="private">Private (Draft)</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
              Your course will be created as a draft. Add lessons, then submit for review when ready.
            </p>

            {(error || errors._root) && (
              <p className="text-xs text-destructive">{error ?? errors._root}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Create Course'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
