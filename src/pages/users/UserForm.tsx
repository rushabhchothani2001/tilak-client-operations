import { FormEvent, useState } from 'react';
import { usersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { Alert, Field, SegmentedControl } from '../../components/ui';
import { LANGUAGES, useI18n } from '../../i18n';
import { USER_ROLES, type Language, type UpdateUserInput, type User, type UserRole } from '../../types';

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
  const { t, lang } = useI18n();
  const editing = Boolean(user);
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'worker');
  // New people default to the language the admin is using; edits keep the saved one.
  const [language, setLanguage] = useState<Language>(user?.language ?? lang);
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('v.name');
    if (!editing && !USERNAME_REGEX.test(username.trim().toLowerCase())) next.username = t('v.username');
    if (!editing && password.length < 8) next.password = t('v.password');
    if (editing && password && password.length < 8) next.password = t('v.password');
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
        const changes: UpdateUserInput = { name: name.trim(), role, active, language };
        if (password) changes.password = password;
        saved = await usersApi.update(user._id, changes);
      } else {
        saved = await usersApi.create({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
          language,
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
        <Field label={t('uform.fullName')} htmlFor="userName" error={errors.name}>
          <input id="userName" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label={t('uform.username')}
          htmlFor="username"
          error={errors.username}
          hint={editing ? t('uform.usernameFixed') : t('uform.usernameHint')}
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
          label={t('uform.role')}
          error={errors.role}
          hint={role === 'admin' ? t('uform.roleAdminHint') : t('uform.roleWorkerHint')}
        >
          {isSelf ? (
            <p className="note">{t('uform.ownRole')}</p>
          ) : (
            <SegmentedControl
              label={t('uform.role')}
              options={USER_ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))}
              value={role}
              onChange={setRole}
            />
          )}
        </Field>

        {editing && (
          <Field label={t('uform.status')} hint={active ? t('uform.canLogin') : t('uform.cannotLogin')}>
            {isSelf ? (
              <p className="note">{t('uform.ownStatus')}</p>
            ) : (
              <SegmentedControl
                label={t('uform.status')}
                options={[
                  { value: 'active', label: t('users.active') },
                  { value: 'disabled', label: t('users.disabled') },
                ]}
                value={active ? 'active' : 'disabled'}
                onChange={(v) => setActive(v === 'active')}
              />
            )}
          </Field>
        )}
      </div>

      <Field label={t('common.language')} error={errors.language} hint={t('uform.languageHint')}>
        <SegmentedControl
          label={t('common.language')}
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
          value={language}
          onChange={setLanguage}
        />
      </Field>

      <Field
        label={editing ? t('uform.newPassword') : t('uform.password')}
        htmlFor="newPassword"
        error={errors.password}
        hint={editing ? t('uform.passwordEditHint') : t('uform.passwordHint')}
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
        <button type="button" className="button button--secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('users.add')}
        </button>
      </div>
    </form>
  );
}
