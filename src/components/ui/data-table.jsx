import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function pageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

export function DataTable({
  columns,
  rows,
  isLoading,
  emptyMessage = 'No results.',
  page,
  total,
  limit,
  onPageChange,
  onRowClick,
}) {
  const totalPages = limit && total ? Math.ceil(total / limit) : 0
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end   = Math.min(page * limit, total)

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="whitespace-nowrap">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit ?? 10 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-12"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={row.id ?? i}
                  className={cn(
                    'hover:bg-muted/40 animate-fade-up transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            {total > 0 ? `${start}–${end} of ${totalPages}` : '0 results'}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {/* Prev */}
              <Button
                variant="outline" size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft size={13} />
              </Button>

              {/* Page number buttons */}
              {pageNumbers(page, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1 select-none">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(p)}
                    className={cn('h-7 w-7 p-0 text-xs', p === page && 'pointer-events-none')}
                  >
                    {p}
                  </Button>
                )
              )}

              {/* Next */}
              <Button
                variant="outline" size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight size={13} />
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
