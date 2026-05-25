import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Tags } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/api/client'
import { COURSE_STATUS, COURSE_VISIBILITY, DIFFICULTY } from '@/utils/constants'

const LIMIT = 20

export default function CategoryDetailPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.listCategories().then((r) => r.data.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['courses-by-category', categoryId, page],
    queryFn: () =>
      api.listCourses({ category: categoryId, page, limit: LIMIT })
        .then((r) => r.data),
    keepPreviousData: true,
  })

  const cat = categoriesData?.find((c) => c.id === categoryId)
  const courses = data?.data ?? []
  const total = data?.meta?.total ?? data?.total ?? courses.length

  const columns = [
    {
      key: 'title',
      label: 'Course',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.organization?.name}</p>
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
        <Badge color={COURSE_STATUS[row.status]?.color}>
          {COURSE_STATUS[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'lessons',
      label: 'Lessons',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row._count?.lessons ?? row.lesson_count ?? '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* ── Breadcrumb / back ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => navigate('/categories')}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Tags size={14} />
          Categories
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{cat?.label ?? categoryId}</span>
      </div>

      {/* ── Category header ── */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 flex-shrink-0"
          onClick={() => navigate('/categories')}
        >
          <ArrowLeft size={15} />
        </Button>

        {cat && (
          <>
            {/* Color strip avatar */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: cat.color + '22', color: cat.color }}
            >
              {cat.label.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{cat.label}</h1>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: cat.color + '22', color: cat.color }}
                >
                  {cat.icon}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {cat.course_count ?? total} course{(cat.course_count ?? total) !== 1 ? 's' : ''}
                {' '}·{' '}
                <span className="font-mono text-xs">{cat.id}</span>
                {' '}·{' '}
                <span className="font-mono text-xs uppercase">{cat.color}</span>
              </p>
            </div>

            {/* Color swatch */}
            <div
              className="ml-auto w-8 h-8 rounded-lg flex-shrink-0 border border-border"
              style={{ background: cat.color }}
              title={cat.color}
            />
          </>
        )}
      </div>

      {/* ── Divider ── */}
      {cat && (
        <div className="h-0.5 rounded-full w-full" style={{ background: cat.color + '33' }} />
      )}

      {/* ── Course table ── */}
      <Card>
        <DataTable
          columns={columns}
          rows={courses}
          isLoading={isLoading}
          emptyMessage="No courses in this category yet."
          page={page}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </Card>

    </div>
  )
}
