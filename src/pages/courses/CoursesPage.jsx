import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/client';
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

const LIMIT = 20;

export default function CoursesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [page, setPage]         = useState(1);
  const [tab, setTab]           = useState('pending');
  const [reviewModal, setModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError]   = useState('');

  const isPendingTab = tab === 'pending';

  const { data, isLoading } = useQuery({
    queryKey: ['courses', tab, page],
    queryFn: () =>
      isPendingTab
        ? api.listPending({ page, limit: LIMIT }).then((r) => r.data.data)
        : api.listMyCourses({ page, limit: LIMIT, status: tab === 'all' ? undefined : tab }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }) =>
      api.reviewCourse(id, { action, rejection_reason }),
    onSuccess: () => {
      qc.invalidateQueries(['courses']);
      setModal(null);
      setRejectReason('');
    },
    onError: (err) => setActionError(err.response?.data?.message ?? 'Action failed'),
  });

  const canReview = user?.role === 'super_admin' || user?.role === 'org_admin';

  const columns = [
    {
      key: 'title', label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.title}</p>
          <p className="text-xs text-muted">{row.organization?.name} · {row.category}</p>
        </div>
      ),
    },
    {
      key: 'difficulty', label: 'Level',
      render: (row) => <Badge color={DIFFICULTY[row.difficulty]?.color}>{row.difficulty}</Badge>,
    },
    {
      key: 'visibility', label: 'Visibility',
      render: (row) => <Badge color={COURSE_VISIBILITY[row.visibility]?.color}>{COURSE_VISIBILITY[row.visibility]?.label}</Badge>,
    },
    {
      key: 'status', label: 'Status',
      render: (row) => <Badge color={COURSE_STATUS[row.status]?.color}>{COURSE_STATUS[row.status]?.label}</Badge>,
    },
    ...(canReview && isPendingTab ? [{
      key: 'actions', label: '',
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="btn text-xs py-1 px-2 bg-success/10 text-green-700 hover:bg-success/20 gap-1"
            onClick={() => { setModal({ ...row, action: 'approve' }); setActionError(''); }}
          >
            <CheckCircle size={13} /> Approve
          </button>
          <button
            className="btn text-xs py-1 px-2 bg-danger/10 text-red-700 hover:bg-danger/20 gap-1"
            onClick={() => { setModal({ ...row, action: 'reject' }); setActionError(''); setRejectReason(''); }}
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      ),
    }] : []),
  ];

  const tabs = [
    { key: 'pending',  label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all',      label: 'All My Courses' },
  ];

  const courses = data?.courses ?? data?.pending ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-ink'
            }`}
            onClick={() => { setTab(t.key); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <Table
          columns={columns}
          rows={courses}
          isLoading={isLoading}
          emptyMessage="No courses found."
        />
        <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
      </Card>

      {/* Review modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setModal(null)}
        title={reviewModal?.action === 'approve' ? 'Approve Course' : 'Reject Course'}
      >
        {reviewModal && (
          <>
            <p className="text-sm text-ink">
              {reviewModal.action === 'approve'
                ? `Approve "${reviewModal.title}"? It will become publicly accessible.`
                : `Reject "${reviewModal.title}"?`}
            </p>
            {reviewModal.action === 'reject' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-ink">Reason <span className="text-danger">*</span></label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this course is being rejected…"
                />
              </div>
            )}
            {actionError && <p className="text-xs text-danger">{actionError}</p>}
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={reviewModal.action === 'approve' ? 'btn-primary' : 'btn-danger'}
                disabled={reviewMutation.isPending || (reviewModal.action === 'reject' && !rejectReason.trim())}
                onClick={() => reviewMutation.mutate({
                  id: reviewModal.id,
                  action: reviewModal.action,
                  rejection_reason: rejectReason || undefined,
                })}
              >
                {reviewMutation.isPending ? <Spinner size="sm" /> : (reviewModal.action === 'approve' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
