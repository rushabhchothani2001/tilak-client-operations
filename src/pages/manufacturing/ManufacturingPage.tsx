import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manufacturingApi, type ManufacturingFilter } from '../../api';
import { Icon } from '../../components/icons';
import { Alert, EmptyState, LoadingState, PageHeader, SegmentedControl, StageProgress } from '../../components/ui';
import { useI18n } from '../../i18n';
import { daysUntil } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { FINAL_STATUS } from '../../types';

function DueLabel({ date, done }: { date: string; done: boolean }) {
  const { t, f } = useI18n();
  const days = daysUntil(date);
  const formatted = f.date(date);
  if (done || days > 3) return <span>{t('due.date', { date: formatted })}</span>;
  if (days < 0) return <span className="due-late">{t('due.late', { days: -days, date: formatted })}</span>;
  if (days === 0) return <span className="due-soon">{t('due.today')}</span>;
  return <span className="due-soon">{t('due.soon', { days, date: formatted })}</span>;
}

export function ManufacturingPage() {
  const { t, tn, f } = useI18n();
  const [filter, setFilter] = useState<ManufacturingFilter>('active');
  const orders = useAsync(() => manufacturingApi.list(filter), [filter]);
  const count = orders.data?.length ?? 0;

  const filters: { value: ManufacturingFilter; label: string }[] = [
    { value: 'active', label: t('mfg.filter.active') },
    { value: 'ready_to_shipment', label: t('mfg.filter.ready') },
    { value: 'all', label: t('mfg.filter.all') },
  ];

  return (
    <div className="page">
      <PageHeader
        title={t('mfg.title')}
        subtitle={orders.data ? t('mfg.subtitle', { count: tn('orders.count', count) }) : undefined}
        actions={
          <button type="button" className="button button--secondary" onClick={orders.reload}>
            {t('common.refresh')}
          </button>
        }
      />

      <div className="toolbar">
        <SegmentedControl label={t('mfg.filter')} options={filters} value={filter} onChange={setFilter} variant="filter" />
      </div>

      {orders.error && <Alert>{orders.error}</Alert>}

      {orders.loading && !orders.data ? (
        <LoadingState />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState title={filter === 'active' ? t('mfg.emptyActive') : t('mfg.empty')} />
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
                        {f.boxes(order.quantity)}
                        {order.producedQuantity !== null && (
                          <span className="subline"> · {t('mfg.made', { n: f.number(order.producedQuantity) })}</span>
                        )}
                      </span>
                    </div>
                    {order.productName && <div className="row-item__spec">{order.productName}</div>}
                    <div className={order.productName ? 'row-item__sub' : 'row-item__spec'}>{f.spec(order)}</div>
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
