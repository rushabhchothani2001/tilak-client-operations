import { useState } from 'react';
import { usersApi } from '../../api';
import { ROLE_LABELS, useAuth } from '../../auth/AuthContext';
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

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle="Who can log in. Workers only see the Manufacturing module."
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            + Add User
          </button>
        }
      />

      {message && <Alert tone="success">{message}</Alert>}
      {users.error && <Alert>{users.error}</Alert>}

      {users.loading && !users.data ? (
        <LoadingState />
      ) : (
        users.data && (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u._id} className={u.active ? '' : 'is-inactive'}>
                    <td>
                      <span className="strong">{u.name}</span>
                      {u._id === currentUser?._id && <span className="muted small"> (you)</span>}
                    </td>
                    <td className="mono">{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge--warning' : 'badge--neutral'}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge--success' : 'badge--danger'}`}>
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="nowrap">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : <span className="muted">Never</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="link-button" onClick={() => setEditing({ mode: 'edit', user: u })}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
