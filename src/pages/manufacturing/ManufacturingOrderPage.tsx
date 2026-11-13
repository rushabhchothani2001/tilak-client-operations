import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { manufacturingApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { OrderSpecList, specSummary } from '../../components/OrderSpecList';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Alert, LoadingState, PageHeader, QuantityCompare, stagesDone } from '../../components/ui';
import { formatDate } from '../../lib/format';
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
        <PageHeader title="Order" back={{ to: '/manufacturing', label: 'Manufacturing' }} />
        <Alert>{order.error ?? 'Order not found'}</Alert>
      </div>
    );

  const o = order.data;
  const isFinal = status === FINAL_STATUS;
  const producedNumber = produced.trim() === '' ? null : Number(produced);
  const unchanged = status === o.status && (!isFinal || producedNumber === o.producedQuantity);
  const currentStep = stagesDone(o.status);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!status) {
      setError('Choose a status.');
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
      setSuccess(`Saved: ${STATUS_LABELS[updated.status]}.`);
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
        back={{ to: '/manufacturing', label: 'Manufacturing' }}
        title={`Order ${o.orderNumber}`}
        subtitle={`${specSummary(o)} · ${o.quantity.toLocaleString('en-IN')} boxes · Due ${formatDate(o.expectedDeliveryDate)}`}
      />

      <div className="detail-grid detail-grid--action-first">
        <div className="stack detail-grid__info">
          <section className="panel panel--padded">
            <h2 className="panel__title">Quantity</h2>
            <QuantityCompare ordered={o.quantity} produced={o.producedQuantity} />
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">Box specification</h2>
            <OrderSpecList order={o} />
          </section>
        </div>

        <div className="stack detail-grid__action">
          <form className="panel panel--padded" onSubmit={handleSubmit}>
            <h2 className="panel__title">Update status</h2>
            {error && <Alert>{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div className="steps" role="radiogroup" aria-label="Production status">
              {WORKER_STATUSES.map((s, index) => {
                const selected = status === s;
                const passed = index < currentStep;
                return (
                  <div key={s} className={`step ${selected ? 'is-selected' : ''} ${passed ? 'is-passed' : ''}`}>
                    <label className="step__label">
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
                      <span className="step__number" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span>{STATUS_LABELS[s]}</span>
                    </label>

                    {s === FINAL_STATUS && selected && (
                      <div className="step__extra">
                        <label htmlFor="producedQuantity">Quantity produced</label>
                        <div className="step__qty">
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
                          <span className="subline">of {o.quantity.toLocaleString('en-IN')} ordered</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="submit" className="button button--primary button--block button--lg" disabled={saving || unchanged}>
              {saving ? 'Saving…' : unchanged ? 'No changes' : 'Save status'}
            </button>
          </form>

          <section className="panel panel--padded">
            <h2 className="panel__title">Status history</h2>
            <StatusTimeline history={o.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  );
}
