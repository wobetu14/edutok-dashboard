import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import Avatar from '../../components/ui/Avatar';
import { api } from '../../api/client';

const LIMIT = 20;

export default function OrgsPage() {
  const qc = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orgs', page, search],
    queryFn: () => api.listOrgs({ page, limit: LIMIT, q: search || undefined }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'name', label: 'Organization',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.logo_url} name={row.name} size="sm" />
          <div>
            <p className="text-sm font-medium text-ink">{row.name}</p>
            {row.website && <a href={row.website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{row.website}</a>}
          </div>
        </div>
      ),
    },
    {
      key: 'description', label: 'Description',
      render: (row) => (
        <p className="text-sm text-muted max-w-xs truncate">{row.description ?? '—'}</p>
      ),
    },
    { key: 'created_at', label: 'Created', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card padding={false}>
        <Table
          columns={columns}
          rows={data?.organizations ?? []}
          isLoading={isLoading}
          emptyMessage="No organizations found."
        />
        <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
      </Card>
    </div>
  );
}
