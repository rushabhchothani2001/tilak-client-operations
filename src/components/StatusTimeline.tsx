import { useI18n } from '../i18n';
import type { StatusHistoryEntry } from '../types';

export function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  const { t, f } = useI18n();
  if (history.length === 0) return <p className="muted">{t('timeline.empty')}</p>;

  const entries = [...history].reverse();
  return (
    <ol className="timeline">
      {entries.map((entry, index) => (
        <li key={`${entry.changedAt}-${index}`} className={index === 0 ? 'is-current' : ''}>
          <span className="timeline__status">{f.status(entry.status)}</span>
          {entry.producedQuantity != null && (
            <span className="timeline__note">{t('timeline.produced', { n: f.number(entry.producedQuantity) })}</span>
          )}
          <span className="timeline__time">
            <time dateTime={entry.changedAt}>{f.dateTime(entry.changedAt)}</time>
            {entry.changedBy ? ` · ${entry.changedBy}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}
