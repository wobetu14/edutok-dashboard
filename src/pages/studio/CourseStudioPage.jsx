import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Clapperboard, Settings, Plus, ChevronUp, ChevronDown,
  Trash2, FileText, ImageIcon, Video, Send, Check, X, AlertCircle,
  Upload, Loader2, BookOpen, LayoutList,
  Heart, Bookmark, MessageCircle, CornerDownRight, Share2, TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/Spinner'
import { FieldError } from '@/components/ui/FieldError'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'
import { cn } from '@/lib/utils'
import { z } from 'zod'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function formatCount(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function lessonEng(lesson) {
  const replies  = lesson.replies_count  ?? 0
  const comments = Math.max(0, (lesson.comments_count ?? 0) - replies)
  return {
    likes:    lesson.likes_count   ?? 0,
    saves:    lesson.saves_count   ?? 0,
    comments,
    replies,
    shares:   lesson.shares_count  ?? 0,
  }
}

const inputClass  = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectClass = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const LESSON_TYPE_ICON = {
  text:  <FileText size={13} className="text-blue-500" />,
  image: <ImageIcon size={13} className="text-green-500" />,
  video: <Video size={13} className="text-purple-500" />,
}

function formatDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m${s > 0 ? ` ${s}s` : ''}` : `${s}s`
}

// ── Lesson form helpers ────────────────────────────────────────────────────────

const initLessonForm = (lesson) => {
  const base = {
    title:            lesson?.title ?? '',
    type:             lesson?.type  ?? 'text',
    duration_secs:    lesson?.duration_secs ?? 0,
    text_body:        '',
    image_items:      [{ uri: '', caption: '' }],
    video_source:     'cloudinary',  // 'cloudinary' | 'youtube'
    video_url:        '',
    video_youtube_id: '',
  }
  if (lesson?.content_json) {
    const c = lesson.content_json
    if (lesson.type === 'text')  base.text_body = c.body ?? ''
    if (lesson.type === 'image') base.image_items = Array.isArray(c) && c.length > 0 ? c : [{ uri: '', caption: '' }]
    if (lesson.type === 'video') {
      if (c.youtubeId) { base.video_source = 'youtube'; base.video_youtube_id = c.youtubeId }
      else if (c.url)  { base.video_source = 'cloudinary'; base.video_url = c.url }
    }
  }
  return base
}

const buildContentJson = (form) => {
  switch (form.type) {
    case 'text':  return { body: form.text_body }
    case 'image': return form.image_items.filter((i) => i.uri.trim())
    case 'video':
      return form.video_source === 'youtube'
        ? { youtubeId: form.video_youtube_id.trim() }
        : { url: form.video_url.trim() }
    default: return {}
  }
}

const lessonSchema = z.object({
  title:         z.string().min(1, 'Title is required').max(200),
  duration_secs: z.number().int().min(0),
})

// ── Quiz form helpers ──────────────────────────────────────────────────────────

const initQuizForm = (type, existingQuiz) => {
  if (type === 'truefalse') {
    return { type, questions: existingQuiz?.questions_json ?? [{ question: '', answer: true }] }
  }
  if (type === 'multipleChoice') {
    return { type, questions: existingQuiz?.questions_json ?? [{ question: '', options: ['', ''], answer: '' }] }
  }
  if (type === 'imageMatching') {
    return { type, questions: existingQuiz?.questions_json ?? [{ pairs: [{ image: '', label: '' }, { image: '', label: '' }] }] }
  }
  return { type, questions: [] }
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CourseStudioPage() {
  const { courseId }  = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const qc            = useQueryClient()

  const [selected, setSelected]       = useState('settings') // 'settings' | lessonId
  const [addLessonOpen, setAddLesson] = useState(false)
  const [deleteLessonId, setDeleteId] = useState(null)
  const [submitConfirm, setSubmitConfirm] = useState(false)
  const [mobileTab, setMobileTab]     = useState('outline')  // 'outline' | 'editor'

  const { data: course, isLoading } = useQuery({
    queryKey: ['studio-course', courseId],
    queryFn:  () => api.getCourse(courseId).then((r) => r.data.data),
  })

  const invalidate = () => {
    qc.invalidateQueries(['studio-course', courseId])
    qc.invalidateQueries(['studio-courses'])
  }

  const sortedLessons = [...(course?.lessons ?? [])].sort((a, b) => a.order_index - b.order_index)

  // Auto-select first lesson when course loads and no lesson is selected
  useEffect(() => {
    if (selected !== 'settings' && course) {
      const stillExists = sortedLessons.some((l) => l.id === selected)
      if (!stillExists && sortedLessons.length > 0) {
        setSelected(sortedLessons[0].id)
      } else if (!stillExists) {
        setSelected('settings')
      }
    }
  }, [course])

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateCourseMutation = useMutation({
    mutationFn: (data) => api.updateCourse(courseId, data),
    onSuccess:  invalidate,
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitCourse(courseId),
    onSuccess:  () => { invalidate(); setSubmitConfirm(false) },
  })

  const createLessonMutation = useMutation({
    mutationFn: (data) => api.createLesson(data),
    onSuccess: (res) => {
      invalidate()
      setAddLesson(false)
      setSelected(res.data.data.id)
      setMobileTab('editor')
    },
  })

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, ...data }) => api.updateLesson(lessonId, data),
    onSuccess:  (_, { lessonId }) => {
      invalidate()
      qc.invalidateQueries(['lesson-content', lessonId])
    },
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => api.deleteLesson(lessonId),
    onSuccess: (_, lessonId) => {
      qc.removeQueries(['lesson-content', lessonId])
      invalidate()
      setDeleteId(null)
      setSelected(sortedLessons.find((l) => l.id !== deleteLessonId)?.id ?? 'settings')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (data) => api.reorderLessons(data),
    onSuccess:  invalidate,
  })

  const moveLesson = (lessonId, dir) => {
    const idx = sortedLessons.findIndex((l) => l.id === lessonId)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === sortedLessons.length - 1) return
    const newList = [...sortedLessons]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    ;[newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]]
    reorderMutation.mutate({ course_id: courseId, items: newList.map((l, i) => ({ id: l.id, order_index: i })) })
  }

  // ── Access ───────────────────────────────────────────────────────────────────

  const canManage = !!course &&
    (course.status === 'draft' || course.status === 'rejected' || course.status === 'approved') &&
    course.instructor_id === user?.id
  const canSubmit = canManage && course?.status === 'draft' && sortedLessons.length > 0

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center py-32"><Spinner /></div>
  )
  if (!course) return (
    <div className="text-center py-32 text-muted-foreground">Course not found.</div>
  )

  const selectedLesson = sortedLessons.find((l) => l.id === selected) ?? null

  return (
    <div className="flex flex-col -mx-6 -mb-6">

      {/* ── Studio Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card sticky top-0 z-20">
        <Link
          to="/studio"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Studio</span>
        </Link>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clapperboard size={15} className="text-primary shrink-0" />
          <h1 className="text-sm font-semibold text-foreground truncate">{course.title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge color={COURSE_STATUS[course.status]?.color} className="text-xs hidden sm:inline-flex">
            {COURSE_STATUS[course.status]?.label}
          </Badge>

          {canSubmit && (
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setSubmitConfirm(true)}>
              <Send size={12} /> Submit for Review
            </Button>
          )}
          {course.status === 'rejected' && canManage && (
            <Button
              size="sm" variant="outline" className="gap-1.5 text-xs h-8"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? <Spinner size="sm" /> : <><Send size={12} /> Re-submit</>}
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile tab switcher ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-border lg:hidden">
        {[
          { key: 'outline', label: 'Outline', icon: <LayoutList size={13} /> },
          { key: 'editor',  label: 'Editor',  icon: <BookOpen size={13} /> },
        ].map((t) => (
          <button
            key={t.key}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors',
              mobileTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground',
            )}
            onClick={() => setMobileTab(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Two-panel body ─────────────────────────────────────────────────────── */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 3.5rem - 2.875rem)' }}>

        {/* ── Left: Course Outline ──────────────────────────────────────────────── */}
        <aside className={cn(
          'w-[30%] shrink-0 border-r border-border flex flex-col bg-card h-full',
          'lg:flex',
          mobileTab === 'outline' ? 'flex' : 'hidden',
        )}>
          {/* Outline header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Course Outline
            </span>
            <span className="text-xs text-muted-foreground">{sortedLessons.length} lessons</span>
          </div>

          {/* Scrollable outline content */}
          <div className="flex-1 overflow-y-auto">
            {/* Course Settings entry */}
            <button
              onClick={() => { setSelected('settings'); setMobileTab('editor') }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border',
                selected === 'settings'
                  ? 'bg-primary/8 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <Settings size={14} className="shrink-0" />
              <span className="text-sm font-medium">Course Settings</span>
            </button>

            {/* Lessons list */}
            <div className="py-1">
              {sortedLessons.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">No lessons yet.</p>
                  <p className="text-xs text-muted-foreground">Add your first lesson below.</p>
                </div>
              ) : sortedLessons.map((lesson, idx) => (
                <LessonOutlineItem
                  key={lesson.id}
                  lesson={lesson}
                  idx={idx}
                  total={sortedLessons.length}
                  isSelected={selected === lesson.id}
                  isReordering={reorderMutation.isPending}
                  onSelect={() => { setSelected(lesson.id); setMobileTab('editor') }}
                  onMove={(dir) => moveLesson(lesson.id, dir)}
                  onDelete={() => setDeleteId(lesson.id)}
                />
              ))}
            </div>
          </div>

          {/* Add Lesson button (fixed at bottom of sidebar) */}
          {canManage && (
            <div className="p-3 border-t border-border">
              <Button
                variant="outline" size="sm" className="w-full gap-2 text-xs"
                onClick={() => setAddLesson(true)}
              >
                <Plus size={13} /> Add Lesson
              </Button>
            </div>
          )}
        </aside>

        {/* ── Right: Editor panel ───────────────────────────────────────────────── */}
        <main className={cn(
          'flex-1 overflow-y-auto',
          mobileTab === 'editor' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
        )}>
          {course.status === 'pending' && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs shrink-0">
              <AlertCircle size={13} className="shrink-0" />
              <span>This course is <strong>under review</strong>. Editing is locked until the review is complete.</span>
            </div>
          )}
          {course.status === 'approved' && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs shrink-0">
              <AlertCircle size={13} className="shrink-0" />
              <span>This course is <strong>approved and published</strong>. Saving any change will resubmit it for review and notify the org admin.</span>
            </div>
          )}
          {course.status === 'rejected' && (
            <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs shrink-0">
              <X size={13} className="shrink-0" />
              <span>This course was <strong>rejected</strong>. Update the content and re-submit for review.</span>
            </div>
          )}
          {selected === 'settings' ? (
            <CourseSettingsPanel
              course={course}
              canManage={canManage}
              isPending={updateCourseMutation.isPending}
              error={updateCourseMutation.error?.response?.data?.message}
              onSave={(data) => updateCourseMutation.mutate(data)}
            />
          ) : selectedLesson ? (
            <LessonEditorPanel
              key={selectedLesson.id}
              courseId={courseId}
              lesson={selectedLesson}
              canManage={canManage}
              isSaving={updateLessonMutation.isPending}
              saveError={updateLessonMutation.error?.response?.data?.message}
              onSave={(data) => updateLessonMutation.mutate({ lessonId: selectedLesson.id, ...data })}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-12">
              Select a lesson or course settings from the outline.
            </div>
          )}
        </main>
      </div>

      {/* ── Add Lesson Dialog ─────────────────────────────────────────────────── */}
      {addLessonOpen && (
        <AddLessonDialog
          courseId={courseId}
          isPending={createLessonMutation.isPending}
          error={createLessonMutation.error?.response?.data?.message}
          onClose={() => setAddLesson(false)}
          onSave={(data) => createLessonMutation.mutate({ course_id: courseId, ...data })}
        />
      )}

      {/* ── Delete Lesson Confirmation ────────────────────────────────────────── */}
      <Dialog open={!!deleteLessonId} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Lesson</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground py-2">
            Delete <span className="font-medium">
              "{sortedLessons.find((l) => l.id === deleteLessonId)?.title}"
            </span>? This also deletes any quiz attached to it and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteLessonMutation.isPending}
              onClick={() => deleteLessonMutation.mutate(deleteLessonId)}
            >
              {deleteLessonMutation.isPending ? <Spinner size="sm" /> : 'Delete Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit for Review Confirmation ────────────────────────────────────── */}
      <Dialog open={submitConfirm} onOpenChange={(o) => { if (!o) setSubmitConfirm(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Submit for Review</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground py-2">
            Submit <span className="font-medium">"{course.title}"</span> for review?
            An org admin will review and approve or reject it.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirm(false)}>Cancel</Button>
            <Button
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? <Spinner size="sm" /> : 'Submit for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Lesson outline item ────────────────────────────────────────────────────────

function LessonOutlineItem({ lesson, idx, total, isSelected, isReordering, onSelect, onMove, onDelete }) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors',
        isSelected ? 'bg-primary/8 text-primary' : 'hover:bg-muted/50',
      )}
      onClick={onSelect}
    >
      <span className="text-xs text-muted-foreground w-5 text-right shrink-0 font-mono">
        {idx + 1}
      </span>
      <span className="shrink-0">{LESSON_TYPE_ICON[lesson.type]}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isSelected ? 'font-medium' : 'text-foreground')}>
          {lesson.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {lesson.has_quiz && (
            <span className="text-xs text-primary/70">+ quiz</span>
          )}
          {(() => {
            const e = lessonEng(lesson)
            const total = e.likes + e.saves + e.comments + e.replies + e.shares
            if (total === 0) return null
            return (
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart size={9} className="text-rose-400" /> {formatCount(e.likes)}</span>
                <span className="flex items-center gap-0.5"><Bookmark size={9} className="text-amber-400" /> {formatCount(e.saves)}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={9} className="text-blue-400" /> {formatCount(e.comments)}</span>
                <span className="flex items-center gap-0.5"><CornerDownRight size={9} className="text-indigo-400" /> {formatCount(e.replies)}</span>
                <span className="flex items-center gap-0.5"><Share2 size={9} className="text-green-400" /> {formatCount(e.shares)}</span>
              </span>
            )
          })()}
        </div>
      </div>
      <div
        className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={idx === 0 || isReordering}
          onClick={() => onMove('up')}
        >
          <ChevronUp size={12} />
        </button>
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
          disabled={idx === total - 1 || isReordering}
          onClick={() => onMove('down')}
        >
          <ChevronDown size={12} />
        </button>
        <button
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Course Settings Panel ──────────────────────────────────────────────────────

function CourseSettingsPanel({ course, canManage, isPending, error, onSave }) {
  const [form, setForm]         = useState(null)
  const [errors, setErrors]     = useState({})
  const [thumbUploading, setThumbUploading] = useState(false)
  const [thumbError, setThumbError]         = useState('')
  const fileRef = useRef(null)

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.listCategories().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (course) {
      setForm({
        title:        course.title,
        description:  course.description ?? '',
        thumbnail_url: course.thumbnail_url ?? '',
        category_ids: (course.categories ?? []).map((c) => c.id),
        difficulty:   course.difficulty,
        visibility:   course.visibility,
      })
      setErrors({})
    }
  }, [course.id])

  if (!form) return null

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbError('')
    setThumbUploading(true)
    try {
      const res = await api.uploadCourseThumbnail(file)
      setField('thumbnail_url', res.data.data.url)
    } catch (err) {
      setThumbError(err.response?.data?.message ?? 'Upload failed')
    } finally {
      setThumbUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSave = () => {
    const errs = {}
    if (!form.title?.trim())        errs.title        = 'Title is required'
    if (!form.category_ids?.length) errs.category_ids = 'Select at least one category'
    if (Object.keys(errs).length)   { setErrors(errs); return }
    onSave({
      title:         form.title.trim(),
      description:   form.description || undefined,
      thumbnail_url: form.thumbnail_url || undefined,
      category_ids:  form.category_ids,
      difficulty:    form.difficulty,
      visibility:    form.visibility,
    })
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Course Settings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your course details and metadata</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={handleSave} disabled={isPending} className="gap-1.5">
            {isPending ? <Spinner size="sm" /> : <><Check size={13} /> Save</>}
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Course Thumbnail</label>
        <div className="flex gap-4 items-start">
          <div className="w-40 h-24 rounded-lg border border-border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
            {form.thumbnail_url ? (
              <img src={form.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
            ) : (
              <BookOpen size={24} className="text-muted-foreground/40" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleThumbnailUpload}
            />
            <Button
              type="button" variant="outline" size="sm" className="gap-2"
              disabled={!canManage || thumbUploading}
              onClick={() => fileRef.current?.click()}
            >
              {thumbUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {thumbUploading ? 'Uploading…' : 'Upload Image'}
            </Button>
            <p className="text-xs text-muted-foreground">JPEG, PNG or WebP · Max 10 MB</p>
            {thumbError && <p className="text-xs text-destructive">{thumbError}</p>}
            {form.thumbnail_url && canManage && (
              <button
                type="button"
                className="text-xs text-destructive hover:underline text-left"
                onClick={() => setField('thumbnail_url', '')}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
        <input
          className={inputClass}
          value={form.title}
          disabled={!canManage}
          onChange={(e) => setField('title', e.target.value)}
        />
        <FieldError message={errors.title} />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          rows={4}
          value={form.description}
          disabled={!canManage}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="What will students learn in this course?"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Categories <span className="text-destructive">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-40 overflow-y-auto border border-input rounded-md p-2 bg-background">
          {allCategories.length === 0
            ? <span className="text-xs text-muted-foreground col-span-3 text-center py-2">Loading…</span>
            : allCategories.map((cat) => (
              <label key={cat.id} className={cn(
                'flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/40 rounded px-1.5 py-1',
                !canManage && 'pointer-events-none opacity-60',
              )}>
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={(form.category_ids ?? []).includes(cat.id)}
                  onChange={(e) => {
                    if (!canManage) return
                    const ids = e.target.checked
                      ? [...(form.category_ids ?? []), cat.id]
                      : (form.category_ids ?? []).filter((x) => x !== cat.id)
                    setField('category_ids', ids)
                  }}
                />
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="truncate text-xs">{cat.label}</span>
              </label>
            ))
          }
        </div>
        <FieldError message={errors.category_ids} />
      </div>

      {/* Difficulty + Visibility */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Difficulty</label>
          <select
            className={cn(selectClass, !canManage && 'opacity-60')}
            value={form.difficulty}
            disabled={!canManage}
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
            className={cn(selectClass, !canManage && 'opacity-60')}
            value={form.visibility}
            disabled={!canManage}
            onChange={(e) => setField('visibility', e.target.value)}
          >
            <option value="private">Private (Draft)</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      {/* Status info */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 text-sm">
        <div>
          <span className="font-medium">Status: </span>
          <Badge color={COURSE_STATUS[course.status]?.color}>
            {COURSE_STATUS[course.status]?.label}
          </Badge>
        </div>
        {course.status === 'rejected' && course.rejection_reason && (
          <p className="text-xs text-destructive ml-2">Reason: {course.rejection_reason}</p>
        )}
      </div>
    </div>
  )
}

// ── Lesson Editor Panel ────────────────────────────────────────────────────────

function LessonEditorPanel({ courseId, lesson, canManage, isSaving, saveError, onSave }) {
  const qc = useQueryClient()
  const [form, setForm]       = useState(null)   // null until full lesson data loads
  const [errors, setErrors]   = useState({})
  const [saved, setSaved]     = useState(false)

  // Fetch the full lesson including content_json — getCourse omits it for brevity
  const { data: fullLesson, isLoading: contentLoading } = useQuery({
    queryKey: ['lesson-content', lesson.id],
    queryFn:  () => api.getLesson(lesson.id).then((r) => r.data.data),
    staleTime: 30_000,
  })

  // Initialise the form once the full lesson data arrives
  useEffect(() => {
    if (fullLesson) {
      setForm(initLessonForm(fullLesson))
      setErrors({})
    }
  }, [fullLesson?.id])

  // Quiz section state
  const [quizOpen, setQuizOpen]     = useState(false)
  const [quizMode, setQuizMode]     = useState('view')  // 'view' | 'edit' | 'create'
  const [quizForm, setQuizForm]     = useState(null)
  const [qError, setQError]         = useState('')
  const [deleteQuizConfirm, setDeleteQuizConfirm] = useState(false)

  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', lesson.id],
    queryFn:  () => api.getQuizByLesson(lesson.id).then((r) => r.data.data),
    enabled:  !!lesson.has_quiz && quizOpen,
  })

  const invalidateLesson = () => {
    qc.invalidateQueries(['studio-course', courseId])
    qc.invalidateQueries(['lesson-content', lesson.id])
    qc.invalidateQueries(['quiz', lesson.id])
  }

  const createQuizMutation = useMutation({
    mutationFn: (data) => api.createQuiz(data),
    onSuccess: () => { invalidateLesson(); setQuizMode('view') },
  })

  const updateQuizMutation = useMutation({
    mutationFn: ({ quizId, ...data }) => api.updateQuiz(quizId, data),
    onSuccess: () => { invalidateLesson(); setQuizMode('view') },
  })

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId) => api.deleteQuiz(quizId),
    onSuccess: () => { invalidateLesson(); setQuizOpen(false); setQuizMode('view'); setDeleteQuizConfirm(false) },
  })

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSaved(false)
  }

  const handleSave = () => {
    const result = lessonSchema.safeParse({ title: form.title, duration_secs: Number(form.duration_secs) || 0 })
    if (!result.success) {
      const errs = {}
      result.error.issues.forEach((i) => { if (i.path[0]) errs[i.path[0]] = i.message })
      setErrors(errs)
      return
    }
    if (form.type === 'text' && !form.text_body.trim()) {
      setErrors({ text_body: 'Content is required' }); return
    }
    if (form.type === 'video') {
      if (form.video_source === 'youtube' && form.video_youtube_id.trim().length !== 11) {
        setErrors({ video_youtube_id: 'YouTube ID must be exactly 11 characters' }); return
      }
      if (form.video_source === 'cloudinary' && !form.video_url.trim()) {
        setErrors({ video_url: 'Please upload a video first' }); return
      }
    }
    if (form.type === 'image' && !form.image_items.some((i) => i.uri.trim())) {
      setErrors({ image_items: 'At least one image is required' }); return
    }
    onSave({
      title:         result.data.title,
      content_json:  buildContentJson(form),
      duration_secs: result.data.duration_secs,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // Quiz form helpers
  const updateQ = (qi, field, value) =>
    setQuizForm((prev) => ({ ...prev, questions: prev.questions.map((q, i) => i === qi ? { ...q, [field]: value } : q) }))

  const addQ = () => {
    const blank = quizForm.type === 'truefalse'
      ? { question: '', answer: true }
      : quizForm.type === 'multipleChoice'
        ? { question: '', options: ['', ''], answer: '' }
        : { pairs: [{ image: '', label: '' }, { image: '', label: '' }] }
    setQuizForm((prev) => ({ ...prev, questions: [...prev.questions, blank] }))
  }

  const removeQ = (qi) =>
    setQuizForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qi) }))

  const updateOption = (qi, oi, val) =>
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i !== qi) return q
        const options = q.options.map((o, j) => j === oi ? val : o)
        const answer  = q.answer === q.options[oi] ? val : q.answer
        return { ...q, options, answer }
      }),
    }))

  const handleSaveQuiz = () => {
    setQError('')
    if (!quizForm?.questions?.length) { setQError('Add at least one question'); return }
    const payload = { type: quizForm.type, questions_json: quizForm.questions }
    if (quizMode === 'create') createQuizMutation.mutate({ lesson_id: lesson.id, ...payload })
    else updateQuizMutation.mutate({ quizId: quizData.id, questions_json: quizForm.questions })
  }

  const openQuiz = () => {
    setQuizOpen(true)
    if (!lesson.has_quiz) {
      setQuizMode('create')
      setQuizForm(initQuizForm('truefalse', null))
    } else {
      setQuizMode('view')
    }
  }

  // Show spinner while content_json is loading (getCourse omits it)
  if (contentLoading || !form) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Lesson editor header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{LESSON_TYPE_ICON[lesson.type]}</span>
          <span className="text-xs text-muted-foreground capitalize shrink-0">{lesson.type}</span>
          <span className="text-xs text-border mx-1">·</span>
          <span className="text-xs text-muted-foreground truncate">
            Lesson {lesson.order_index + 1}
          </span>
        </div>
        {canManage && (
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            {isSaving ? <Spinner size="sm" />
              : saved ? <><Check size={13} /> Saved</>
              : <>Save</>}
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-2xl">

        {saveError && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle size={14} /> {saveError}
          </div>
        )}

        {/* Engagement stats — data is already in lesson prop from getCourse */}
        {(() => {
          const e = lessonEng(lesson)
          const total = e.likes + e.saves + e.comments + e.replies + e.shares
          const METRICS = [
            { key: 'likes',    label: 'Likes',    Icon: Heart,           color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-950/30' },
            { key: 'saves',    label: 'Saves',    Icon: Bookmark,        color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { key: 'comments', label: 'Comments', Icon: MessageCircle,   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { key: 'replies',  label: 'Replies',  Icon: CornerDownRight, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            { key: 'shares',   label: 'Shares',   Icon: Share2,          color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/30' },
          ]
          return (
            <div className="flex flex-col gap-2.5 pb-1 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp size={12} /> Engagement
              </p>
              <div className="grid grid-cols-5 gap-2">
                {METRICS.map(({ key, label, Icon, color, bg }) => (
                  <div key={key} className={cn('flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border border-border', bg)}>
                    <Icon size={13} className={color} />
                    <span className="text-sm font-bold text-foreground tabular-nums">{formatCount(e[key])}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">{label}</span>
                  </div>
                ))}
              </div>
              {total === 0 && (
                <p className="text-xs text-muted-foreground">No engagement yet — stats appear once students interact with this lesson.</p>
              )}
            </div>
          )
        })()}

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Lesson Title <span className="text-destructive">*</span></label>
          <input
            className={inputClass}
            value={form.title}
            disabled={!canManage}
            onChange={(e) => setField('title', e.target.value)}
            placeholder="Enter lesson title…"
          />
          <FieldError message={errors.title} />
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5 max-w-[200px]">
          <label className="text-sm font-medium">Duration (seconds)</label>
          <input
            type="number"
            className={inputClass}
            value={form.duration_secs}
            min={0}
            max={180}
            disabled={!canManage}
            onChange={(e) => setField('duration_secs', Number(e.target.value))}
          />
          {form.duration_secs > 0 && (
            <p className="text-xs text-muted-foreground">{formatDuration(Number(form.duration_secs))}</p>
          )}
        </div>

        {/* Type badge (read-only, locked after creation) */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Type:</span>
          <span className="px-2 py-0.5 bg-muted rounded-md capitalize">{lesson.type}</span>
          <span className="text-muted-foreground/60">(cannot be changed after creation)</span>
        </div>

        {/* Content — text */}
        {form.type === 'text' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Content <span className="text-destructive">*</span></label>
            <textarea
              className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              rows={10}
              value={form.text_body}
              disabled={!canManage}
              onChange={(e) => setField('text_body', e.target.value)}
              placeholder="Write your lesson content here…"
            />
            <p className="text-xs text-muted-foreground">{form.text_body.length} characters</p>
            <FieldError message={errors.text_body} />
          </div>
        )}

        {/* Content — video */}
        {form.type === 'video' && (
          <VideoEditor form={form} setField={setField} errors={errors} canManage={canManage} />
        )}

        {/* Content — image */}
        {form.type === 'image' && (
          <ImageEditor form={form} setField={setField} errors={errors} canManage={canManage} />
        )}

        {/* ── Quiz Section ────────────────────────────────────────────────────── */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Quiz</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lesson.has_quiz
                  ? 'A quiz is attached to this lesson'
                  : 'Optional quiz shown to students after this lesson'}
              </p>
            </div>
            {lesson.has_quiz ? (
              <button
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
                onClick={openQuiz}
              >
                {quizOpen ? 'Hide Quiz' : 'View / Edit Quiz'}
              </button>
            ) : canManage ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={openQuiz}>
                <Plus size={12} /> Add Quiz
              </Button>
            ) : null}
          </div>

          {/* Quiz panel */}
          {quizOpen && (
            <div className="border border-border rounded-lg p-4 bg-muted/20 flex flex-col gap-4">
              {quizLoading && lesson.has_quiz ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : (

                <>
                  {/* View mode */}
                  {quizMode === 'view' && quizData && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <Badge color="bg-primary/10 text-primary">
                          {quizData.type === 'truefalse' ? 'True / False'
                            : quizData.type === 'multipleChoice' ? 'Multiple Choice'
                            : 'Image Matching'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {quizData.questions_json?.length} question{quizData.questions_json?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {(quizData.questions_json ?? []).map((q, i) => (
                          <div key={i} className="text-xs border border-border rounded p-2 bg-background">
                            {quizData.type !== 'imageMatching' && (
                              <p className="font-medium">{i + 1}. {q.question}</p>
                            )}
                            {quizData.type === 'truefalse' && (
                              <p className="text-muted-foreground mt-0.5">Answer: <strong>{q.answer ? 'True' : 'False'}</strong></p>
                            )}
                            {quizData.type === 'multipleChoice' && (
                              <div className="mt-1">
                                {(q.options ?? []).map((opt, j) => (
                                  <span key={j} className={cn('block px-1', opt === q.answer && 'text-green-600 font-semibold')}>
                                    {opt === q.answer ? '✓ ' : '  '}{opt}
                                  </span>
                                ))}
                              </div>
                            )}
                            {quizData.type === 'imageMatching' && (
                              <div className="flex flex-col gap-0.5">
                                {(q.pairs ?? []).map((p, j) => (
                                  <span key={j} className="flex gap-2">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{p.image}</span>
                                    <span>→</span>
                                    <span className="font-medium">{p.label}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {canManage && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm" variant="outline" className="text-xs gap-1"
                            onClick={() => { setQuizMode('edit'); setQuizForm(initQuizForm(quizData.type, quizData)) }}
                          >
                            Edit Quiz
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => setDeleteQuizConfirm(true)}
                          >
                            Delete Quiz
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Create / Edit mode */}
                  {(quizMode === 'create' || quizMode === 'edit') && quizForm && (
                    <div className="flex flex-col gap-4">
                      {/* Type selector */}
                      {quizMode === 'create' ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium">Quiz Type</label>
                          <select
                            className={selectClass}
                            value={quizForm.type}
                            onChange={(e) => setQuizForm(initQuizForm(e.target.value, null))}
                          >
                            <option value="truefalse">True / False</option>
                            <option value="multipleChoice">Multiple Choice</option>
                            <option value="imageMatching">Image Matching</option>
                          </select>
                        </div>
                      ) : (
                        <Badge color="bg-muted text-foreground" className="self-start text-xs">
                          {quizForm.type === 'truefalse' ? 'True / False'
                            : quizForm.type === 'multipleChoice' ? 'Multiple Choice'
                            : 'Image Matching'}
                        </Badge>
                      )}

                      {/* Questions */}
                      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-0.5">
                        {quizForm.questions.map((q, qi) => (
                          <QuizQuestionRow
                            key={qi}
                            q={q}
                            qi={qi}
                            type={quizForm.type}
                            canRemove={quizForm.questions.length > 1}
                            onUpdate={updateQ}
                            onRemove={removeQ}
                            onUpdateOption={updateOption}
                            onAddOption={(qi2) => setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) =>
                                i !== qi2 ? qq : { ...qq, options: [...qq.options, ''] }
                              ),
                            }))}
                            onRemoveOption={(qi2, oi) => setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) => {
                                if (i !== qi2) return qq
                                const options = qq.options.filter((_, j) => j !== oi)
                                const answer  = qq.answer === qq.options[oi] ? '' : qq.answer
                                return { ...qq, options, answer }
                              }),
                            }))}
                            onUpdatePair={(qi2, pi, field, val) => setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) =>
                                i !== qi2 ? qq : {
                                  ...qq,
                                  pairs: qq.pairs.map((p, j) => j === pi ? { ...p, [field]: val } : p),
                                }
                              ),
                            }))}
                            onAddPair={(qi2) => setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) =>
                                i !== qi2 ? qq : { ...qq, pairs: [...qq.pairs, { image: '', label: '' }] }
                              ),
                            }))}
                            onRemovePair={(qi2, pi) => setQuizForm((prev) => ({
                              ...prev,
                              questions: prev.questions.map((qq, i) =>
                                i !== qi2 ? qq : { ...qq, pairs: qq.pairs.filter((_, j) => j !== pi) }
                              ),
                            }))}
                          />
                        ))}
                      </div>

                      {quizForm.questions.length < 20 && (
                        <Button type="button" variant="outline" size="sm" className="self-start gap-1 text-xs" onClick={addQ}>
                          <Plus size={11} /> Add Question
                        </Button>
                      )}

                      {qError && <p className="text-xs text-destructive">{qError}</p>}

                      <div className="flex gap-2 pt-1">
                        {quizMode === 'edit' && (
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setQuizMode('view')}>
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button" size="sm"
                          disabled={createQuizMutation.isPending || updateQuizMutation.isPending}
                          onClick={handleSaveQuiz}
                        >
                          {(createQuizMutation.isPending || updateQuizMutation.isPending)
                            ? <Spinner size="sm" />
                            : quizMode === 'create' ? 'Create Quiz' : 'Save Quiz'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Delete quiz confirmation */}
                  {deleteQuizConfirm && (
                    <div className="flex flex-col gap-3 border border-destructive/30 rounded p-3 bg-destructive/5">
                      <p className="text-sm text-foreground">Delete this quiz? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => setDeleteQuizConfirm(false)}>Cancel</Button>
                        <Button
                          variant="destructive" size="sm" className="text-xs"
                          disabled={deleteQuizMutation.isPending}
                          onClick={() => deleteQuizMutation.mutate(quizData.id)}
                        >
                          {deleteQuizMutation.isPending ? <Spinner size="sm" /> : 'Delete Quiz'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Image editor (Cloudinary upload per image slot) ───────────────────────────

function ImageEditor({ form, setField, errors, canManage }) {
  const [uploading, setUploading] = useState({})  // { index: true/false }
  const [uploadErrors, setUploadErrors] = useState({})
  const fileRefs = useRef({})

  const uploadImage = async (i, file) => {
    if (!file) return
    setUploading((prev) => ({ ...prev, [i]: true }))
    setUploadErrors((prev) => ({ ...prev, [i]: '' }))
    try {
      const res = await api.uploadLessonImage(file)
      const url = res.data.data.url
      const items = [...form.image_items]
      items[i] = { ...items[i], uri: url }
      setField('image_items', items)
    } catch (err) {
      setUploadErrors((prev) => ({ ...prev, [i]: err.response?.data?.message ?? 'Upload failed' }))
    } finally {
      setUploading((prev) => ({ ...prev, [i]: false }))
      if (fileRefs.current[i]) fileRefs.current[i].value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium">Images <span className="text-destructive">*</span></label>
      {form.image_items.map((item, i) => (
        <div key={i} className="border border-border rounded-lg p-3 bg-muted/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Image {i + 1}</span>
            {canManage && form.image_items.length > 1 && (
              <button
                type="button"
                className="text-xs text-destructive hover:underline"
                onClick={() => setField('image_items', form.image_items.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            )}
          </div>

          {/* Upload area */}
          <div className="flex gap-3 items-start">
            {/* Preview */}
            <div className="w-20 h-20 rounded-md border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
              {item.uri ? (
                <img src={item.uri} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={20} className="text-muted-foreground/40" />
              )}
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <input
                ref={(el) => { fileRefs.current[i] = el }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => uploadImage(i, e.target.files?.[0])}
              />
              <Button
                type="button" variant="outline" size="sm" className="gap-2 self-start"
                disabled={!canManage || uploading[i]}
                onClick={() => fileRefs.current[i]?.click()}
              >
                {uploading[i] ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading[i] ? 'Uploading…' : item.uri ? 'Replace' : 'Upload Image'}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF · Max 10 MB</p>
              {uploadErrors[i] && <p className="text-xs text-destructive">{uploadErrors[i]}</p>}
            </div>
          </div>

          {/* Caption */}
          <input
            className={inputClass}
            value={item.caption ?? ''}
            disabled={!canManage}
            onChange={(e) => {
              const items = [...form.image_items]
              items[i] = { ...items[i], caption: e.target.value }
              setField('image_items', items)
            }}
            placeholder="Caption (optional)"
          />
        </div>
      ))}

      {canManage && form.image_items.length < 20 && (
        <Button
          type="button" variant="outline" size="sm" className="self-start gap-1.5"
          onClick={() => setField('image_items', [...form.image_items, { uri: '', caption: '' }])}
        >
          <Plus size={12} /> Add Another Image
        </Button>
      )}
      <FieldError message={errors.image_items} />
    </div>
  )
}

// ── Video editor (Cloudinary upload OR YouTube embed) ─────────────────────────

function VideoEditor({ form, setField, errors, canManage }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)
  const fileRef = useRef(null)

  const uploadVideo = async (file) => {
    if (!file) return
    setUploadError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const res = await api.uploadLessonVideo(file)
      setField('video_url', res.data.data.url)
    } catch (err) {
      setUploadError(err.response?.data?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Source toggle */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Video Source</label>
        <div className="flex gap-2">
          {[
            { value: 'cloudinary', label: 'Upload File' },
            { value: 'youtube',   label: 'YouTube ID' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={!canManage}
              onClick={() => { setField('video_source', opt.value); setUploadError('') }}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium border transition-colors',
                form.video_source === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-input text-muted-foreground hover:border-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cloudinary upload */}
      {form.video_source === 'cloudinary' && (
        <div className="flex flex-col gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            className="hidden"
            onChange={(e) => uploadVideo(e.target.files?.[0])}
          />

          {form.video_url ? (
            <div className="flex flex-col gap-2">
              <video
                src={form.video_url}
                controls
                className="w-full max-w-sm rounded-lg border border-border bg-black"
                style={{ maxHeight: '200px' }}
              />
              {canManage && (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-2"
                    disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    Replace Video
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setField('video_url', '')}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div
              className={cn(
                'border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 transition-colors',
                canManage && 'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
              )}
              onClick={() => canManage && fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 size={28} className="text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading to Cloudinary…</p>
                  <p className="text-xs text-muted-foreground">This may take a moment for large files</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video size={22} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Click to upload video</p>
                    <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV, WebM or AVI · Max 500 MB</p>
                  </div>
                </>
              )}
            </div>
          )}

          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          <FieldError message={errors.video_url} />
        </div>
      )}

      {/* YouTube embed */}
      {form.video_source === 'youtube' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">YouTube Video ID <span className="text-destructive">*</span></label>
            <input
              className={inputClass}
              value={form.video_youtube_id}
              maxLength={11}
              disabled={!canManage}
              onChange={(e) => setField('video_youtube_id', e.target.value.trim())}
              placeholder="11-character ID (e.g. dQw4w9WgXcQ)"
            />
            <p className="text-xs text-muted-foreground">
              From: <code className="bg-muted px-1 rounded">youtube.com/watch?v=<strong>ID_HERE</strong></code>
            </p>
            <FieldError message={errors.video_youtube_id} />
          </div>
          {form.video_youtube_id.length === 11 && (
            <div className="rounded-lg overflow-hidden border border-border bg-black max-w-xs aspect-video">
              <img
                src={`https://img.youtube.com/vi/${form.video_youtube_id}/hqdefault.jpg`}
                alt="YouTube thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quiz question row component ────────────────────────────────────────────────

function QuizQuestionRow({ q, qi, type, canRemove, onUpdate, onRemove, onUpdateOption, onAddOption, onRemoveOption, onUpdatePair, onAddPair, onRemovePair }) {
  if (type === 'truefalse') {
    return (
      <div className="border border-border rounded-md p-3 bg-background flex flex-col gap-2">
        <div className="flex gap-2 items-start">
          <span className="text-xs text-muted-foreground pt-2.5 w-6 shrink-0 font-mono">Q{qi + 1}</span>
          <input
            className={cn(inputClass, 'flex-1 text-xs')}
            value={q.question}
            onChange={(e) => onUpdate(qi, 'question', e.target.value)}
            placeholder="Question text…"
          />
          {canRemove && (
            <button className="mt-1 w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive shrink-0"
              onClick={() => onRemove(qi)}><X size={12} /></button>
          )}
        </div>
        <div className="flex gap-4 pl-8 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={q.answer === true}  onChange={() => onUpdate(qi, 'answer', true)}  /> True
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={q.answer === false} onChange={() => onUpdate(qi, 'answer', false)} /> False
          </label>
        </div>
      </div>
    )
  }

  if (type === 'multipleChoice') {
    return (
      <div className="border border-border rounded-md p-3 bg-background flex flex-col gap-2">
        <div className="flex gap-2 items-start">
          <span className="text-xs text-muted-foreground pt-2.5 w-6 shrink-0 font-mono">Q{qi + 1}</span>
          <input
            className={cn(inputClass, 'flex-1 text-xs')}
            value={q.question}
            onChange={(e) => onUpdate(qi, 'question', e.target.value)}
            placeholder="Question text…"
          />
          {canRemove && (
            <button className="mt-1 w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive shrink-0"
              onClick={() => onRemove(qi)}><X size={12} /></button>
          )}
        </div>
        <div className="flex flex-col gap-1 pl-8">
          {(q.options ?? []).map((opt, oi) => (
            <div key={oi} className="flex gap-1.5 items-center">
              <input
                type="radio"
                checked={q.answer === opt && !!opt}
                onChange={() => opt && onUpdate(qi, 'answer', opt)}
                title="Mark as correct"
              />
              <input
                className={cn(inputClass, 'flex-1 text-xs py-1.5')}
                value={opt}
                onChange={(e) => onUpdateOption(qi, oi, e.target.value)}
                placeholder={`Option ${oi + 1}`}
              />
              {(q.options ?? []).length > 2 && (
                <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive"
                  onClick={() => onRemoveOption(qi, oi)}><X size={11} /></button>
              )}
            </div>
          ))}
          {(q.options ?? []).length < 6 && (
            <Button type="button" variant="outline" size="sm" className="self-start gap-1 mt-0.5 text-xs h-6 px-2"
              onClick={() => onAddOption(qi)}>
              <Plus size={10} /> Option
            </Button>
          )}
          <p className="text-xs text-muted-foreground">Click the radio button to mark the correct answer.</p>
        </div>
      </div>
    )
  }

  if (type === 'imageMatching') {
    return (
      <div className="border border-border rounded-md p-3 bg-background flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Match Set {qi + 1}</span>
          {canRemove && (
            <button className="text-xs text-destructive hover:underline" onClick={() => onRemove(qi)}>Remove</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <span className="text-xs text-muted-foreground">Image URL</span>
          <span className="text-xs text-muted-foreground">Label</span>
          {(q.pairs ?? []).map((pair, pi) => (
            <>
              <input
                key={`img-${pi}`}
                className={cn(inputClass, 'text-xs py-1.5')}
                value={pair.image}
                onChange={(e) => onUpdatePair(qi, pi, 'image', e.target.value)}
                placeholder="https://…"
              />
              <div className="flex gap-1">
                <input
                  className={cn(inputClass, 'flex-1 text-xs py-1.5')}
                  value={pair.label}
                  onChange={(e) => onUpdatePair(qi, pi, 'label', e.target.value)}
                  placeholder="Label"
                />
                {(q.pairs ?? []).length > 2 && (
                  <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive shrink-0"
                    onClick={() => onRemovePair(qi, pi)}><X size={11} /></button>
                )}
              </div>
            </>
          ))}
        </div>
        {(q.pairs ?? []).length < 10 && (
          <Button type="button" variant="outline" size="sm" className="self-start gap-1 text-xs h-6 px-2"
            onClick={() => onAddPair(qi)}>
            <Plus size={10} /> Pair
          </Button>
        )}
      </div>
    )
  }
  return null
}

// ── Add Lesson Dialog ──────────────────────────────────────────────────────────

function AddLessonDialog({ courseId, isPending, error, onClose, onSave }) {
  const [form, setForm]   = useState({ title: '', type: 'text', duration_secs: 0, text_body: '', image_items: [{ uri: '', caption: '' }], video_source: 'cloudinary', video_url: '', video_youtube_id: '' })
  const [errors, setErrors] = useState({})

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = lessonSchema.safeParse({ title: form.title, duration_secs: Number(form.duration_secs) || 0 })
    if (!result.success) {
      const errs = {}
      result.error.issues.forEach((i) => { if (i.path[0]) errs[i.path[0]] = i.message })
      setErrors(errs)
      return
    }
    if (form.type === 'text' && !form.text_body.trim()) {
      setErrors({ text_body: 'Content is required' }); return
    }
    if (form.type === 'video') {
      if (form.video_source === 'youtube' && form.video_youtube_id.trim().length !== 11) {
        setErrors({ video_youtube_id: 'YouTube ID must be exactly 11 characters' }); return
      }
      if (form.video_source === 'cloudinary' && !form.video_url.trim()) {
        setErrors({ video_url: 'Please upload a video first' }); return
      }
    }
    if (form.type === 'image' && !form.image_items.some((i) => i.uri.trim())) {
      setErrors({ image_items: 'At least one image is required' }); return
    }
    onSave({
      type:          form.type,
      title:         result.data.title,
      content_json:  buildContentJson(form),
      duration_secs: result.data.duration_secs,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Lesson</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <input className={inputClass} value={form.title} autoFocus onChange={(e) => setField('title', e.target.value)} placeholder="Lesson title" />
              <FieldError message={errors.title} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Type</label>
                <select className={selectClass} value={form.type} onChange={(e) => setField('type', e.target.value)}>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Duration (sec)</label>
                <input type="number" className={inputClass} value={form.duration_secs} min={0} max={180}
                  onChange={(e) => setField('duration_secs', Number(e.target.value))} />
              </div>
            </div>

            {form.type === 'text' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Content <span className="text-destructive">*</span></label>
                <textarea className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6} value={form.text_body} onChange={(e) => setField('text_body', e.target.value)} placeholder="Lesson content…" />
                <FieldError message={errors.text_body} />
              </div>
            )}

            {form.type === 'video' && (
              <VideoEditor form={form} setField={setField} errors={errors} canManage />
            )}

            {form.type === 'image' && (
              <ImageEditor form={form} setField={setField} errors={errors} canManage />
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Add Lesson'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
