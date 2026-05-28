import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Pencil, Trash2,
  FileText, ImageIcon, Video, CheckCircle, XCircle, BookOpen, Users, Eye,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/Spinner'
import { FieldError } from '@/components/ui/FieldError'
import { api } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'
import { rejectReasonSchema, fieldErrors } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { z } from 'zod'

const STUDENTS_LIMIT = 10

const inputClass  = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const selectClass = 'w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const LESSON_TYPE_ICON = {
  text:  <FileText size={14} className="text-blue-500" />,
  image: <ImageIcon size={14} className="text-green-500" />,
  video: <Video size={14} className="text-purple-500" />,
}

const LESSON_TYPE_LABEL = { text: 'Text', image: 'Image', video: 'Video' }

function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s > 0 ? s + 's' : ''}`.trim() : `${s}s`
}

// ── Lesson form helpers ───────────────────────────────────────────────────────

const initLessonForm = (lesson) => {
  const base = {
    title: lesson?.title ?? '',
    type:  lesson?.type  ?? 'text',
    duration_secs: lesson?.duration_secs ?? 0,
    text_body:         '',
    image_items:       [{ uri: '', caption: '' }],
    video_youtube_id:  '',
  }
  if (lesson?.content_json) {
    const c = lesson.content_json
    if (lesson.type === 'text')  base.text_body = c.body ?? ''
    if (lesson.type === 'image') base.image_items = Array.isArray(c) && c.length > 0 ? c : [{ uri: '', caption: '' }]
    if (lesson.type === 'video') base.video_youtube_id = c.youtubeId ?? ''
  }
  return base
}

const buildContentJson = (form) => {
  switch (form.type) {
    case 'text':  return { body: form.text_body }
    case 'image': return form.image_items.filter((i) => i.uri.trim())
    case 'video': return { youtubeId: form.video_youtube_id.trim() }
    default:      return {}
  }
}

const lessonFormSchema = z.object({
  title:         z.string().min(1, 'Title is required').max(200),
  duration_secs: z.number().int().min(0),
})

// ── Quiz form helpers ─────────────────────────────────────────────────────────

const initQuizForm = (type, existingQuiz) => {
  if (type === 'truefalse') {
    return {
      type,
      questions: existingQuiz?.questions_json ?? [{ question: '', answer: true }],
    }
  }
  if (type === 'multipleChoice') {
    return {
      type,
      questions: existingQuiz?.questions_json ?? [{ question: '', options: ['', ''], answer: '' }],
    }
  }
  if (type === 'imageMatching') {
    return {
      type,
      questions: existingQuiz?.questions_json ?? [{ pairs: [{ image: '', label: '' }, { image: '', label: '' }] }],
    }
  }
  return { type, questions: [] }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { id }  = useParams()
  const { user } = useAuth()
  const qc       = useQueryClient()

  const [tab, setTab]                   = useState('overview')
  const [studentsPage, setStudentsPage] = useState(1)

  // Dialog states
  const [editCourseOpen, setEditCourseOpen] = useState(false)
  const [viewLesson, setViewLesson]         = useState(null)  // lesson object
  const [lessonDialog, setLessonDialog]     = useState(null)  // { mode, lesson? }
  const [quizDialog, setQuizDialog]         = useState(null)  // { lesson }
  const [deleteLessonTarget, setDeleteLessonTarget] = useState(null)
  const [reviewModal, setReviewModal]       = useState(null)
  const [rejectReason, setRejectReason]     = useState('')
  const [rejectError, setRejectError]       = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  const isOrgAdmin   = user?.role === 'org_admin'

  // Full profile with org_memberships
  const { data: me } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  () => api.getMe().then((r) => r.data.data),
    initialData: user?.org_memberships ? user : undefined,
  })

  // Course detail
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn:  () => api.getCourse(id).then((r) => r.data.data),
  })

  // Categories for edit form
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.listCategories().then((r) => r.data.data),
    enabled:  editCourseOpen,
    staleTime: 5 * 60 * 1000,
  })

  // Quiz data (fetched when dialog opens on a lesson that has a quiz)
  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', quizDialog?.lesson?.id],
    queryFn:  () => api.getQuizByLesson(quizDialog.lesson.id).then((r) => r.data.data),
    enabled:  !!quizDialog?.lesson?.id && !!quizDialog?.lesson?.has_quiz,
  })

  // Students
  const { data: studentsData } = useQuery({
    queryKey: ['course-students', id, studentsPage],
    queryFn:  () =>
      api.listStudents(id, { page: studentsPage, limit: STUDENTS_LIMIT })
        .then((r) => ({ students: r.data.data, total: r.data.meta?.total ?? 0 })),
    enabled: tab === 'students',
    keepPreviousData: true,
  })

  // Only the course's own instructor can edit / add / delete lessons
  const canEdit = !isSuperAdmin && !!course && course.instructor_id === user?.id
  // Org admin of the course's org can approve/reject pending courses (cannot edit)
  const canApprove = isOrgAdmin && !!course &&
    me?.org_memberships?.some((m) => m.org.id === course.org_id) &&
    course?.status === 'pending'

  const sortedLessons = [...(course?.lessons ?? [])].sort((a, b) => a.order_index - b.order_index)

  const invalidateCourse = () => qc.invalidateQueries(['course', id])

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateCourseMutation = useMutation({
    mutationFn: (data) => api.updateCourse(id, data),
    onSuccess:  () => { invalidateCourse(); setEditCourseOpen(false) },
  })

  const submitMutation = useMutation({
    mutationFn: () => api.submitCourse(id),
    onSuccess:  invalidateCourse,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ action, rejection_reason }) => api.approveCourse(id, { action, rejection_reason }),
    onSuccess:  () => { invalidateCourse(); setReviewModal(null); setRejectReason(''); setRejectError('') },
  })

  const createLessonMutation = useMutation({
    mutationFn: (data) => api.createLesson(data),
    onSuccess:  () => { invalidateCourse(); setLessonDialog(null) },
  })

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, ...data }) => api.updateLesson(lessonId, data),
    onSuccess:  () => { invalidateCourse(); setLessonDialog(null) },
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => api.deleteLesson(lessonId),
    onSuccess:  () => { invalidateCourse(); setDeleteLessonTarget(null) },
  })

  const reorderMutation = useMutation({
    mutationFn: (data) => api.reorderLessons(data),
    onSuccess:  invalidateCourse,
  })

  const createQuizMutation = useMutation({
    mutationFn: (data) => api.createQuiz(data),
    onSuccess:  () => { invalidateCourse(); qc.invalidateQueries(['quiz', quizDialog?.lesson?.id]); setQuizDialog(null) },
  })

  const updateQuizMutation = useMutation({
    mutationFn: ({ quizId, ...data }) => api.updateQuiz(quizId, data),
    onSuccess:  () => { invalidateCourse(); qc.invalidateQueries(['quiz', quizDialog?.lesson?.id]); setQuizDialog(null) },
  })

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId) => api.deleteQuiz(quizId),
    onSuccess:  () => { invalidateCourse(); qc.invalidateQueries(['quiz', quizDialog?.lesson?.id]); setQuizDialog(null) },
  })

  // ── Reorder ────────────────────────────────────────────────────────────────

  const moveLesson = (lessonId, direction) => {
    const idx = sortedLessons.findIndex((l) => l.id === lessonId)
    if (direction === 'up'   && idx === 0) return
    if (direction === 'down' && idx === sortedLessons.length - 1) return
    const newList = [...sortedLessons]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]]
    const items = newList.map((l, i) => ({ id: l.id, order_index: i }))
    reorderMutation.mutate({ course_id: id, items })
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center py-20"><Spinner /></div>
  )
  if (!course) return (
    <div className="text-center py-20 text-muted-foreground">Course not found.</div>
  )

  const categories = course.categories ?? []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Breadcrumb */}
      <Link
        to="/courses"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Courses
      </Link>

      {/* Header card */}
      <Card className="p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={COURSE_STATUS[course.status]?.color}>
                  {COURSE_STATUS[course.status]?.label}
                </Badge>
                <Badge color={COURSE_VISIBILITY[course.visibility]?.color}>
                  {COURSE_VISIBILITY[course.visibility]?.label}
                </Badge>
                <Badge color={DIFFICULTY[course.difficulty]?.color}>
                  {course.difficulty}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
              <p className="text-sm text-muted-foreground">
                {course.organization?.name}
                {course.instructor && ` · ${course.instructor.full_name}`}
              </p>
              {categories.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ background: cat.color }}
                    >
                      {cat.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {(canEdit || canApprove) && (
              <div className="flex gap-2 flex-wrap shrink-0">
                {canEdit && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditCourseOpen(true)}>
                      <Pencil size={13} /> Edit
                    </Button>
                    {course.status === 'rejected' && (
                      <Button
                        size="sm" variant="outline"
                        disabled={submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                      >
                        {submitMutation.isPending ? <Spinner size="sm" /> : 'Re-submit for Review'}
                      </Button>
                    )}
                  </>
                )}
                {canApprove && (
                  <>
                    <Button
                      size="sm" variant="outline"
                      className="gap-1 text-success hover:bg-success/10 hover:text-success border-success/30"
                      onClick={() => setReviewModal({ action: 'approve' })}
                    >
                      <CheckCircle size={13} /> Approve
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => { setReviewModal({ action: 'reject' }); setRejectReason(''); setRejectError('') }}
                    >
                      <XCircle size={13} /> Reject
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-6 text-sm text-muted-foreground pt-1 border-t border-border">
            <span className="flex items-center gap-1.5">
              <BookOpen size={13} /> {course.lessons?.length ?? 0} lessons
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} /> {course.enrolled_count ?? 0} enrolled
            </span>
            {course.published_at && (
              <span>Published {new Date(course.published_at).toLocaleDateString()}</span>
            )}
            <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'lessons',  label: `Lessons (${sortedLessons.length})` },
          { key: 'students', label: `Students (${course.enrolled_count ?? 0})` },
        ].map((t) => (
          <button
            key={t.key}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ──────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <Card className="p-6 flex flex-col gap-4">
          {course.description ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided.</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Difficulty</p>
              <Badge color={DIFFICULTY[course.difficulty]?.color} className="mt-1">{course.difficulty}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Visibility</p>
              <Badge color={COURSE_VISIBILITY[course.visibility]?.color} className="mt-1">
                {COURSE_VISIBILITY[course.visibility]?.label}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Duration</p>
              <p className="text-sm font-medium mt-1">{formatDuration(course.total_duration_secs)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Lessons tab ───────────────────────────────────────────────────────── */}
      {tab === 'lessons' && (
        <div className="flex flex-col gap-3">
          {canEdit && (
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => setLessonDialog({ mode: 'add' })}>
                <Plus size={14} /> Add Lesson
              </Button>
            </div>
          )}

          {sortedLessons.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground text-sm">
              No lessons yet.{canEdit ? ' Click "Add Lesson" to get started.' : ''}
            </Card>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {sortedLessons.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Order number */}
                    <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>

                    {/* Type icon */}
                    <span className="shrink-0">{LESSON_TYPE_ICON[lesson.type]}</span>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {LESSON_TYPE_LABEL[lesson.type]} · {formatDuration(lesson.duration_secs)}
                      </p>
                    </div>

                    {/* Quiz badge */}
                    {lesson.has_quiz ? (
                      <button
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors shrink-0"
                        onClick={() => setQuizDialog({ lesson })}
                      >
                        Quiz
                      </button>
                    ) : canEdit ? (
                      <button
                        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
                        onClick={() => setQuizDialog({ lesson })}
                      >
                        + Quiz
                      </button>
                    ) : null}

                    {/* View button — visible to all roles */}
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                      title="View lesson"
                      onClick={() => setViewLesson(lesson)}
                    >
                      <Eye size={13} />
                    </Button>

                    {/* Management actions */}
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          disabled={idx === 0 || reorderMutation.isPending}
                          onClick={() => moveLesson(lesson.id, 'up')}
                        >
                          <ChevronUp size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          disabled={idx === sortedLessons.length - 1 || reorderMutation.isPending}
                          onClick={() => moveLesson(lesson.id, 'down')}
                        >
                          <ChevronDown size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setLessonDialog({ mode: 'edit', lesson })}
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteLessonTarget(lesson)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Students tab ──────────────────────────────────────────────────────── */}
      {tab === 'students' && (
        <Card>
          <DataTable
            columns={[
              {
                key: 'user',
                label: 'Student',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    {row.user?.avatar_url ? (
                      <img src={row.user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {row.user?.full_name?.[0] ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{row.user?.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{row.user?.username}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'enrolled_at',
                label: 'Enrolled',
                render: (row) => (
                  <span className="text-sm text-muted-foreground">
                    {new Date(row.enrolled_at).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
            rows={studentsData?.students ?? []}
            isLoading={!studentsData}
            emptyMessage="No students enrolled yet."
            page={studentsPage}
            total={studentsData?.total ?? 0}
            limit={STUDENTS_LIMIT}
            onPageChange={setStudentsPage}
          />
        </Card>
      )}

      {/* ── Lesson View Dialog ────────────────────────────────────────────────── */}
      {viewLesson && (
        <LessonViewDialog
          lesson={viewLesson}
          onClose={() => setViewLesson(null)}
        />
      )}

      {/* ── Edit Course Dialog ─────────────────────────────────────────────────── */}
      <EditCourseDialog
        open={editCourseOpen}
        course={course}
        allCategories={allCategories}
        isPending={updateCourseMutation.isPending}
        error={updateCourseMutation.error?.response?.data?.message}
        onClose={() => setEditCourseOpen(false)}
        onSave={(data) => updateCourseMutation.mutate(data)}
      />

      {/* ── Add / Edit Lesson Dialog ───────────────────────────────────────────── */}
      {lessonDialog && (
        <LessonDialog
          courseId={id}
          mode={lessonDialog.mode}
          lesson={lessonDialog.lesson}
          isPending={createLessonMutation.isPending || updateLessonMutation.isPending}
          error={
            (createLessonMutation.error || updateLessonMutation.error)
              ?.response?.data?.message
          }
          onClose={() => setLessonDialog(null)}
          onSave={(data) => {
            if (lessonDialog.mode === 'add') {
              createLessonMutation.mutate({ course_id: id, ...data })
            } else {
              updateLessonMutation.mutate({ lessonId: lessonDialog.lesson.id, ...data })
            }
          }}
        />
      )}

      {/* ── Quiz Dialog ────────────────────────────────────────────────────────── */}
      {quizDialog && (
        <QuizDialog
          lesson={quizDialog.lesson}
          quiz={quizData}
          isLoading={quizLoading}
          canManage={canEdit}
          isPending={createQuizMutation.isPending || updateQuizMutation.isPending || deleteQuizMutation.isPending}
          onClose={() => setQuizDialog(null)}
          onCreate={(data) => createQuizMutation.mutate({ lesson_id: quizDialog.lesson.id, ...data })}
          onUpdate={(quizId, data) => updateQuizMutation.mutate({ quizId, ...data })}
          onDelete={(quizId) => deleteQuizMutation.mutate(quizId)}
        />
      )}

      {/* ── Delete Lesson Confirmation ─────────────────────────────────────────── */}
      <Dialog
        open={!!deleteLessonTarget}
        onOpenChange={(open) => { if (!open) setDeleteLessonTarget(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Lesson</DialogTitle></DialogHeader>
          <p className="text-sm text-foreground py-2">
            Delete <span className="font-medium">"{deleteLessonTarget?.title}"</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLessonTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteLessonMutation.isPending}
              onClick={() => deleteLessonMutation.mutate(deleteLessonTarget.id)}
            >
              {deleteLessonMutation.isPending ? <Spinner size="sm" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!reviewModal}
        onOpenChange={(open) => { if (!open) { setReviewModal(null); setRejectReason(''); setRejectError('') } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{reviewModal?.action === 'approve' ? 'Approve Course' : 'Reject Course'}</DialogTitle>
          </DialogHeader>
          {reviewModal && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground">
                {reviewModal.action === 'approve'
                  ? `Approve "${course.title}"? It will become publicly accessible.`
                  : `Reject "${course.title}"?`}
              </p>
              {reviewModal.action === 'reject' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Reason <span className="text-destructive">*</span></label>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => { setReviewModal(null); setRejectReason(''); setRejectError('') }}>
                  Cancel
                </Button>
                <Button
                  variant={reviewModal.action === 'approve' ? 'default' : 'destructive'}
                  disabled={reviewMutation.isPending}
                  onClick={() => {
                    if (reviewModal.action === 'reject') {
                      const result = rejectReasonSchema.safeParse({ reason: rejectReason })
                      if (!result.success) { setRejectError(result.error.issues[0]?.message ?? 'Reason required'); return }
                      reviewMutation.mutate({ action: 'reject', rejection_reason: result.data.reason })
                    } else {
                      reviewMutation.mutate({ action: 'approve' })
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
    </div>
  )
}

// ── Lesson View Dialog ────────────────────────────────────────────────────────

function LessonViewDialog({ lesson, onClose }) {
  const { data: full, isLoading } = useQuery({
    queryKey: ['lesson-content', lesson.id],
    queryFn:  () => api.getLesson(lesson.id).then((r) => r.data.data),
    staleTime: 30_000,
  })

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ['quiz', lesson.id],
    queryFn:  () => api.getQuizByLesson(lesson.id).then((r) => r.data.data),
    enabled:  !!lesson.has_quiz,
    staleTime: 30_000,
  })

  const content = full?.content_json

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="shrink-0">{LESSON_TYPE_ICON[lesson.type]}</span>
            <DialogTitle className="truncate">{lesson.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-md">
              {LESSON_TYPE_LABEL[lesson.type]}
            </span>
            {lesson.duration_secs > 0 && (
              <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration_secs)}</span>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="flex flex-col gap-5 py-2">

            {/* Text content */}
            {lesson.type === 'text' && (
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border rounded-lg p-4 bg-muted/20">
                {content?.body || <span className="text-muted-foreground italic">No content.</span>}
              </div>
            )}

            {/* Image content */}
            {lesson.type === 'image' && Array.isArray(content) && content.length > 0 && (
              <div className="flex flex-col gap-4">
                {content.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <img
                      src={item.uri}
                      alt={item.caption || `Image ${i + 1}`}
                      className="w-full rounded-lg border border-border object-cover max-h-64"
                    />
                    {item.caption && (
                      <p className="text-xs text-muted-foreground text-center italic">{item.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Video content */}
            {lesson.type === 'video' && content && (
              <div className="flex flex-col gap-2">
                {content.youtubeId ? (
                  <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${content.youtubeId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={lesson.title}
                    />
                  </div>
                ) : content.url ? (
                  <video
                    src={content.url}
                    controls
                    className="w-full rounded-lg border border-border max-h-64"
                  />
                ) : null}
              </div>
            )}

            {/* Quiz summary */}
            {lesson.has_quiz && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quiz</p>
                {quizLoading ? (
                  <Spinner />
                ) : quiz ? (
                  <div className="flex flex-col gap-2">
                    <Badge color="bg-primary/10 text-primary" className="self-start">
                      {quiz.type === 'truefalse' ? 'True / False'
                        : quiz.type === 'multipleChoice' ? 'Multiple Choice'
                        : 'Image Matching'}
                      {' · '}{quiz.questions_json?.length} question{quiz.questions_json?.length !== 1 ? 's' : ''}
                    </Badge>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {(quiz.questions_json ?? []).map((q, i) => (
                        <div key={i} className="text-xs border border-border rounded p-2 bg-muted/20">
                          {quiz.type !== 'imageMatching' && (
                            <p className="font-medium">{i + 1}. {q.question}</p>
                          )}
                          {quiz.type === 'truefalse' && (
                            <p className="text-muted-foreground mt-0.5">Answer: <span className="font-medium">{q.answer ? 'True' : 'False'}</span></p>
                          )}
                          {quiz.type === 'multipleChoice' && (
                            <div className="mt-1 flex flex-col gap-0.5">
                              {(q.options ?? []).map((opt, j) => (
                                <span key={j} className={cn('px-1.5', opt === q.answer ? 'text-green-700 font-semibold' : 'text-muted-foreground')}>
                                  {opt === q.answer ? '✓ ' : '· '}{opt}
                                </span>
                              ))}
                            </div>
                          )}
                          {quiz.type === 'imageMatching' && (
                            <div className="flex flex-col gap-0.5">
                              {(q.pairs ?? []).map((p, j) => (
                                <span key={j} className="flex gap-2 text-muted-foreground">
                                  <span className="truncate max-w-[140px]">{p.image}</span>
                                  <span>→</span>
                                  <span className="font-medium text-foreground">{p.label}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Course Dialog ────────────────────────────────────────────────────────

function EditCourseDialog({ open, course, allCategories, isPending, error, onClose, onSave }) {
  const [form, setForm]     = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open && course) {
      setForm({
        title:        course.title,
        description:  course.description ?? '',
        category_ids: (course.categories ?? []).map((c) => c.id),
        difficulty:   course.difficulty,
        visibility:   course.visibility,
      })
      setErrors({})
    }
  }, [open, course])

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const titleErr = !form.title?.trim() ? 'Title is required' : ''
    const catErr   = !form.category_ids?.length ? 'Select at least one category' : ''
    if (titleErr || catErr) { setErrors({ title: titleErr, category_ids: catErr }); return }
    onSave({
      title:        form.title,
      description:  form.description,
      category_ids: form.category_ids,
      difficulty:   form.difficulty,
      visibility:   form.visibility,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Course</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <input className={inputClass} value={form.title ?? ''} onChange={(e) => setField('title', e.target.value)} />
              <FieldError message={errors.title} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => setField('description', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Categories <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-input rounded-md p-2 bg-background">
                {allCategories.length === 0
                  ? <span className="text-xs text-muted-foreground col-span-2 text-center py-2">Loading…</span>
                  : allCategories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/40 rounded px-1.5 py-1">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={(form.category_ids ?? []).includes(cat.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...(form.category_ids ?? []), cat.id]
                              : (form.category_ids ?? []).filter((x) => x !== cat.id)
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
                <select className={selectClass} value={form.difficulty ?? 'Beginner'} onChange={(e) => setField('difficulty', e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Visibility</label>
                <select className={selectClass} value={form.visibility ?? 'public'} onChange={(e) => setField('visibility', e.target.value)}>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Lesson Dialog ─────────────────────────────────────────────────────────────

function LessonDialog({ courseId, mode, lesson, isPending, error, onClose, onSave }) {
  const [form, setForm]     = useState(() => initLessonForm(lesson))
  const [errors, setErrors] = useState({})

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = lessonFormSchema.safeParse({ title: form.title, duration_secs: Number(form.duration_secs) || 0 })
    if (!result.success) { setErrors(fieldErrors(result)); return }

    const content_json = buildContentJson(form)
    // Validate content
    if (form.type === 'text' && !form.text_body.trim()) {
      setErrors({ text_body: 'Content body is required' }); return
    }
    if (form.type === 'video' && form.video_youtube_id.trim().length !== 11) {
      setErrors({ video_youtube_id: 'YouTube ID must be exactly 11 characters' }); return
    }
    if (form.type === 'image' && !form.image_items.some((i) => i.uri.trim())) {
      setErrors({ image_items: 'At least one image URL is required' }); return
    }

    const payload = {
      type:          form.type,
      title:         result.data.title,
      content_json,
      duration_secs: result.data.duration_secs,
    }
    if (mode === 'add') payload.course_id = courseId
    onSave(payload)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Lesson' : 'Edit Lesson'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
              <input className={inputClass} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Lesson title" />
              <FieldError message={errors.title} />
            </div>

            {/* Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  className={selectClass}
                  value={form.type}
                  disabled={mode === 'edit'}
                  onChange={(e) => setField('type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Duration (seconds)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.duration_secs}
                  min={0}
                  onChange={(e) => setField('duration_secs', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Content — text */}
            {form.type === 'text' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Content <span className="text-destructive">*</span></label>
                <textarea
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6}
                  value={form.text_body}
                  onChange={(e) => setField('text_body', e.target.value)}
                  placeholder="Lesson content…"
                />
                <FieldError message={errors.text_body} />
              </div>
            )}

            {/* Content — image */}
            {form.type === 'image' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Images <span className="text-destructive">*</span></label>
                {form.image_items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        className={inputClass}
                        value={item.uri}
                        onChange={(e) => {
                          const items = [...form.image_items]
                          items[i] = { ...items[i], uri: e.target.value }
                          setField('image_items', items)
                        }}
                        placeholder="Image URL (https://…)"
                      />
                      <input
                        className={inputClass}
                        value={item.caption ?? ''}
                        onChange={(e) => {
                          const items = [...form.image_items]
                          items[i] = { ...items[i], caption: e.target.value }
                          setField('image_items', items)
                        }}
                        placeholder="Caption (optional)"
                      />
                    </div>
                    {form.image_items.length > 1 && (
                      <Button
                        type="button" variant="ghost" size="sm" className="mt-1 h-7 w-7 p-0 text-destructive"
                        onClick={() => setField('image_items', form.image_items.filter((_, j) => j !== i))}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                {form.image_items.length < 20 && (
                  <Button
                    type="button" variant="outline" size="sm" className="self-start gap-1"
                    onClick={() => setField('image_items', [...form.image_items, { uri: '', caption: '' }])}
                  >
                    <Plus size={12} /> Add Image
                  </Button>
                )}
                <FieldError message={errors.image_items} />
              </div>
            )}

            {/* Content — video */}
            {form.type === 'video' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">YouTube ID <span className="text-destructive">*</span></label>
                <input
                  className={inputClass}
                  value={form.video_youtube_id}
                  maxLength={11}
                  onChange={(e) => setField('video_youtube_id', e.target.value)}
                  placeholder="11-character ID (e.g. dQw4w9WgXcQ)"
                />
                <p className="text-xs text-muted-foreground">From: youtube.com/watch?v=<strong>ID_HERE</strong></p>
                <FieldError message={errors.video_youtube_id} />
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner size="sm" /> : mode === 'add' ? 'Add Lesson' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Quiz Dialog ───────────────────────────────────────────────────────────────

function QuizDialog({ lesson, quiz, isLoading, canManage, isPending, onClose, onCreate, onUpdate, onDelete }) {
  const hasQuiz = lesson.has_quiz
  const [mode, setMode]       = useState(hasQuiz ? 'view' : 'create')
  const [quizForm, setQuizForm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [qError, setQError]   = useState('')

  useEffect(() => {
    if (mode === 'edit' && quiz) {
      setQuizForm(initQuizForm(quiz.type, quiz))
    }
    if (mode === 'create') {
      setQuizForm(initQuizForm('truefalse', null))
    }
  }, [mode, quiz])

  const updateQ = (qi, field, value) => {
    setQuizForm((prev) => {
      const questions = prev.questions.map((q, i) => i === qi ? { ...q, [field]: value } : q)
      return { ...prev, questions }
    })
  }

  const addQ = () => {
    const blank = quizForm.type === 'truefalse'
      ? { question: '', answer: true }
      : quizForm.type === 'multipleChoice'
        ? { question: '', options: ['', ''], answer: '' }
        : { pairs: [{ image: '', label: '' }, { image: '', label: '' }] }
    setQuizForm((prev) => ({ ...prev, questions: [...prev.questions, blank] }))
  }

  const removeQ = (qi) => {
    setQuizForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qi) }))
  }

  const updateOption = (qi, oi, value) => {
    setQuizForm((prev) => {
      const questions = prev.questions.map((q, i) => {
        if (i !== qi) return q
        const options = q.options.map((o, j) => j === oi ? value : o)
        const answer  = q.answer === q.options[oi] ? value : q.answer
        return { ...q, options, answer }
      })
      return { ...prev, questions }
    })
  }

  const addOption = (qi) => {
    setQuizForm((prev) => {
      const questions = prev.questions.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, ''] } : q,
      )
      return { ...prev, questions }
    })
  }

  const removeOption = (qi, oi) => {
    setQuizForm((prev) => {
      const questions = prev.questions.map((q, i) => {
        if (i !== qi) return q
        const options = q.options.filter((_, j) => j !== oi)
        const answer  = q.answer === q.options[oi] ? '' : q.answer
        return { ...q, options, answer }
      })
      return { ...prev, questions }
    })
  }

  const updatePair = (qi, pi, field, value) => {
    setQuizForm((prev) => {
      const questions = prev.questions.map((q, i) => {
        if (i !== qi) return q
        const pairs = q.pairs.map((p, j) => j === pi ? { ...p, [field]: value } : p)
        return { ...q, pairs }
      })
      return { ...prev, questions }
    })
  }

  const handleSave = () => {
    setQError('')
    if (!quizForm?.questions?.length) { setQError('Add at least one question'); return }
    const empty = quizForm.questions.some((q) => !q.question?.trim && !q.pairs)
    const payload = { type: quizForm.type, questions_json: quizForm.questions }
    if (mode === 'create') onCreate(payload)
    else onUpdate(quiz.id, { questions_json: quizForm.questions })
  }

  const title = hasQuiz
    ? (mode === 'view' ? 'Quiz' : 'Edit Quiz')
    : 'Add Quiz'

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <span className="text-xs text-muted-foreground">{lesson.title}</span>
          </div>
        </DialogHeader>

        {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

        {/* View mode — read-only summary */}
        {!isLoading && mode === 'view' && quiz && (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-center gap-2">
              <Badge color="bg-primary/10 text-primary">
                {quiz.type === 'truefalse' ? 'True / False'
                  : quiz.type === 'multipleChoice' ? 'Multiple Choice'
                  : 'Image Matching'}
              </Badge>
              <span className="text-xs text-muted-foreground">{quiz.questions_json?.length} question{quiz.questions_json?.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {(quiz.questions_json ?? []).map((q, i) => (
                <div key={i} className="text-sm border border-border rounded p-2 bg-muted/20">
                  {quiz.type !== 'imageMatching' && (
                    <p className="font-medium">{i + 1}. {q.question}</p>
                  )}
                  {quiz.type === 'truefalse' && (
                    <p className="text-xs text-muted-foreground mt-0.5">Answer: <span className="font-medium">{q.answer ? 'True' : 'False'}</span></p>
                  )}
                  {quiz.type === 'multipleChoice' && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {(q.options ?? []).map((opt, j) => (
                        <span key={j} className={cn('text-xs px-1.5', opt === q.answer && 'text-success font-semibold')}>
                          {opt === q.answer ? '✓ ' : '  '}{opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {quiz.type === 'imageMatching' && (
                    <div className="flex flex-col gap-1">
                      {(q.pairs ?? []).map((p, j) => (
                        <div key={j} className="text-xs flex gap-2">
                          <span className="truncate text-muted-foreground max-w-[120px]">{p.image}</span>
                          <span>→</span>
                          <span className="font-medium">{p.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setMode('edit')}>
                  <Pencil size={12} className="mr-1" /> Edit Quiz
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setDeleteConfirm(true)}>
                  <Trash2 size={12} className="mr-1" /> Delete Quiz
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit mode — question builder */}
        {!isLoading && (mode === 'create' || mode === 'edit') && quizForm && (
          <div className="flex flex-col gap-4 py-1">
            {/* Type selector (only on create) */}
            {mode === 'create' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Quiz Type</label>
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
            )}
            {mode === 'edit' && (
              <Badge color="bg-muted text-foreground" className="self-start">
                {quizForm.type === 'truefalse' ? 'True / False'
                  : quizForm.type === 'multipleChoice' ? 'Multiple Choice'
                  : 'Image Matching'}
              </Badge>
            )}

            {/* Questions list */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
              {quizForm.questions.map((q, qi) => (
                <div key={qi} className="border border-border rounded-md p-3 flex flex-col gap-2 bg-muted/10">
                  {/* True/False question */}
                  {quizForm.type === 'truefalse' && (
                    <>
                      <div className="flex gap-2 items-start">
                        <span className="text-xs font-medium text-muted-foreground pt-2 w-5 shrink-0">Q{qi + 1}</span>
                        <input
                          className={inputClass}
                          value={q.question}
                          onChange={(e) => updateQ(qi, 'question', e.target.value)}
                          placeholder="Question text…"
                        />
                        {quizForm.questions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive"
                            onClick={() => removeQ(qi)}>×</Button>
                        )}
                      </div>
                      <div className="flex gap-4 pl-7">
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="radio" checked={q.answer === true}  onChange={() => updateQ(qi, 'answer', true)}  /> True
                        </label>
                        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="radio" checked={q.answer === false} onChange={() => updateQ(qi, 'answer', false)} /> False
                        </label>
                      </div>
                    </>
                  )}

                  {/* Multiple Choice question */}
                  {quizForm.type === 'multipleChoice' && (
                    <>
                      <div className="flex gap-2 items-start">
                        <span className="text-xs font-medium text-muted-foreground pt-2 w-5 shrink-0">Q{qi + 1}</span>
                        <input
                          className={inputClass}
                          value={q.question}
                          onChange={(e) => updateQ(qi, 'question', e.target.value)}
                          placeholder="Question text…"
                        />
                        {quizForm.questions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive"
                            onClick={() => removeQ(qi)}>×</Button>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 pl-7">
                        {(q.options ?? []).map((opt, oi) => (
                          <div key={oi} className="flex gap-2 items-center">
                            <input
                              type="radio"
                              checked={q.answer === opt && !!opt}
                              onChange={() => opt && updateQ(qi, 'answer', opt)}
                              title="Mark as correct answer"
                            />
                            <input
                              className={cn(inputClass, 'flex-1')}
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                            />
                            {(q.options ?? []).length > 2 && (
                              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0"
                                onClick={() => removeOption(qi, oi)}>×</Button>
                            )}
                          </div>
                        ))}
                        {(q.options ?? []).length < 6 && (
                          <Button type="button" variant="outline" size="sm" className="self-start gap-1 mt-1"
                            onClick={() => addOption(qi)}>
                            <Plus size={11} /> Option
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">Click the radio button to mark the correct answer.</p>
                      </div>
                    </>
                  )}

                  {/* Image Matching question */}
                  {quizForm.type === 'imageMatching' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Match Set {qi + 1}</span>
                        {quizForm.questions.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-destructive"
                            onClick={() => removeQ(qi)}>Remove Set</Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs mb-0.5">
                        <span className="text-muted-foreground font-medium">Image URL</span>
                        <span className="text-muted-foreground font-medium">Label</span>
                      </div>
                      {(q.pairs ?? []).map((pair, pi) => (
                        <div key={pi} className="grid grid-cols-2 gap-1.5 items-center">
                          <input
                            className={inputClass}
                            value={pair.image}
                            onChange={(e) => updatePair(qi, pi, 'image', e.target.value)}
                            placeholder="https://…"
                          />
                          <div className="flex gap-1">
                            <input
                              className={cn(inputClass, 'flex-1')}
                              value={pair.label}
                              onChange={(e) => updatePair(qi, pi, 'label', e.target.value)}
                              placeholder="Label"
                            />
                            {(q.pairs ?? []).length > 2 && (
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 text-destructive"
                                onClick={() => {
                                  setQuizForm((prev) => {
                                    const questions = prev.questions.map((qq, i) =>
                                      i !== qi ? qq : { ...qq, pairs: qq.pairs.filter((_, j) => j !== pi) }
                                    )
                                    return { ...prev, questions }
                                  })
                                }}>×</Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {(q.pairs ?? []).length < 10 && (
                        <Button type="button" variant="outline" size="sm" className="self-start gap-1 mt-1"
                          onClick={() => {
                            setQuizForm((prev) => {
                              const questions = prev.questions.map((qq, i) =>
                                i !== qi ? qq : { ...qq, pairs: [...qq.pairs, { image: '', label: '' }] }
                              )
                              return { ...prev, questions }
                            })
                          }}>
                          <Plus size={11} /> Pair
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {quizForm.questions.length < 20 && (
              <Button type="button" variant="outline" size="sm" className="self-start gap-1" onClick={addQ}>
                <Plus size={12} /> Add Question
              </Button>
            )}

            {qError && <p className="text-xs text-destructive">{qError}</p>}

            <DialogFooter>
              {mode === 'edit' && (
                <Button type="button" variant="outline" onClick={() => setMode('view')} className="mr-auto">
                  Cancel Edit
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>Close</Button>
              <Button type="button" disabled={isPending} onClick={handleSave}>
                {isPending ? <Spinner size="sm" /> : mode === 'create' ? 'Create Quiz' : 'Save Quiz'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Delete quiz confirmation */}
        {deleteConfirm && (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-foreground">Delete the quiz for this lesson? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" disabled={isPending} onClick={() => onDelete(quiz.id)}>
                {isPending ? <Spinner size="sm" /> : 'Delete Quiz'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
