import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/http';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { Alert, Field } from '../components/ui';
import type { UserRole } from '../types';

const ADMIN_ONLY_PREFIXES = ['/orders', '/customers', '/users'];

/** Send the user back where they were going, unless their role can't open it. */
function destinationFor(role: UserRole, from: string | undefined) {
  if (!from || from === '/login') return homePathFor(role);
  if (role !== 'admin' && ADMIN_ONLY_PREFIXES.some((p) => from.startsWith(p))) return homePathFor(role);
  return from;
}

export function LoginPage() {
  const { user, loading, login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="state">Loading…</div>;
  if (user) return <Navigate to={destinationFor(user.role, from)} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }
    setSubmitting(true);
    try {
      const loggedIn = await login(username.trim(), password);
      navigate(destinationFor(loggedIn.role, from), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <div className="login__panel">
        <img className="login__logo" src="/logo.png" alt="Tilak Industries" width={168} height={89} />
        <h1 className="login__title">Log in</h1>
        <p className="login__subtitle">Orders, production and customers.</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {sessionExpired && !error && <Alert>Your session has expired. Please log in again.</Alert>}
          {error && <Alert>{error}</Alert>}

          <Field label="Username" htmlFor="username">
            <input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <button type="submit" className="button button--primary button--lg button--block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="login__footnote">Forgot your password? Ask the admin to reset it.</p>
      </div>
    </div>
  );
}
