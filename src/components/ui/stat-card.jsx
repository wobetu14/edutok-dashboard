import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

export function StatCard({ label, value, icon: Icon, color, loading, index = 0 }) {
  const counted = useCountUp(typeof value === 'number' ? value : null)
  const display = loading
    ? null
    : typeof value === 'number'
      ? counted.toLocaleString()
      : (value ?? '—')

  return (
    <Card
      className={cn(
        'animate-fade-up card-lift',
        'group overflow-hidden',
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums transition-all duration-300">
                {display}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              'p-2.5 rounded-xl bg-muted ml-4 flex-shrink-0',
              'transition-transform duration-300 group-hover:scale-110',
              color,
            )}>
              <Icon size={20} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
