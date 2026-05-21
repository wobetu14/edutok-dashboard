import clsx from 'clsx';

export function Card({ children, className, padding = true }) {
  return (
    <div className={clsx('card', padding && 'p-5', className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, color = 'text-primary', sub }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={clsx('p-3 rounded-xl bg-primary-light', color === 'text-primary' ? 'bg-primary-light' : color === 'text-secondary' ? 'bg-secondary-light' : 'bg-gray-100')}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-ink">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}
