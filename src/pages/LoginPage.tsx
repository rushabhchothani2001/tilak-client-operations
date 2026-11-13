import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/http';
import { homePathFor, useAuth } from '../auth/AuthContext';
import { LanguagePicker } from '../components/LanguagePicker';
import { Alert, Field, LoadingState } from '../components/ui';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState />;
  if (user) return <Navigate to={destinationFor(user.role, from)} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(t('login.missing'));
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
        <LanguagePicker />
        <img className="login__logo" src="/logo.png" alt="Tilak Industries" width={168} height={89} />
        <h1 className="login__title">{t('login.title')}</h1>
        <p className="login__subtitle">{t('login.subtitle')}</p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {sessionExpired && !error && <Alert>{t('err.sessionExpired')}</Alert>}
          {error && <Alert>{error}</Alert>}

          <Field label={t('login.username')} htmlFor="username">
            <input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field label={t('login.password')} htmlFor="password">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <button type="submit" className="button button--primary button--lg button--block" disabled={submitting}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="login__footnote">{t('login.forgot')}</p>
      </div>
    </div>
  );
}
