import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1">
                {value ?? '—'}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2.5 rounded-xl bg-muted ml-4 flex-shrink-0', color)}>
              <Icon size={20} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
