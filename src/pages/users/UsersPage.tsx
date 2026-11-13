import { useState } from 'react';
import { usersApi } from '../../api';
import { ROLE_LABELS, useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/icons';
import { Alert, LoadingState, Modal, PageHeader } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { User } from '../../types';
import { UserForm } from './UserForm';

type Editing = { mode: 'create' } | { mode: 'edit'; user: User } | null;

export function UsersPage() {
  const { user: currentUser, setUser } = useAuth();
  const users = useAsync(() => usersApi.list(), []);
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaved = (saved: User) => {
    setMessage(editing?.mode === 'edit' ? `${saved.name} updated.` : `${saved.name} can now log in as "${saved.username}".`);
    if (saved._id === currentUser?._id) setUser(saved);
    setEditing(null);
    users.reload();
  };

  const workers = users.data?.filter((u) => u.role === 'worker' && u.active).length ?? 0;

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle={users.data ? `${users.data.length} logins · ${workers} active ${workers === 1 ? 'worker' : 'workers'}` : undefined}
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <Icon name="plus" size={18} />
            Add user
          </button>
        }
      />

      {message && <Alert tone="success">{message}</Alert>}
      {users.error && <Alert>{users.error}</Alert>}

      {users.loading && !users.data ? (
        <LoadingState />
      ) : (
        users.data && (
          <div className="panel">
            <table className="table hide-phone">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Account</th>
                  <th className="num">Last login</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u._id} className={u.active ? '' : 'is-inactive'}>
                    <td>
                      <span className="row-title">{u.name}</span>
                      {u._id === currentUser?._id && <span className="subline"> (you)</span>}
                    </td>
                    <td>{u.username}</td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td>{u.active ? 'Active' : <span className="tag tag--negative">Disabled</span>}</td>
                    <td className="num nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="dash">Never</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="link-button" onClick={() => setEditing({ mode: 'edit', user: u })}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="row-list show-phone">
              {users.data.map((u) => (
                <li key={u._id}>
                  <button
                    type="button"
                    className={`row-item row-item__button ${u.active ? '' : 'is-inactive'}`}
                    onClick={() => setEditing({ mode: 'edit', user: u })}
                  >
                    <span className="row-item__main">
                      <span className="row-item__line">
                        <span className="row-title">
                          {u.name}
                          {u._id === currentUser?._id && <span className="subline"> (you)</span>}
                        </span>
                        {u.active ? (
                          <span className="row-item__figure">{ROLE_LABELS[u.role]}</span>
                        ) : (
                          <span className="tag tag--negative">Disabled</span>
                        )}
                      </span>
                      <span className="row-item__sub">
                        {u.username} · {u.lastLoginAt ? `Last login ${formatDateTime(u.lastLoginAt)}` : 'Never logged in'}
                      </span>
                    </span>
                    <Icon name="chevron" size={18} className="row-item__chevron" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {editing && (
        <Modal title={editing.mode === 'edit' ? `Edit ${editing.user.name}` : 'Add user'} onClose={() => setEditing(null)}>
          <UserForm
            user={editing.mode === 'edit' ? editing.user : undefined}
            isSelf={editing.mode === 'edit' && editing.user._id === currentUser?._id}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
