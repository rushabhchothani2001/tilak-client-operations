import { FormEvent, useState } from 'react';
import { usersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { ROLE_LABELS } from '../../auth/AuthContext';
import { Alert, Field, SegmentedControl } from '../../components/ui';
import { toOptions } from '../../lib/labels';
import type { UpdateUserInput, User, UserRole } from '../../types';

const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/;

export function UserForm({
  user,
  isSelf,
  onSaved,
  onCancel,
}: {
  user?: User;
  isSelf: boolean;
  onSaved: (user: User) => void;
  onCancel: () => void;
}) {
  const editing = Boolean(user);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'worker');
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!editing && !USERNAME_REGEX.test(username.trim().toLowerCase()))
      next.username = '3–30 characters: letters, numbers, dot, dash or underscore';
    if (!editing && password.length < 8) next.password = 'Password must be at least 8 characters';
    if (editing && password && password.length < 8) next.password = 'Password must be at least 8 characters';
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSaving(true);
    try {
      let saved: User;
      if (user) {
        const changes: UpdateUserInput = { name: name.trim(), role, active };
        if (password) changes.password = password;
        saved = await usersApi.update(user._id, changes);
      } else {
        saved = await usersApi.create({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
        });
      }
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      setSubmitError(errorMessage(error));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {submitError && <Alert>{submitError}</Alert>}

      <div className="grid-2">
        <Field label="Full name *" htmlFor="userName" error={errors.name}>
          <input id="userName" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label="Username *"
          htmlFor="username"
          error={errors.username}
          hint={editing ? 'Username cannot be changed' : 'Used to log in'}
        >
          <input
            id="username"
            autoCapitalize="none"
            autoComplete="off"
            disabled={editing}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
          />
        </Field>
      </div>

      <div className="grid-2">
        <Field
          label="Role"
          error={errors.role}
          hint={role === 'admin' ? 'Full access to all modules' : 'Manufacturing module only'}
        >
          {isSelf ? (
            <p className="muted small">You can't change your own role.</p>
          ) : (
            <SegmentedControl label="Role" options={toOptions(ROLE_LABELS)} value={role} onChange={setRole} />
          )}
        </Field>

        {editing && (
          <Field label="Account status" hint={active ? 'Can log in' : 'Cannot log in'}>
            {isSelf ? (
              <p className="muted small">You can't disable your own account.</p>
            ) : (
              <SegmentedControl
                label="Account status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
                value={active ? 'active' : 'disabled'}
                onChange={(v) => setActive(v === 'active')}
              />
            )}
          </Field>
        )}
      </div>

      <Field
        label={editing ? 'New password' : 'Password *'}
        htmlFor="newPassword"
        error={errors.password}
        hint={editing ? 'Leave blank to keep the current password. Changing it signs the user out.' : 'At least 8 characters'}
      >
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add user'}
        </button>
      </div>
    </form>
  );
}
