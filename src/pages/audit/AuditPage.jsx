import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { api } from '@/api/client'

const LIMIT = 10

export default function AuditPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.listAuditLogs({ page, limit: LIMIT }).then((r) => r.data.data),
    keepPreviousData: true,
  })

  const columns = [
    {
      key: 'actor',
      label: 'Actor',
      render: (row) => (
        <span className="text-sm font-medium text-foreground">
          {row.actor?.username ?? row.actor_id}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{row.action}</code>
      ),
    },
    { key: 'resource_type', label: 'Resource' },
    {
      key: 'resource_id',
      label: 'Resource ID',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.resource_id ?? '—'}</span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.ip_address ?? '—'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'When',
      render: (row) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <DataTable
          columns={columns}
          rows={data?.logs ?? []}
          isLoading={isLoading}
          emptyMessage="No audit log entries found."
          page={page}
          total={data?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
}
