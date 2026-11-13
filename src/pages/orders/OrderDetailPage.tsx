import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../../api';
import { errorMessage } from '../../api/http';
import { OrderSpecList, specSummary } from '../../components/OrderSpecList';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Alert, LoadingState, PageHeader, QuantityCompare, StageProgress } from '../../components/ui';
import { formatDateTime, formatINR, formatNumber } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const order = useAsync(() => ordersApi.get(id), [id]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!order.data) return;
    if (!window.confirm(`Delete order ${order.data.orderNumber}? This cannot be undone.`)) return;
    try {
      await ordersApi.remove(id);
      navigate('/orders', { state: { flash: `Order ${order.data.orderNumber} deleted.` } });
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  if (order.loading && !order.data) return <LoadingState />;
  if (order.error || !order.data)
    return (
      <div className="page">
        <PageHeader title="Order" back={{ to: '/orders', label: 'Orders' }} />
        <Alert>{order.error ?? 'Order not found'}</Alert>
      </div>
    );

  const o = order.data;
  const customer = o.customer;

  return (
    <div className="page">
      <PageHeader
        back={{ to: '/orders', label: 'Orders' }}
        title={`Order ${o.orderNumber}`}
        subtitle={[o.productName, specSummary(o), `Placed ${formatDateTime(o.createdAt)}`].filter(Boolean).join(' · ')}
        actions={
          <button type="button" className="button button--danger-text" onClick={handleDelete}>
            Delete
          </button>
        }
      />
      {deleteError && <Alert>{deleteError}</Alert>}

      <div className="detail-grid">
        <div className="stack">
          <section className="panel panel--padded">
            <h2 className="panel__title">Production</h2>
            <StageProgress status={o.status} />
            <QuantityCompare ordered={o.quantity} produced={o.producedQuantity} />
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">Price</h2>
            {o.pricing ? (
              <dl className="spec-list">
                {[
                  ['Rate per box', formatINR(o.pricing.ratePerBox)],
                  [`Amount (${formatNumber(o.quantity)} boxes)`, formatINR(o.pricing.subtotal)],
                  [o.pricing.gstApplicable ? `GST ${o.pricing.gstRate}%` : 'GST', o.pricing.gstApplicable ? formatINR(o.pricing.gstAmount) : 'Not applicable'],
                  ['Final amount', formatINR(o.pricing.total)],
                ].map(([label, value]) => (
                  <div className={`spec-list__row ${label === 'Final amount' ? 'spec-list__row--total' : ''}`} key={label}>
                    <dt>{label}</dt>
                    <dd className="num">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">No price was recorded for this order.</p>
            )}
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">Box specification</h2>
            <OrderSpecList order={o} />
          </section>
        </div>

        <div className="stack">
          <section className="panel panel--padded">
            <h2 className="panel__title">Customer</h2>
            {customer ? (
              <dl className="spec-list">
                {[
                  ['Name', customer.name],
                  ['Company', customer.companyName],
                  ['Phone', customer.phone],
                  ['Helpline phone', customer.helplinePhone],
                  ['GST number', customer.gstNumber],
                  ['Address', customer.address],
                ].map(([label, value]) => (
                  <div className="spec-list__row" key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {!value ? (
                        <span className="dash">—</span>
                      ) : label.includes('hone') ? (
                        <a href={`tel:${value.replace(/[^+\d]/g, '')}`}>{value}</a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">Customer record not found.</p>
            )}
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">Status history</h2>
            <StatusTimeline history={o.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  );
}
