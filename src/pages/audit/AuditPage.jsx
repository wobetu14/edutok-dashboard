import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Table, Pagination } from '../../components/ui/Table';
import { api } from '../../api/client';

const LIMIT = 30;

export default function AuditPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.listAuditLogs({ page, limit: LIMIT }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'actor', label: 'Actor',
      render: (row) => (
        <span className="text-sm text-ink">{row.actor?.username ?? row.actor_id}</span>
      ),
    },
    { key: 'action', label: 'Action', render: (row) => <span className="font-mono text-xs">{row.action}</span> },
    { key: 'resource_type', label: 'Resource' },
    { key: 'resource_id',   label: 'Resource ID', render: (row) => <span className="font-mono text-xs text-muted">{row.resource_id ?? '—'}</span> },
    {
      key: 'ip_address', label: 'IP',
      render: (row) => <span className="text-xs text-muted">{row.ip_address ?? '—'}</span>,
    },
    {
      key: 'created_at', label: 'When',
      render: (row) => (
        <span className="text-xs text-muted whitespace-nowrap">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padding={false}>
        <Table
          columns={columns}
          rows={data?.logs ?? []}
          isLoading={isLoading}
          emptyMessage="No audit log entries found."
        />
        <Pagination page={page} total={data?.total ?? 0} limit={LIMIT} onChange={setPage} />
      </Card>
    </div>
  );
}
