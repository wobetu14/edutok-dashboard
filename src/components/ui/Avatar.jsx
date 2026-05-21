import clsx from 'clsx';

export default function Avatar({ src, name = '', size = 'md', className }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name}
      className={clsx('rounded-full object-cover flex-shrink-0', sizes[size], className)}
    />
  ) : (
    <div
      className={clsx(
        'rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center flex-shrink-0',
        sizes[size],
        className,
      )}
    >
      {initials || '?'}
    </div>
  );
}
