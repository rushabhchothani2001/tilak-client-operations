import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FINAL_STATUS, WORKER_STATUSES, type OrderStatus } from '../types';
import { STATUS_LABELS } from '../lib/labels';
import { Icon } from './icons';

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <header className="page-header">
      {back && (
        <Link to={back.to} className="back-link">
          <Icon name="back" size={16} />
          {back.label}
        </Link>
      )}
      <div className="page-header__row">
        <div className="page-header__text">
          <h1>{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      {htmlFor ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="field__label">{label}</span>
      )}
      {children}
      {error ? <p className="field__error">{error}</p> : hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

/** A row of buttons for picking exactly one option. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'choice',
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** "choice" for form answers, "filter" for list filters. */
  variant?: 'choice' | 'filter';
}) {
  return (
    <div className={`segmented segmented--${variant}`} role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`segmented__option ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** How many of the six production steps are done for a status. */
export function stagesDone(status: OrderStatus): number {
  return status === 'order_placed' ? 0 : WORKER_STATUSES.indexOf(status as (typeof WORKER_STATUSES)[number]) + 1;
}

/** The order's journey through the factory: its status and six steps, filled up to where it is. */
export function StageProgress({ status, compact = false }: { status: OrderStatus; compact?: boolean }) {
  const done = stagesDone(status);
  const complete = status === FINAL_STATUS;
  return (
    <div className={`stage ${compact ? 'stage--compact' : ''}`}>
      <span className="stage__label">{STATUS_LABELS[status]}</span>
      <span
        className="stage__bar"
        role="img"
        aria-label={`Step ${done} of ${WORKER_STATUSES.length}`}
      >
        {WORKER_STATUSES.map((s, i) => (
          <i key={s} className={i < done ? (complete ? 'is-complete' : 'is-done') : undefined} />
        ))}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === 'order_placed' ? 'waiting' : status === FINAL_STATUS ? 'complete' : 'progress';
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'success' && <Icon name="check" size={18} />}
      <div className="alert__body">{children}</div>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div className="state">{label}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      {children}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ordered vs produced quantity, side by side. */
export function QuantityCompare({ ordered, produced }: { ordered: number; produced: number | null }) {
  const diff = produced === null ? null : produced - ordered;
  return (
    <dl className="qty-compare">
      <div className="qty-compare__cell">
        <dt>Ordered</dt>
        <dd className="num">{ordered.toLocaleString('en-IN')}</dd>
      </div>
      <div className="qty-compare__cell">
        <dt>Produced</dt>
        <dd className="num">{produced === null ? <span className="dash">—</span> : produced.toLocaleString('en-IN')}</dd>
      </div>
      <div className="qty-compare__cell">
        <dt>Difference</dt>
        <dd className={`num ${diff !== null && diff < 0 ? 'is-short' : ''}`}>
          {diff === null ? (
            <span className="dash">—</span>
          ) : diff === 0 ? (
            'Exact'
          ) : (
            `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('en-IN')}`
          )}
        </dd>
      </div>
    </dl>
  );
}
