import { useI18n } from '../i18n';
import { formatFluted } from '../lib/format';
import type { OrderSpec } from '../types';

/** The box specification of an order. Contains no customer information. */
export function OrderSpecList({ order }: { order: OrderSpec }) {
  const { t, f } = useI18n();
  const rows: [string, string][] = [
    [t('spec.product'), order.productName || '—'],
    [t('spec.size'), f.size(order.size)],
    [t('spec.boxType'), f.ply(order)],
    [t('spec.paper'), f.paper(order)],
    [t('spec.insideTop'), String(order.insidePaper.top)],
    [t('spec.insideFluted'), formatFluted(order.insidePaper.fluted)],
    [
      t('spec.laminated'),
      order.laminated
        ? order.laminationSize
          ? `${t('common.yes')} · ${f.laminationSize(order)}`
          : t('common.yes')
        : t('common.no'),
    ],
    [t('spec.quantity'), f.boxes(order.quantity)],
    [t('spec.expectedDelivery'), f.date(order.expectedDeliveryDate)],
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
