import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'
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

const LIMIT = 20

const TABS = [
  { key: 'pending',  label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'All My Courses' },
]

export default function CoursesPage() {
  const { user }  = useAuth()
  const qc        = useQueryClient()
  const [page, setPage]         = useState(1)
  const [tab, setTab]           = useState('pending')
  const [reviewModal, setModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionError, setActionError]   = useState('')

  const isPendingTab = tab === 'pending'

  const { data, isLoading } = useQuery({
    queryKey: ['courses', tab, page],
    queryFn: () =>
      isPendingTab
        ? api.listPending({ page, limit: LIMIT }).then((r) => r.data.data)
        : api.listMyCourses({ page, limit: LIMIT, status: tab === 'all' ? undefined : tab })
            .then((r) => ({ courses: r.data.data, total: r.data.meta?.total ?? 0 })),
    keepPreviousData: true,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }) =>
      api.reviewCourse(id, { action, rejection_reason }),
    onSuccess: () => {
      qc.invalidateQueries(['courses'])
      setModal(null)
      setRejectReason('')
      setActionError('')
    },
    onError: (err) => setActionError(err.response?.data?.message ?? 'Action failed'),
  })

  const canReview = user?.role === 'super_admin' || user?.role === 'org_admin'
  const courses   = data?.courses ?? data?.pending ?? []

  const columns = [
    {
      key: 'title',
      label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.organization?.name} · {row.category}</p>
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
    ...(canReview && isPendingTab
      ? [{
          key: 'actions',
          label: '',
          render: (row) => (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-success hover:text-success hover:bg-success/10"
                onClick={() => { setModal({ ...row, action: 'approve' }); setActionError('') }}
              >
                <CheckCircle size={13} /> Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => { setModal({ ...row, action: 'reject' }); setActionError(''); setRejectReason('') }}
              >
                <XCircle size={13} /> Reject
              </Button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="flex flex-col gap-4">
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
        />
      </Card>

      {/* Review dialog */}
      <Dialog open={!!reviewModal} onOpenChange={(open) => { if (!open) { setModal(null); setActionError('') } }}>
        <DialogContent className="max-w-sm">
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
                  <label className="text-sm font-medium text-foreground">
                    Reason <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this course is being rejected…"
                  />
                </div>
              )}

              {actionError && <p className="text-xs text-destructive">{actionError}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => { setModal(null); setActionError('') }}>
                  Cancel
                </Button>
                <Button
                  variant={reviewModal.action === 'approve' ? 'default' : 'destructive'}
                  disabled={
                    reviewMutation.isPending ||
                    (reviewModal.action === 'reject' && !rejectReason.trim())
                  }
                  onClick={() =>
                    reviewMutation.mutate({
                      id: reviewModal.id,
                      action: reviewModal.action,
                      rejection_reason: rejectReason || undefined,
                    })
                  }
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
