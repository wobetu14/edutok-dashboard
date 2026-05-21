import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { api } from '@/api/client'

const LIMIT = 20

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function OrgsPage() {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orgs', page, search],
    queryFn: () =>
      api.listOrgs({ page, limit: LIMIT, q: search || undefined }).then((r) => r.data.data),
    keepPreviousData: true,
  })

  const columns = [
    {
      key: 'name',
      label: 'Organization',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.logo_url} alt={row.name} />
            <AvatarFallback className="bg-secondary/20 text-secondary text-xs font-semibold">
              {initials(row.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{row.name}</p>
            {row.website && (
              <a
                href={row.website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {row.website}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <p className="text-sm text-muted-foreground max-w-xs truncate">{row.description ?? '—'}</p>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      <Card>
        <DataTable
          columns={columns}
          rows={data?.organizations ?? []}
          isLoading={isLoading}
          emptyMessage="No organizations found."
          page={page}
          total={data?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
}
