import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/client';

const ROLE_OPTIONS = [
  { value: '',          label: 'All roles' },
  { value: 'learner',   label: 'Learners only' },
  { value: 'instructor', label: 'Instructors only' },
  { value: 'org_admin', label: 'Org Admins only' },
];

const ROLE_BADGE = {
  '':          'bg-gray-100 text-gray-500',
  learner:     'bg-blue-100 text-blue-700',
  instructor:  'bg-purple-100 text-purple-700',
  org_admin:   'bg-secondary/20 text-teal-700',
};

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ title: '', body: '', target_role: '', expires_at: '' });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.listAnnouncements().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.createAnnouncement(body),
    onSuccess: () => { qc.invalidateQueries(['announcements']); setModal(false); setForm({ title: '', body: '', target_role: '', expires_at: '' }); },
    onError: (err) => setFormError(err.response?.data?.message ?? 'Failed to create'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAnnouncement(id),
    onSuccess: () => qc.invalidateQueries(['announcements']),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    createMutation.mutate({
      title:       form.title,
      body:        form.body,
      target_role: form.target_role || undefined,
      expires_at:  form.expires_at  || undefined,
    });
  };

  const announcements = data?.announcements ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => { setModal(true); setFormError(''); }}>
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : announcements.length === 0 ? (
        <Card className="text-center py-12 text-muted text-sm">No announcements yet.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-ink">{a.title}</h3>
                  <Badge color={ROLE_BADGE[a.target_role ?? '']}>
                    {a.target_role ? ROLE_OPTIONS.find(r => r.value === a.target_role)?.label : 'All roles'}
                  </Badge>
                </div>
                <p className="text-sm text-muted">{a.body}</p>
                <p className="text-xs text-muted mt-1">
                  {new Date(a.published_at ?? a.created_at).toLocaleDateString()}
                  {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              <button
                className="text-muted hover:text-danger transition-colors flex-shrink-0"
                onClick={() => deleteMutation.mutate(a.id)}
              >
                <Trash2 size={15} />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink">Message <span className="text-danger">*</span></label>
            <textarea
              className="input resize-none"
              rows={3}
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Announcement message…"
            />
          </div>
          <Select
            label="Target Audience"
            value={form.target_role}
            onChange={(e) => setForm({ ...form, target_role: e.target.value })}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Expires At (optional)"
            type="date"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
          {formError && <p className="text-xs text-danger">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner size="sm" /> : 'Publish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
