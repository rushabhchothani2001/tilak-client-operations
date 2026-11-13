import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturingApi, type ManufacturingFilter } from '../../api';
import { Icon } from '../../components/icons';
import { specSummary } from '../../components/OrderSpecList';
import { Alert, EmptyState, LoadingState, PageHeader, SegmentedControl, StageProgress } from '../../components/ui';
import { daysUntil, formatDate, formatNumber } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { FINAL_STATUS } from '../../types';

const FILTERS: { value: ManufacturingFilter; label: string }[] = [
  { value: 'active', label: 'In production' },
  { value: 'ready_to_shipment', label: 'Ready' },
  { value: 'all', label: 'All' },
];

function DueLabel({ date, done }: { date: string; done: boolean }) {
  const days = daysUntil(date);
  if (done || days > 3) return <span>Due {formatDate(date)}</span>;
  if (days < 0) return <span className="due-late">Overdue {-days}d · {formatDate(date)}</span>;
  if (days === 0) return <span className="due-soon">Due today</span>;
  return <span className="due-soon">Due in {days}d · {formatDate(date)}</span>;
}

export function ManufacturingPage() {
  const [filter, setFilter] = useState<ManufacturingFilter>('active');
  const orders = useAsync(() => manufacturingApi.list(filter), [filter]);
  const count = orders.data?.length ?? 0;

  return (
    <div className="page">
      <PageHeader
        title="Manufacturing"
        subtitle={orders.data ? `${count} ${count === 1 ? 'order' : 'orders'} · earliest delivery first` : undefined}
        actions={
          <button type="button" className="button button--secondary" onClick={orders.reload}>
            Refresh
          </button>
        }
      />

      <div className="toolbar">
        <SegmentedControl label="Show orders" options={FILTERS} value={filter} onChange={setFilter} variant="filter" />
      </div>

      {orders.error && <Alert>{orders.error}</Alert>}

      {orders.loading && !orders.data ? (
        <LoadingState />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState title={filter === 'active' ? 'Nothing in production right now.' : 'No orders here.'} />
      ) : (
        <ul className="panel row-list">
          {orders.data?.map((order) => {
            const done = order.status === FINAL_STATUS;
            return (
              <li key={order._id}>
                <Link to={`/manufacturing/${order._id}`} className="row-item row-item--wide">
                  <div className="row-item__main">
                    <div className="row-item__line">
                      <span className="row-title">{order.orderNumber}</span>
                      <span className="row-item__figure num">
                        {formatNumber(order.quantity)} boxes
                        {order.producedQuantity !== null && (
                          <span className="subline"> · {formatNumber(order.producedQuantity)} made</span>
                        )}
                      </span>
                    </div>
                    <div className="row-item__spec">{specSummary(order)}</div>
                    <div className="row-item__sub">
                      <DueLabel date={order.expectedDeliveryDate} done={done} />
                    </div>
                    <div className="show-phone">
                      <StageProgress status={order.status} compact />
                    </div>
                  </div>
                  <div className="row-item__side">
                    <StageProgress status={order.status} />
                  </div>
                  <Icon name="chevron" size={18} className="row-item__chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
