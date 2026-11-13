import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, useAuth } from '../auth/AuthContext';
import type { UserRole } from '../types';
import { Icon, type IconName } from './icons';

const NAV: { to: string; label: string; icon: IconName; roles: UserRole[] }[] = [
  { to: '/orders', label: 'Orders', icon: 'orders', roles: ['admin'] },
  { to: '/manufacturing', label: 'Manufacturing', icon: 'factory', roles: ['admin', 'worker'] },
  { to: '/customers', label: 'Customers', icon: 'customers', roles: ['admin'] },
  { to: '/users', label: 'Users', icon: 'users', roles: ['admin'] },
];

/** Account button with a small menu: who is signed in, and Log out. */
function AccountMenu({ align }: { align: 'up' | 'down' }) {
  const { user, logout } = useAuth();
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
        aria-label={`Account: ${user.name}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="account__who">
          <span className="account__name">{user.name}</span>
          <span className="account__role">{ROLE_LABELS[user.role]}</span>
        </span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu__head">
            <strong>{user.name}</strong>
            <span>
              {user.username} · {ROLE_LABELS[user.role]}
            </span>
          </div>
          <button type="button" role="menuitem" className="menu__item" onClick={handleLogout}>
            <Icon name="logout" size={18} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
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
        <NavLink to="/" className="sidebar__logo" aria-label="Tilak Industries home">
          <img src="/logo.png" alt="Tilak Industries" width={140} height={74} />
        </NavLink>
        <nav className="sidenav" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="sidenav__link">
              <Icon name={item.icon} size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__foot">
          <AccountMenu align="up" />
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="topbar">
        <NavLink to="/" className="topbar__logo" aria-label="Tilak Industries home">
          <img src="/logo.png" alt="Tilak Industries" width={68} height={36} />
        </NavLink>
        <AccountMenu align="down" />
      </header>

      <main className="main">
        <Outlet />
      </main>

      {/* Phone bottom tabs (only when there is more than one place to go) */}
      {hasTabs && (
        <nav className="tabbar" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="tabbar__link">
              <Icon name={item.icon} size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
