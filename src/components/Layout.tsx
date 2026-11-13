import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n, type MessageKey } from '../i18n';
import type { UserRole } from '../types';
import { Icon, type IconName } from './icons';
import { LanguagePicker } from './LanguagePicker';

const NAV: { to: string; label: MessageKey; icon: IconName; roles: UserRole[] }[] = [
  { to: '/orders', label: 'nav.orders', icon: 'orders', roles: ['admin'] },
  { to: '/manufacturing', label: 'nav.manufacturing', icon: 'factory', roles: ['admin', 'worker'] },
  { to: '/customers', label: 'nav.customers', icon: 'customers', roles: ['admin'] },
  { to: '/users', label: 'nav.users', icon: 'users', roles: ['admin'] },
];

/** Account button with a small menu: who is signed in, language, and Log out. */
function AccountMenu({ align }: { align: 'up' | 'down' }) {
  const { user, logout } = useAuth();
  const { t, f } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`account account--${align}`} ref={ref}>
      <button
        type="button"
        className="account__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account.label', { name: user.name })}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="account__who">
          <span className="account__name">{user.name}</span>
          <span className="account__role">{f.role(user.role)}</span>
        </span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu__head">
            <strong>{user.name}</strong>
            <span>
              {user.username} · {f.role(user.role)}
            </span>
          </div>
          <LanguagePicker variant="menu" onPicked={() => setOpen(false)} />
          <div className="menu__divider" role="separator" />
          <button type="button" role="menuitem" className="menu__item" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            {t('account.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const items = NAV.filter((item) => user && item.roles.includes(user.role));
  const hasTabs = items.length > 1;

  // Start each screen at the top on phones.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className={`app ${hasTabs ? 'app--tabs' : ''}`}>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <NavLink to="/" className="sidebar__logo" aria-label={t('nav.home')}>
          <img src="/logo.png" alt="Tilak Industries" width={140} height={74} />
        </NavLink>
        <nav className="sidenav" aria-label={t('nav.main')}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="sidenav__link">
              <Icon name={item.icon} size={18} />
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <AccountMenu align="up" />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="topbar">
        <NavLink to="/" className="topbar__logo" aria-label={t('nav.home')}>
          <img src="/logo.png" alt="Tilak Industries" width={68} height={36} />
        </NavLink>
        <AccountMenu align="down" />
      </header>

      <main className="main">
        <Outlet />
      </main>

      {/* Phone bottom tabs (only when there is more than one place to go) */}
      {hasTabs && (
        <nav className="tabbar" aria-label={t('nav.main')}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="tabbar__link">
              <Icon name={item.icon} size={22} />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
