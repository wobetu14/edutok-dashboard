import { cn } from '@/lib/utils'

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-[3px]', lg: 'w-8 h-8 border-4' }
  return (
    <div
      className={cn(
        'border-primary border-t-transparent rounded-full animate-spin',
        sizes[size],
        className,
      )}
    />
  )
}
