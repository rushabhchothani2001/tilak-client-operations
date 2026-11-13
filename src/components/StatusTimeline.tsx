import type { StatusHistoryEntry } from '../types';
import { STATUS_LABELS } from '../lib/labels';
import { formatDateTime, formatNumber } from '../lib/format';

export function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (history.length === 0) return <p className="muted">No status updates yet.</p>;

  const entries = [...history].reverse();
  return (
    <ol className="timeline">
      {entries.map((entry, index) => (
        <li key={`${entry.changedAt}-${index}`} className={index === 0 ? 'is-current' : ''}>
          <span className="timeline__status">{STATUS_LABELS[entry.status]}</span>
          {entry.producedQuantity != null && (
            <span className="timeline__note">Produced {formatNumber(entry.producedQuantity)}</span>
          )}
          <span className="timeline__time">
            <time dateTime={entry.changedAt}>{formatDateTime(entry.changedAt)}</time>
            {entry.changedBy ? ` · ${entry.changedBy}` : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}
