import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { manufacturingApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { OrderSpecList } from '../../components/OrderSpecList';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Alert, LoadingState, PageHeader, QuantityCompare, StatusBadge } from '../../components/ui';
import { STATUS_LABELS } from '../../lib/labels';
import { useAsync } from '../../lib/useAsync';
import { FINAL_STATUS, WORKER_STATUSES, type WorkerStatus } from '../../types';

export function ManufacturingOrderPage() {
  const { id = '' } = useParams();
  const order = useAsync(() => manufacturingApi.get(id), [id]);

  const [status, setStatus] = useState<WorkerStatus | null>(null);
  const [produced, setProduced] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync the form with the loaded order.
  useEffect(() => {
    if (!order.data) return;
    const current = order.data.status;
    setStatus(current === 'order_placed' ? null : current);
    setProduced(order.data.producedQuantity === null ? '' : String(order.data.producedQuantity));
  }, [order.data]);

  if (order.loading && !order.data) return <LoadingState />;
  if (order.error || !order.data)
    return (
      <div className="page">
        <Alert>{order.error ?? 'Order not found'}</Alert>
        <Link to="/manufacturing">Back to orders</Link>
      </div>
    );

  const o = order.data;
  const isFinal = status === FINAL_STATUS;
  const producedNumber = produced.trim() === '' ? null : Number(produced);
  const unchanged =
    status === o.status && (!isFinal || producedNumber === o.producedQuantity);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!status) {
      setError('Select a status.');
      return;
    }
    if (isFinal && (producedNumber === null || !Number.isInteger(producedNumber) || producedNumber < 0)) {
      setError('Enter the quantity produced (a whole number).');
      return;
    }
    // Guard against typos like an extra digit.
    if (
      isFinal &&
      producedNumber !== null &&
      producedNumber > o.quantity * 1.2 &&
      !window.confirm(
        `Produced quantity ${producedNumber.toLocaleString('en-IN')} is much more than the ordered ${o.quantity.toLocaleString('en-IN')}. Save anyway?`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = await manufacturingApi.updateStatus(id, {
        status,
        producedQuantity: isFinal ? producedNumber : null,
      });
      order.setData(updated);
      setSuccess(`Status updated to "${STATUS_LABELS[updated.status]}".`);
    } catch (err) {
      const fieldMsg = err instanceof ApiError ? Object.values(err.fieldErrors)[0] : undefined;
      setError(fieldMsg ?? errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={`Order ${o.orderNumber}`}
        subtitle="Order details for production"
        actions={
          <Link to="/manufacturing" className="button button--ghost">
            Back to orders
          </Link>
        }
      />

      <div className="detail-grid">
        <div className="stack">
          <section className="card card--padded">
            <div className="card__head">
              <h2>Order details</h2>
              <StatusBadge status={o.status} />
            </div>
            <OrderSpecList order={o} />
          </section>

          <section className="card card--padded">
            <h2>Quantity</h2>
            <QuantityCompare ordered={o.quantity} produced={o.producedQuantity} />
          </section>
        </div>

        <div className="stack">
          <form className="card card--padded" onSubmit={handleSubmit}>
            <h2>Update status</h2>
            {error && <Alert>{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div className="status-options" role="radiogroup" aria-label="Production status">
              {WORKER_STATUSES.map((s, index) => {
                const selected = status === s;
                return (
                  <div key={s} className={`status-option ${selected ? 'is-selected' : ''}`}>
                    <label className="status-option__label">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={selected}
                        onChange={() => {
                          setStatus(s);
                          setSuccess(null);
                        }}
                      />
                      <span className="status-option__step">{index + 1}</span>
                      <span>{STATUS_LABELS[s]}</span>
                    </label>

                    {s === FINAL_STATUS && selected && (
                      <div className="status-option__extra">
                        <label htmlFor="producedQuantity">Quantity produced</label>
                        <input
                          id="producedQuantity"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          autoFocus
                          placeholder={String(o.quantity)}
                          value={produced}
                          onChange={(e) => setProduced(e.target.value)}
                        />
                        <span className="muted small">of {o.quantity.toLocaleString('en-IN')} ordered</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="submit" className="button button--primary button--lg button--block" disabled={saving || unchanged}>
              {saving ? 'Saving…' : 'Save Status'}
            </button>
          </form>

          <section className="card card--padded">
            <h2>Status history</h2>
            <StatusTimeline history={o.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  );
}
