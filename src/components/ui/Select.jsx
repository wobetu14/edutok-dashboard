import clsx from 'clsx';

export default function Select({ label, options, className, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <select className={clsx('input appearance-none cursor-pointer', className)} {...props}>
        {options.map(({ value, label: l }) => (
          <option key={value} value={value}>{l}</option>
        ))}
      </select>
    </div>
  );
}
