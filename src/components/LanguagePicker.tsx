import { useAuth } from '../auth/AuthContext';
import { LANGUAGES, useI18n } from '../i18n';
import { Icon } from './icons';

/**
 * Language switcher. Each language is written in its own script so anyone can find theirs.
 * "buttons": a row of three buttons (login page). "menu": items for the account menu.
 */
export function LanguagePicker({ variant = 'buttons', onPicked }: { variant?: 'buttons' | 'menu'; onPicked?: () => void }) {
  const { lang, t } = useI18n();
  const { setLanguage } = useAuth();

  if (variant === 'menu') {
    return (
      <div className="menu__group" role="group" aria-label={t('common.language')}>
        <div className="menu__label">{t('common.language')}</div>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            role="menuitemradio"
            aria-checked={l.code === lang}
            lang={l.code}
            className={`menu__item ${l.code === lang ? 'is-current' : ''}`}
            onClick={() => {
              setLanguage(l.code);
              onPicked?.();
            }}
          >
            <span className="menu__check" aria-hidden="true">
              {l.code === lang && <Icon name="check" size={16} />}
            </span>
            {l.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="lang-buttons" role="radiogroup" aria-label={t('common.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={l.code === lang}
          lang={l.code}
          className={`lang-buttons__option ${l.code === lang ? 'is-selected' : ''}`}
          onClick={() => setLanguage(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
