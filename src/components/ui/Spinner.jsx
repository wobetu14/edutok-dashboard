import clsx from 'clsx';

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div
      className={clsx(
        'border-4 border-primary border-t-transparent rounded-full animate-spin',
        sizes[size],
        className,
      )}
    />
  );
}
