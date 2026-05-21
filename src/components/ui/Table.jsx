import clsx from 'clsx';
import Spinner from './Spinner';

export function Table({ columns, rows, isLoading, emptyMessage = 'No data found.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Spinner className="mx-auto" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-border last:border-0 hover:bg-bg transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, total, limit, onChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted">
      <span>{total} total</span>
      <div className="flex gap-1">
        <button
          className="px-3 py-1 rounded-lg hover:bg-border disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ‹ Prev
        </button>
        <span className="px-3 py-1 text-ink font-medium">{page} / {totalPages}</span>
        <button
          className="px-3 py-1 rounded-lg hover:bg-border disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
