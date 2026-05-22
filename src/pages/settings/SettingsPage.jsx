import { Type } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSettings, FONT_SIZE_OPTIONS } from '@/context/SettingsContext'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { fontSize, setFontSize } = useSettings()

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your display preferences.</p>
      </div>

      {/* Font Size */}
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Type size={16} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Font Size</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Adjusts text size across all pages and components.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Picker */}
          <div className="grid grid-cols-3 gap-3">
            {FONT_SIZE_OPTIONS.map(({ key, label, px }) => {
              const active = fontSize === key
              return (
                <button
                  key={key}
                  onClick={() => setFontSize(key)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                  )}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <span
                    className="font-bold text-foreground leading-none"
                    style={{ fontSize: px }}
                  >
                    Aa
                  </span>
                  <span className={cn('text-xs font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{px}px</span>
                </button>
              )
            })}
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Preview
            </p>
            <p className="text-2xl font-bold text-foreground leading-tight">EduTok Dashboard</p>
            <p className="text-base text-foreground">
              Manage your learning platform with ease.
            </p>
            <p className="text-sm text-muted-foreground">
              Browse courses, users, and analytics in one place.
            </p>
            <p className="text-xs text-muted-foreground">
              Last updated · just now
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
