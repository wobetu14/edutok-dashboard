import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.message?.includes('Access denied')
          ? err.message
          : err.response?.data?.message ?? 'Invalid credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-card mb-3">
            <span className="text-white font-black text-2xl">E</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">EduTok Dashboard</h1>
          <p className="text-sm text-muted mt-1">Sign in to your admin account</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-2xl border border-border shadow-card p-6 flex flex-col gap-4"
        >
          <Input
            label="Username"
            type="text"
            placeholder="e.g. superadmin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full justify-center mt-1" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          EduTok Admin Dashboard — Staff access only
        </p>
      </div>
    </div>
  );
}
