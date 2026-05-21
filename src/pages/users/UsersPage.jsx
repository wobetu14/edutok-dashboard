import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Search, PowerOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../api/client';
import { ROLES } from '../../utils/constants';

const LIMIT = 20;

export default function UsersPage() {
  const qc = useQueryClient();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ full_name: '', username: '', phone: '', email: '', role: 'instructor', org_id: '' });
  const [tempPassword, setTempPassword] = useState('');
  const [formError, setFormError]       = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () => api.listUsers({ page, limit: LIMIT, q: search || undefined, role: roleFilter || undefined }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const createUser = useMutation({
    mutationFn: (body) => api.createManaged(body),
    onSuccess: (res) => {
      setTempPassword(res.data.data.tempPassword);
      qc.invalidateQueries(['users']);
    },
    onError: (err) => setFormError(err.response?.data?.message ?? 'Failed to create user'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.setActiveStatus(id, is_active),
    onSuccess: () => qc.invalidateQueries(['users']),
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    createUser.mutate(form);
  };

  const columns = [
    {
      key: 'user', label: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar_url} name={row.full_name} size="sm" />
          <div>
            <p className="text-sm font-medium text-ink">{row.full_name}</p>
            <p className="text-xs text-muted">@{row.username}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'role', label: 'Role',
      render: (row) => <Badge color={ROLES[row.role]?.color}>{ROLES[row.role]?.label ?? row.role}</Badge>,
    },
    {
      key: 'is_active', label: 'Status',
      render: (row) => (
        <Badge color={row.is_active ? 'bg-success/10 text-green-700' : 'bg-danger/10 text-red-700'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row) => (
        <button
          className={`btn-ghost text-xs gap-1 ${!row.is_active ? 'text-success hover:text-success' : 'text-danger hover:text-danger'}`}
          onClick={() => toggleActive.mutate({ id: row.id, is_active: !row.is_active })}
        >
          <PowerOff size={13} />
          {row.is_active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Search users…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="input w-36"
            value={roleFilter}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          >
            <option value="">All roles</option>
            {Object.entries(ROLES).map(([v, r]) => <option key={v} value={v}>{r.label}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => { setModal(true); setTempPassword(''); setFormError(''); }}>
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <Card padding={false}>
        <Table
          columns={columns}
          rows={data?.users ?? []}
          isLoading={isLoading}
          emptyMessage="No users found."
        />
        <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
      </Card>

      {/* Create managed user modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Managed User">
        {tempPassword ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-success font-medium">User created successfully!</p>
            <div className="bg-bg rounded-lg border border-border p-4">
              <p className="text-xs text-muted mb-1">Temporary password (shown once):</p>
              <p className="text-base font-mono font-bold text-ink tracking-widest">{tempPassword}</p>
            </div>
            <p className="text-xs text-muted">Share this password securely. The user must change it on first login.</p>
            <button className="btn-primary" onClick={() => { setModal(false); setForm({ full_name: '', username: '', phone: '', email: '', role: 'instructor', org_id: '' }); }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <Input label="Full Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Username"  required value={form.username}  onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Phone"     required value={form.phone}     onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
            <Input label="Email"     type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={[
                { value: 'instructor', label: 'Instructor' },
                { value: 'org_admin',  label: 'Org Admin' },
              ]}
            />
            <Input label="Organization ID" required value={form.org_id} onChange={(e) => setForm({ ...form, org_id: e.target.value })} placeholder="cuid…" />
            {formError && <p className="text-xs text-danger">{formError}</p>}
            <button type="submit" className="btn-primary justify-center" disabled={createUser.isPending}>
              {createUser.isPending ? <Spinner size="sm" /> : 'Create User'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
