import { useState } from 'react';
import { usersApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { Icon } from '../../components/icons';
import { Alert, LoadingState, Modal, PageHeader } from '../../components/ui';
import { LANGUAGES, useI18n } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import type { User } from '../../types';
import { UserForm } from './UserForm';

type Editing = { mode: 'create' } | { mode: 'edit'; user: User } | null;

const languageLabel = (code: User['language']) => LANGUAGES.find((l) => l.code === code)?.label ?? '—';

export function UsersPage() {
  const { t, f } = useI18n();
  const { user: currentUser, setUser } = useAuth();
  const users = useAsync(() => usersApi.list(), []);
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaved = (saved: User) => {
    setMessage(
      editing?.mode === 'edit'
        ? t('users.updated', { name: saved.name })
        : t('users.created', { name: saved.name, username: saved.username }),
    );
    if (saved._id === currentUser?._id) setUser(saved);
    setEditing(null);
    users.reload();
  };

  const workers = users.data?.filter((u) => u.role === 'worker' && u.active).length ?? 0;

  return (
    <div className="page">
      <PageHeader
        title={t('users.title')}
        subtitle={users.data ? t('users.subtitle', { logins: users.data.length, workers }) : undefined}
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <Icon name="plus" size={18} />
            {t('users.add')}
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
                  <th>{t('users.col.name')}</th>
                  <th>{t('users.col.username')}</th>
                  <th>{t('users.col.role')}</th>
                  <th>{t('users.col.language')}</th>
                  <th>{t('users.col.account')}</th>
                  <th className="num">{t('users.col.lastLogin')}</th>
                  <th aria-label={t('common.actions')} />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u._id} className={u.active ? '' : 'is-inactive'}>
                    <td>
                      <span className="row-title">{u.name}</span>
                      {u._id === currentUser?._id && <span className="subline"> {t('users.you')}</span>}
                    </td>
                    <td>{u.username}</td>
                    <td>{f.role(u.role)}</td>
                    <td lang={u.language ?? undefined}>{languageLabel(u.language)}</td>
                    <td>{u.active ? t('users.active') : <span className="tag tag--negative">{t('users.disabled')}</span>}</td>
                    <td className="num nowrap">
                      {u.lastLoginAt ? f.dateTime(u.lastLoginAt) : <span className="dash">{t('users.never')}</span>}
                    </td>
                    <td className="row-actions">
                      <button type="button" className="link-button" onClick={() => setEditing({ mode: 'edit', user: u })}>
                        {t('common.edit')}
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
                          {u._id === currentUser?._id && <span className="subline"> {t('users.you')}</span>}
                        </span>
                        {u.active ? (
                          <span className="row-item__figure">{f.role(u.role)}</span>
                        ) : (
                          <span className="tag tag--negative">{t('users.disabled')}</span>
                        )}
                      </span>
                      <span className="row-item__sub">
                        {[
                          u.username,
                          u.language ? languageLabel(u.language) : null,
                          u.lastLoginAt ? t('users.lastLogin', { date: f.dateTime(u.lastLoginAt) }) : t('users.neverLoggedIn'),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
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
        <Modal
          title={editing.mode === 'edit' ? t('users.editTitle', { name: editing.user.name }) : t('users.add')}
          onClose={() => setEditing(null)}
        >
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
