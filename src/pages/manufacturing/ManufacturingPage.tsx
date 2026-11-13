import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturingApi, type ManufacturingFilter } from '../../api';
import { Alert, EmptyState, LoadingState, PageHeader, SegmentedControl, StatusBadge } from '../../components/ui';
import { daysUntil, formatDate, formatNumber, formatPaper, formatPly, formatSize } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const FILTERS: { value: ManufacturingFilter; label: string }[] = [
  { value: 'active', label: 'In production' },
  { value: 'ready_to_shipment', label: 'Ready for shipment' },
  { value: 'all', label: 'All orders' },
];

function DueLabel({ date, done }: { date: string; done: boolean }) {
  const days = daysUntil(date);
  if (done) return <span className="muted">Due {formatDate(date)}</span>;
  if (days < 0) return <span className="due due--late">Overdue by {-days}d · {formatDate(date)}</span>;
  if (days === 0) return <span className="due due--soon">Due today</span>;
  if (days <= 3) return <span className="due due--soon">Due in {days}d · {formatDate(date)}</span>;
  return <span className="muted">Due {formatDate(date)}</span>;
}

export function ManufacturingPage() {
  const [filter, setFilter] = useState<ManufacturingFilter>('active');
  const orders = useAsync(() => manufacturingApi.list(filter), [filter]);

  return (
    <div className="page">
      <PageHeader title="Manufacturing" subtitle="Open an order to update its production status." />

      <div className="toolbar">
        <SegmentedControl label="Filter orders" options={FILTERS} value={filter} onChange={setFilter} />
        <button type="button" className="button button--ghost" onClick={orders.reload}>
          Refresh
        </button>
      </div>

      {orders.error && <Alert>{orders.error}</Alert>}

      {orders.loading && !orders.data ? (
        <LoadingState />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState title="No orders here" />
      ) : (
        <div className="order-cards">
          {orders.data?.map((order) => {
            const done = order.status === 'ready_to_shipment';
            return (
              <Link key={order._id} to={`/manufacturing/${order._id}`} className="card order-card">
                <div className="order-card__top">
                  <span className="order-card__number">{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-card__size">{formatSize(order.size)}</div>
                <div className="order-card__meta">
                  <span>{formatPly(order)}</span>
                  <span>{formatPaper(order)}</span>
                  {order.laminated && <span>Laminated</span>}
                </div>
                <div className="order-card__bottom">
                  <span>
                    <strong>{formatNumber(order.quantity)}</strong> ordered
                    {order.producedQuantity !== null && (
                      <>
                        {' · '}
                        <strong>{formatNumber(order.producedQuantity)}</strong> produced
                      </>
                    )}
                  </span>
                  <DueLabel date={order.expectedDeliveryDate} done={done} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
