import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';
import { Icon } from '../../components/icons';
import { specSummary } from '../../components/OrderSpecList';
import { Alert, EmptyState, LoadingState, PageHeader, StageProgress } from '../../components/ui';
import { formatDate, formatINR, formatNumber, formatSize, formatPly, formatPaper } from '../../lib/format';
import { STATUS_LABELS } from '../../lib/labels';
import { useAsync } from '../../lib/useAsync';
import { ORDER_STATUSES, type OrderStatus } from '../../types';

export function OrdersPage() {
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
        title="Orders"
        subtitle={orders.data ? `${count} ${count === 1 ? 'order' : 'orders'}${status ? ` · ${STATUS_LABELS[status]}` : ''}` : undefined}
        actions={
          <Link to="/orders/new" className="button button--primary">
            <Icon name="plus" size={18} />
            New order
          </Link>
        }
      />

      {flash && (
        <Alert tone="success">
          {flash}{' '}
          <button type="button" className="link-button" onClick={() => setFlash(null)}>
            Dismiss
          </button>
        </Alert>
      )}

      <div className="toolbar">
        <label className="select-filter">
          <span className="visually-hidden">Filter by status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {orders.error && <Alert>{orders.error}</Alert>}

      {orders.loading && !orders.data ? (
        <LoadingState />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState title={status ? 'No orders with this status.' : 'No orders yet.'}>
          {!status && (
            <Link to="/orders/new" className="button button--primary">
              Place the first order
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
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th className="num">Ordered</th>
                  <th className="num">Produced</th>
                  <th className="num">Amount</th>
                  <th className="num">Delivery</th>
                  <th>Progress</th>
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
                      <div>{order.productName || <span className="dash">No product name</span>}</div>
                      <div className="subline">
                        {formatSize(order.size)} · {formatPly(order)} · {formatPaper(order)}
                        {order.laminated ? ' · Laminated' : ''}
                      </div>
                    </td>
                    <td className="num">{formatNumber(order.quantity)}</td>
                    <td className="num">
                      {order.producedQuantity === null ? <span className="dash">—</span> : formatNumber(order.producedQuantity)}
                    </td>
                    <td className="num nowrap">
                      {order.pricing ? (
                        <>
                          <div>{formatINR(order.pricing.total)}</div>
                          <div className="subline">{order.pricing.gstApplicable ? `incl. ${order.pricing.gstRate}% GST` : 'No GST'}</div>
                        </>
                      ) : (
                        <span className="dash">—</span>
                      )}
                    </td>
                    <td className="num nowrap">{formatDate(order.expectedDeliveryDate)}</td>
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
                        <span className="row-item__figure num">{formatNumber(order.quantity)} boxes</span>
                      </div>
                      {order.productName && <div className="row-item__spec">{order.productName}</div>}
                      <div className="row-item__sub">
                        {order.customer?.name ?? '—'}
                        {order.pricing ? ` · ${formatINR(order.pricing.total)}` : ''} · Due {formatDate(order.expectedDeliveryDate)}
                      </div>
                      <div className="row-item__sub">{specSummary(order)}</div>
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
