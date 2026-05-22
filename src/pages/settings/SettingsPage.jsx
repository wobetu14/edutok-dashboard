import { Sun, Moon, Type, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useSettings, FONT_SIZE_OPTIONS, PALETTE_OPTIONS } from '@/context/SettingsContext'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', Icon: Sun  },
  { key: 'dark',  label: 'Dark',  Icon: Moon },
]

export default function SettingsPage() {
  const { fontSize, setFontSize, theme, setTheme, palette, setPalette } = useSettings()

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your display preferences.</p>
      </div>

      {/* Theme */}
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              {theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
            </div>
            <div>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Choose between light and dark interface.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {THEME_OPTIONS.map(({ key, label, Icon }) => {
              const active = theme === key
              return (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                  )}
                >
                  {active && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
                  )}
                  <Icon
                    size={24}
                    className={active ? 'text-primary' : 'text-muted-foreground'}
                  />
                  <span className={cn('text-sm font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card className="card-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <Palette size={16} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Color Palette</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Pick an accent color used across buttons, links, and highlights.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {PALETTE_OPTIONS.map(({ key, name, primary, secondary }) => {
              const active = palette === key
              return (
                <button
                  key={key}
                  onClick={() => setPalette(key)}
                  title={name}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                    active
                      ? 'border-[var(--swatch-primary)] bg-[var(--swatch-primary)]/5 shadow-sm'
                      : 'border-border bg-card hover:border-[var(--swatch-primary)]/50 hover:bg-muted/50',
                  )}
                  style={{ '--swatch-primary': primary, '--swatch-secondary': secondary }}
                >
                  {active && (
                    <span
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                      style={{ background: primary }}
                    />
                  )}
                  {/* Colour swatch — split circle showing primary + secondary */}
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 shadow-sm ring-2 ring-offset-2 ring-offset-card transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)`,
                      ringColor: active ? primary : 'transparent',
                      outline: active ? `2px solid ${primary}` : '2px solid transparent',
                      outlineOffset: '2px',
                    }}
                  />
                  <span
                    className="text-[11px] font-medium leading-tight"
                    style={{ color: active ? primary : undefined }}
                  >
                    {name}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Live preview strip */}
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 flex items-center gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              Preview
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button className="btn-primary px-3 py-1.5 text-xs rounded-lg">
                Primary Button
              </button>
              <span className="text-primary text-sm font-semibold underline underline-offset-2 cursor-pointer">
                Link text
              </span>
              <span className="badge bg-primary/10 text-primary text-xs px-2 py-0.5">
                Badge
              </span>
              <span className="w-3 h-3 rounded-full bg-primary inline-block" />
              <span className="w-3 h-3 rounded-full bg-secondary inline-block" />
            </div>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-base text-foreground">Manage your learning platform with ease.</p>
            <p className="text-sm text-muted-foreground">Browse courses, users, and analytics in one place.</p>
            <p className="text-xs text-muted-foreground">Last updated · just now</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
