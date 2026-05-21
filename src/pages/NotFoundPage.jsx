import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4">
      <div className="text-6xl font-black text-primary">404</div>
      <h1 className="text-xl font-bold text-ink">Page not found</h1>
      <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
    </div>
  );
}
