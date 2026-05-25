import { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const TabsCtx = createContext({ value: '', onChange: () => {} })

export function Tabs({ value, onValueChange, children, className }) {
  return (
    <TabsCtx.Provider value={{ value, onChange: onValueChange }}>
      <div className={cn('flex flex-col gap-0', className)}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-border pb-0', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }) {
  const { value: active, onChange } = useContext(TabsCtx)
  const isActive = active === value
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const { value: active } = useContext(TabsCtx)
  if (active !== value) return null
  return <div className={cn('', className)}>{children}</div>
}
