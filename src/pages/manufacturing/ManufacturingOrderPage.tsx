import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { manufacturingApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { OrderSpecList } from '../../components/OrderSpecList';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Alert, LoadingState, PageHeader, QuantityCompare, stagesDone } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import { FINAL_STATUS, WORKER_STATUSES, type WorkerStatus } from '../../types';

export function ManufacturingOrderPage() {
  const { t, f } = useI18n();
  const { id = '' } = useParams();
  const order = useAsync(() => manufacturingApi.get(id), [id]);
  const back = { to: '/manufacturing', label: t('nav.manufacturing') };

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
        <PageHeader title={t('order.titlePlain')} back={back} />
        <Alert>{order.error ?? t('err.orderNotFound')}</Alert>
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
      setError(t('mfgOrder.chooseStatus'));
      return;
    }
    if (isFinal && (producedNumber === null || !Number.isInteger(producedNumber) || producedNumber < 0)) {
      setError(t('mfgOrder.enterProduced'));
      return;
    }
    // Guard against typos like an extra digit.
    if (
      isFinal &&
      producedNumber !== null &&
      producedNumber > o.quantity * 1.2 &&
      !window.confirm(t('mfgOrder.confirmOver', { produced: f.number(producedNumber), ordered: f.number(o.quantity) }))
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
      setSuccess(t('mfgOrder.saved', { status: f.status(updated.status) }));
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
        back={back}
        title={t('order.title', { number: o.orderNumber })}
        subtitle={[o.productName, f.spec(o), f.boxes(o.quantity), t('due.date', { date: f.date(o.expectedDeliveryDate) })]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="detail-grid detail-grid--action-first">
        <div className="stack detail-grid__info">
          <section className="panel panel--padded">
            <h2 className="panel__title">{t('mfgOrder.quantity')}</h2>
            <QuantityCompare ordered={o.quantity} produced={o.producedQuantity} />
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.boxSpec')}</h2>
            <OrderSpecList order={o} />
          </section>
        </div>

        <div className="stack detail-grid__action">
          <form className="panel panel--padded" onSubmit={handleSubmit}>
            <h2 className="panel__title">{t('mfgOrder.update')}</h2>
            {error && <Alert>{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div className="steps" role="radiogroup" aria-label={t('mfgOrder.statusGroup')}>
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
                      <span>{f.status(s)}</span>
                    </label>

                    {s === FINAL_STATUS && selected && (
                      <div className="step__extra">
                        <label htmlFor="producedQuantity">{t('mfgOrder.producedLabel')}</label>
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
                          <span className="subline">{t('mfgOrder.ofOrdered', { n: f.number(o.quantity) })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button type="submit" className="button button--primary button--block button--lg" disabled={saving || unchanged}>
              {saving ? t('common.saving') : unchanged ? t('mfgOrder.noChanges') : t('mfgOrder.save')}
            </button>
          </form>

          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.history')}</h2>
            <StatusTimeline history={o.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  );
}
