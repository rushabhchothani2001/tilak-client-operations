import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';
import { Alert, EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate, formatNumber, formatPaper, formatPly, formatSize } from '../../lib/format';
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

  return (
    <div className="page">
      <PageHeader
        title="Orders"
        subtitle="All customer orders and their production progress."
        actions={
          <Link to="/orders/new" className="button button--primary">
            + New Order
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
        <label className="toolbar__filter">
          <span>Status</span>
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
        <EmptyState title={status ? 'No orders with this status' : 'No orders yet'}>
          {!status && (
            <Link to="/orders/new" className="button button--primary">
              Place the first order
            </Link>
          )}
        </EmptyState>
      ) : (
        orders.data && (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Size</th>
                  <th>Box / Paper</th>
                  <th className="num">Ordered</th>
                  <th className="num">Produced</th>
                  <th>Delivery</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order._id} className="table__row-link" onClick={() => navigate(`/orders/${order._id}`)}>
                    <td className="nowrap">
                      <Link to={`/orders/${order._id}`} className="strong" onClick={(e) => e.stopPropagation()}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {order.customer ? (
                        <>
                          <div>{order.customer.name}</div>
                          {order.customer.companyName && <div className="muted small">{order.customer.companyName}</div>}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="nowrap">{formatSize(order.size)}</td>
                    <td>
                      <div>{formatPly(order)}</div>
                      <div className="muted small">
                        {formatPaper(order)}
                        {order.laminated ? ' · Laminated' : ''}
                      </div>
                    </td>
                    <td className="num">{formatNumber(order.quantity)}</td>
                    <td className="num">{order.producedQuantity === null ? '—' : formatNumber(order.producedQuantity)}</td>
                    <td className="nowrap">{formatDate(order.expectedDeliveryDate)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
