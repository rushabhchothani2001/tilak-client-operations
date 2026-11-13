import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ROLE_LABELS, useAuth } from '../auth/AuthContext';
import type { UserRole } from '../types';

type IconName = 'clipboard' | 'factory' | 'users' | 'key';

const NAV: { to: string; label: string; description: string; icon: IconName; roles: UserRole[] }[] = [
  { to: '/orders', label: 'Order Taking', description: 'Place & track orders', icon: 'clipboard', roles: ['admin'] },
  {
    to: '/manufacturing',
    label: 'Manufacturing',
    description: 'Update production status',
    icon: 'factory',
    roles: ['admin', 'worker'],
  },
  { to: '/customers', label: 'Customers', description: 'Customer details', icon: 'users', roles: ['admin'] },
  { to: '/users', label: 'Users', description: 'Logins & roles', icon: 'key', roles: ['admin'] },
];

const ICONS: Record<IconName, JSX.Element> = {
  clipboard: (
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4" />
  ),
  factory: <path d="M3 20V10l5 3V10l5 3V6h3l1-3h2l1 3v14zM7 17h2M12 17h2M17 17h1" />,
  users: (
    <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8" />
  ),
  key: <path d="M14.5 9.5a4 4 0 1 0-3.9 4L4 20v-2.5h2.5V15H9l1.6-1.6M16 7.5h.01" />,
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const items = NAV.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />
            </svg>
          </span>
          <span className="brand__text">
            <strong>Tilak Industries</strong>
            <small>Corrugated Boxes</small>
          </span>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}>
              <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true">
                {ICONS[item.icon]}
              </svg>
              <span className="nav__text">
                <span className="nav__label">{item.label}</span>
                <span className="nav__desc">{item.description}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="sidebar__user">
            <span className="sidebar__avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="sidebar__who">
              <strong>{user.name}</strong>
              <small>{ROLE_LABELS[user.role]}</small>
            </span>
            <button type="button" className="sidebar__logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
