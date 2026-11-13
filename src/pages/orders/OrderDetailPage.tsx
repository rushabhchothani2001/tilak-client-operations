import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ordersApi } from '../../api';
import { errorMessage } from '../../api/http';
import { OrderSpecList } from '../../components/OrderSpecList';
import { StatusTimeline } from '../../components/StatusTimeline';
import { Alert, LoadingState, PageHeader, QuantityCompare, StageProgress } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useAsync } from '../../lib/useAsync';

export function OrderDetailPage() {
  const { t, f } = useI18n();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const order = useAsync(() => ordersApi.get(id), [id]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const back = { to: '/orders', label: t('nav.orders') };

  const handleDelete = async () => {
    if (!order.data) return;
    const number = order.data.orderNumber;
    if (!window.confirm(t('order.confirmDelete', { number }))) return;
    try {
      await ordersApi.remove(id);
      navigate('/orders', { state: { flash: t('orders.deleted', { number }) } });
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  if (order.loading && !order.data) return <LoadingState />;
  if (order.error || !order.data)
    return (
      <div className="page">
        <PageHeader title={t('order.titlePlain')} back={back} />
        <Alert>{order.error ?? t('err.orderNotFound')}</Alert>
      </div>
    );

  const o = order.data;
  const customer = o.customer;
  const pricingRows: [string, string, boolean][] = o.pricing
    ? [
        [t('order.ratePerBox'), f.inr(o.pricing.ratePerBox), false],
        [t('order.amountFor', { boxes: f.boxes(o.quantity) }), f.inr(o.pricing.subtotal), false],
        [
          o.pricing.gstApplicable ? t('order.gstRate', { rate: o.pricing.gstRate }) : t('order.gst'),
          o.pricing.gstApplicable ? f.inr(o.pricing.gstAmount) : t('order.notApplicable'),
          false,
        ],
        [t('order.finalAmount'), f.inr(o.pricing.total), true],
      ]
    : [];

  return (
    <div className="page">
      <PageHeader
        back={back}
        title={t('order.title', { number: o.orderNumber })}
        subtitle={[o.productName, f.spec(o), t('order.placedAt', { date: f.dateTime(o.createdAt) })].filter(Boolean).join(' · ')}
        actions={
          <button type="button" className="button button--danger-text" onClick={handleDelete}>
            {t('common.delete')}
          </button>
        }
      />
      {deleteError && <Alert>{deleteError}</Alert>}

      <div className="detail-grid">
        <div className="stack">
          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.production')}</h2>
            <StageProgress status={o.status} />
            <QuantityCompare ordered={o.quantity} produced={o.producedQuantity} />
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.price')}</h2>
            {o.pricing ? (
              <dl className="spec-list">
                {pricingRows.map(([label, value, total]) => (
                  <div className={`spec-list__row ${total ? 'spec-list__row--total' : ''}`} key={label}>
                    <dt>{label}</dt>
                    <dd className="num">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">{t('order.noPrice')}</p>
            )}
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.boxSpec')}</h2>
            <OrderSpecList order={o} />
          </section>
        </div>

        <div className="stack">
          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.customer')}</h2>
            {customer ? (
              <dl className="spec-list">
                {(
                  [
                    [t('customer.name'), customer.name, false],
                    [t('customer.company'), customer.companyName, false],
                    [t('customer.phone'), customer.phone, true],
                    [t('customer.helpline'), customer.helplinePhone, true],
                    [t('customer.gst'), customer.gstNumber, false],
                    [t('customer.address'), customer.address, false],
                  ] as [string, string, boolean][]
                ).map(([label, value, isPhone]) => (
                  <div className="spec-list__row" key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {!value ? (
                        <span className="dash">—</span>
                      ) : isPhone ? (
                        <a href={`tel:${value.replace(/[^+\d]/g, '')}`}>{value}</a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">{t('order.customerMissing')}</p>
            )}
          </section>

          <section className="panel panel--padded">
            <h2 className="panel__title">{t('order.history')}</h2>
            <StatusTimeline history={o.statusHistory} />
          </section>
        </div>
      </div>
    </div>
  );
}
