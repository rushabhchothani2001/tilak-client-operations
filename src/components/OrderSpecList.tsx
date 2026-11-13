import type { OrderSpec } from '../types';
import { formatDate, formatFluted, formatNumber, formatPaper, formatPly, formatSize } from '../lib/format';

/** The box specification of an order. Contains no customer information. */
export function OrderSpecList({ order }: { order: OrderSpec }) {
  const rows: [string, string][] = [
    ['Size (L × W × H)', formatSize(order.size)],
    ['Box type', formatPly(order)],
    ['Paper', formatPaper(order)],
    ['Inside paper — Top', String(order.insidePaper.top)],
    ['Inside paper — Fluted', formatFluted(order.insidePaper.fluted)],
    ['Laminated', order.laminated ? 'Yes' : 'No'],
    ['Quantity', formatNumber(order.quantity)],
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
