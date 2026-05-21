import clsx from 'clsx';

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <input className={clsx('input', error && 'border-danger focus:ring-danger/30', className)} {...props} />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
