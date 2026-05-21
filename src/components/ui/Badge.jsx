import clsx from 'clsx';

export default function Badge({ children, color = 'bg-gray-100 text-gray-600', className }) {
  return (
    <span className={clsx('badge', color, className)}>
      {children}
    </span>
  );
}
