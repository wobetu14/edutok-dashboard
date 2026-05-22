import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

/* Accent config per colour token passed from DashboardPage */
const ACCENT = {
  'text-primary': {
    stripe:      'linear-gradient(90deg, #FE2C55 0%, #ff8fa8 100%)',
    iconBg:      'linear-gradient(135deg, rgba(254,44,85,0.16) 0%, rgba(254,44,85,0.06) 100%)',
    iconShadow:  '0 4px 14px rgba(254,44,85,0.22)',
    iconHover:   '0 6px 22px rgba(254,44,85,0.32)',
    text:        '#FE2C55',
  },
  'text-secondary': {
    stripe:      'linear-gradient(90deg, #25F4EE 0%, #7cfbf8 100%)',
    iconBg:      'linear-gradient(135deg, rgba(37,244,238,0.16) 0%, rgba(37,244,238,0.06) 100%)',
    iconShadow:  '0 4px 14px rgba(37,244,238,0.22)',
    iconHover:   '0 6px 22px rgba(37,244,238,0.32)',
    text:        '#0ec8c3',
  },
  'text-purple-500': {
    stripe:      'linear-gradient(90deg, #a855f7 0%, #d8b4fe 100%)',
    iconBg:      'linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.06) 100%)',
    iconShadow:  '0 4px 14px rgba(168,85,247,0.22)',
    iconHover:   '0 6px 22px rgba(168,85,247,0.32)',
    text:        '#a855f7',
  },
  'text-success': {
    stripe:      'linear-gradient(90deg, #10B981 0%, #6ee7b7 100%)',
    iconBg:      'linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(16,185,129,0.06) 100%)',
    iconShadow:  '0 4px 14px rgba(16,185,129,0.22)',
    iconHover:   '0 6px 22px rgba(16,185,129,0.32)',
    text:        '#10B981',
  },
}

export function StatCard({ label, value, icon: Icon, color, loading, index = 0 }) {
  const counted = useCountUp(typeof value === 'number' ? value : null)
  const display = loading
    ? null
    : typeof value === 'number'
      ? counted.toLocaleString()
      : (value ?? '—')

  const accent = ACCENT[color] ?? ACCENT['text-primary']

  return (
    <Card
      className={cn('animate-fade-up card-lift stat-card-accent group overflow-hidden')}
      style={{
        animationDelay: `${index * 80}ms`,
        '--stat-stripe': accent.stripe,
      }}
    >
      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider truncate"
               style={{ color: 'hsl(var(--muted-foreground))' }}>
              {label}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <p className="text-3xl font-bold text-foreground mt-1.5 tabular-nums leading-none">
                {display}
              </p>
            )}
          </div>

          {Icon && (
            <div
              className="stat-icon-wrap"
              style={{
                '--icon-bg':          accent.iconBg,
                '--icon-shadow':      accent.iconShadow,
                '--icon-shadow-hover': accent.iconHover,
                color: accent.text,
              }}
            >
              <Icon size={20} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
