import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';
import { Icon } from '../../components/icons';
import { Alert, EmptyState, LoadingState, PageHeader, StageProgress } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import { ORDER_STATUSES, type OrderStatus } from '../../types';

export function OrdersPage() {
  const { t, tn, f } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [flash, setFlash] = useState<string | null>((location.state as { flash?: string } | null)?.flash ?? null);
  const orders = useAsync(() => ordersApi.list({ status: status || undefined }), [status]);

  // Clear the one-time flash message from history so a refresh doesn't show it again.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const count = orders.data?.length ?? 0;

  return (
    <div className="page">
      <PageHeader
        title={t('orders.title')}
        subtitle={orders.data ? `${tn('orders.count', count)}${status ? ` · ${f.status(status)}` : ''}` : undefined}
        actions={
          <Link to="/orders/new" className="button button--primary">
            <Icon name="plus" size={18} />
            {t('orders.new')}
          </Link>
        }
      />

      {flash && (
        <Alert tone="success">
          {flash}{' '}
          <button type="button" className="link-button" onClick={() => setFlash(null)}>
            {t('common.dismiss')}
          </button>
        </Alert>
      )}

      <div className="toolbar">
        <label className="select-filter">
          <span className="visually-hidden">{t('orders.filterLabel')}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
            <option value="">{t('orders.allStatuses')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {f.status(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {orders.error && <Alert>{orders.error}</Alert>}

      {orders.loading && !orders.data ? (
        <LoadingState />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState title={status ? t('orders.emptyFiltered') : t('orders.empty')}>
          {!status && (
            <Link to="/orders/new" className="button button--primary">
              {t('orders.placeFirst')}
            </Link>
          )}
        </EmptyState>
      ) : (
        orders.data && (
          <div className="panel">
            {/* Desktop and tablet */}
            <table className="table hide-phone">
              <thead>
                <tr>
                  <th>{t('orders.col.order')}</th>
                  <th>{t('orders.col.customer')}</th>
                  <th>{t('orders.col.product')}</th>
                  <th className="num">{t('orders.col.ordered')}</th>
                  <th className="num">{t('orders.col.produced')}</th>
                  <th className="num">{t('orders.col.amount')}</th>
                  <th className="num">{t('orders.col.delivery')}</th>
                  <th>{t('orders.col.progress')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order._id} className="table__row-link" onClick={() => navigate(`/orders/${order._id}`)}>
                    <td className="nowrap">
                      <Link to={`/orders/${order._id}`} className="row-title" onClick={(e) => e.stopPropagation()}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {order.customer ? (
                        <>
                          <div>{order.customer.name}</div>
                          {order.customer.companyName && <div className="subline">{order.customer.companyName}</div>}
                        </>
                      ) : (
                        <span className="dash">—</span>
                      )}
                    </td>
                    <td>
                      <div>{order.productName || <span className="dash">{t('orders.noProduct')}</span>}</div>
                      <div className="subline">{f.spec(order)}</div>
                    </td>
                    <td className="num">{f.number(order.quantity)}</td>
                    <td className="num">
                      {order.producedQuantity === null ? <span className="dash">—</span> : f.number(order.producedQuantity)}
                    </td>
                    <td className="num nowrap">
                      {order.pricing ? (
                        <>
                          <div>{f.inr(order.pricing.total)}</div>
                          <div className="subline">
                            {order.pricing.gstApplicable ? t('orders.inclGst', { rate: order.pricing.gstRate }) : t('orders.noGst')}
                          </div>
                        </>
                      ) : (
                        <span className="dash">—</span>
                      )}
                    </td>
                    <td className="num nowrap">{f.date(order.expectedDeliveryDate)}</td>
                    <td>
                      <StageProgress status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone */}
            <ul className="row-list show-phone">
              {orders.data.map((order) => (
                <li key={order._id}>
                  <Link to={`/orders/${order._id}`} className="row-item">
                    <div className="row-item__main">
                      <div className="row-item__line">
                        <span className="row-title">{order.orderNumber}</span>
                        <span className="row-item__figure num">{f.boxes(order.quantity)}</span>
                      </div>
                      {order.productName && <div className="row-item__spec">{order.productName}</div>}
                      <div className="row-item__sub">
                        {[
                          order.customer?.name ?? '—',
                          order.pricing ? f.inr(order.pricing.total) : null,
                          t('due.date', { date: f.date(order.expectedDeliveryDate) }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                      <div className="row-item__sub">{f.spec(order)}</div>
                      <StageProgress status={order.status} compact />
                    </div>
                    <Icon name="chevron" size={18} className="row-item__chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
