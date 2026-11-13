import { ReactNode, useEffect } from 'react';
import type { OrderStatus } from '../types';
import { STATUS_LABELS } from '../lib/labels';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
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

/** Button group for picking exactly one option. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
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

const STATUS_TONE: Record<OrderStatus, string> = {
  order_placed: 'neutral',
  paper_cutting_in_process: 'progress',
  paper_import_from_outside: 'warning',
  liner_in_process: 'progress',
  liner_process_completed: 'progress',
  packaging_in_process: 'progress',
  ready_to_shipment: 'success',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge--${STATUS_TONE[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
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
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
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
    <div className="qty-compare">
      <div className="qty-compare__cell">
        <span className="qty-compare__label">Ordered</span>
        <span className="qty-compare__value">{ordered.toLocaleString('en-IN')}</span>
      </div>
      <div className="qty-compare__cell">
        <span className="qty-compare__label">Produced</span>
        <span className="qty-compare__value">{produced === null ? '—' : produced.toLocaleString('en-IN')}</span>
      </div>
      <div className="qty-compare__cell">
        <span className="qty-compare__label">Difference</span>
        <span
          className={`qty-compare__value ${
            diff === null ? '' : diff < 0 ? 'is-short' : diff > 0 ? 'is-extra' : 'is-exact'
          }`}
        >
          {diff === null ? '—' : diff === 0 ? 'Exact' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('en-IN')}`}
        </span>
      </div>
    </div>
  );
}
