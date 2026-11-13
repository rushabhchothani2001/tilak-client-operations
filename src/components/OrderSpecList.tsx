import type { OrderSpec } from '../types';
import {
  formatDate,
  formatFluted,
  formatLaminated,
  formatLaminationSize,
  formatNumber,
  formatPaper,
  formatPly,
  formatSize,
} from '../lib/format';

/** One-line summary of an order's box: "14 × 10 × 8 inch · 3 Ply · Plain · Laminated". */
export function specSummary(order: OrderSpec) {
  return [formatSize(order.size), formatPly(order), formatPaper(order), formatLaminated(order) || null]
    .filter(Boolean)
    .join(' · ');
}

/** The box specification of an order. Contains no customer information. */
export function OrderSpecList({ order }: { order: OrderSpec }) {
  const rows: [string, string][] = [
    ['Product', order.productName || '—'],
    ['Size (L × W × H)', formatSize(order.size)],
    ['Box type', formatPly(order)],
    ['Paper', formatPaper(order)],
    ['Inside paper — top', String(order.insidePaper.top)],
    ['Inside paper — fluted', formatFluted(order.insidePaper.fluted)],
    ['Laminated', order.laminated ? (order.laminationSize ? `Yes · ${formatLaminationSize(order)}` : 'Yes') : 'No'],
    ['Quantity', `${formatNumber(order.quantity)} boxes`],
    ['Expected delivery', formatDate(order.expectedDeliveryDate)],
  ];

  return (
    <dl className="spec-list">
      {rows.map(([label, value]) => (
        <div className="spec-list__row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
