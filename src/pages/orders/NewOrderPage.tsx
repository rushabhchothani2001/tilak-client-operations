import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi, ordersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { Alert, Field, PageHeader, SegmentedControl } from '../../components/ui';
import { useI18n, type Translate } from '../../i18n';
import { parseSlashNumbers, todayInputValue } from '../../lib/format';
import { computePricing, GST_RATE_PERCENT } from '../../lib/pricing';
import { useAsync } from '../../lib/useAsync';
import {
  BOX_PLY,
  PAPER_TYPES,
  PRINT_TYPES,
  SIZE_UNITS,
  type BoxPly,
  type OrderInput,
  type PaperType,
  type PrintType,
  type SizeUnit,
} from '../../types';

interface FormState {
  customer: string;
  productName: string;
  length: string;
  width: string;
  height: string;
  unit: SizeUnit;
  ply: BoxPly | null;
  paperType: PaperType | null;
  printType: PrintType | null;
  top: string;
  fluted: string;
  laminated: boolean | null;
  lamLength: string;
  lamWidth: string;
  quantity: string;
  ratePerBox: string;
  gstApplicable: boolean | null;
  expectedDeliveryDate: string;
}

const INITIAL: FormState = {
  customer: '',
  productName: '',
  length: '',
  width: '',
  height: '',
  unit: 'inch',
  ply: null,
  paperType: null,
  printType: null,
  top: '',
  fluted: '',
  laminated: null,
  lamLength: '',
  lamWidth: '',
  quantity: '',
  ratePerBox: '',
  gstApplicable: null,
  expectedDeliveryDate: '',
};

/** A rupee amount above zero with at most 2 decimals. */
const isRate = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim()) && Number(v) > 0;
const isQuantity = (v: string) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= 1;
const isPositive = (v: string) => v.trim() !== '' && Number(v) > 0;
const isNonNegative = (v: string) => v.trim() !== '' && Number(v) >= 0;

type Errors = Record<string, string>;

/** Client-side checks; keys match the server's error paths so both render the same way. */
function validate(form: FormState, t: Translate): Errors {
  const errors: Errors = {};
  if (!form.customer) errors.customer = t('v.selectCustomer');
  if (!form.productName.trim()) errors.productName = t('v.productName');
  if (!isPositive(form.length)) errors['size.length'] = t('v.length');
  if (!isPositive(form.width)) errors['size.width'] = t('v.width');
  if (!isPositive(form.height)) errors['size.height'] = t('v.height');
  if (!form.ply) errors.ply = t('v.ply');
  if (!form.paperType) errors.paperType = t('v.paper');
  if (form.paperType === 'printed' && !form.printType) errors.printType = t('v.print');
  if (!isNonNegative(form.top)) errors['insidePaper.top'] = t('v.top');
  if (!form.fluted.trim()) errors['insidePaper.fluted'] = t('v.fluted');
  else if (!parseSlashNumbers(form.fluted)) errors['insidePaper.fluted'] = t('v.flutedFormat');
  else if (parseSlashNumbers(form.fluted)!.length > 10) errors['insidePaper.fluted'] = t('v.flutedMax');
  if (form.laminated === null) errors.laminated = t('v.yesNo');
  if (form.laminated) {
    if (!isPositive(form.lamLength)) errors['laminationSize.length'] = t('v.length');
    if (!isPositive(form.lamWidth)) errors['laminationSize.width'] = t('v.width');
  }
  if (!isQuantity(form.quantity)) errors.quantity = t('v.quantity');
  if (!form.ratePerBox.trim()) errors.ratePerBox = t('v.rate');
  else if (!isRate(form.ratePerBox)) errors.ratePerBox = t('v.rateFormat');
  if (form.gstApplicable === null) errors.gstApplicable = t('v.yesNo');
  if (!form.expectedDeliveryDate) errors.expectedDeliveryDate = t('v.deliveryDate');
  return errors;
}

function toInput(form: FormState): OrderInput {
  return {
    customer: form.customer,
    productName: form.productName.trim(),
    size: {
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height),
      unit: form.unit,
    },
    ply: form.ply!,
    paperType: form.paperType!,
    printType: form.paperType === 'printed' ? form.printType : null,
    insidePaper: { top: Number(form.top), fluted: parseSlashNumbers(form.fluted)! },
    laminated: form.laminated!,
    laminationSize: form.laminated ? { length: Number(form.lamLength), width: Number(form.lamWidth) } : null,
    quantity: Number(form.quantity),
    ratePerBox: Number(form.ratePerBox),
    gstApplicable: form.gstApplicable!,
    expectedDeliveryDate: form.expectedDeliveryDate,
  };
}

/** Live calculation: quantity × rate, GST, and the final amount. */
function AmountSummary({
  quantity,
  rate,
  gstApplicable,
}: {
  quantity: string;
  rate: string;
  gstApplicable: boolean | null;
}) {
  const { t, f } = useI18n();
  if (!isQuantity(quantity) || !isRate(rate)) {
    return (
      <div className="amount-summary amount-summary--empty" aria-live="polite">
        {t('amount.prompt')}
      </div>
    );
  }

  const qty = Number(quantity);
  const p = computePricing(qty, Number(rate), gstApplicable === true);

  return (
    <dl className="amount-summary" aria-live="polite">
      <div className="amount-summary__row">
        <dt>{t('amount.line', { boxes: f.boxes(qty), rate: f.inr(p.ratePerBox) })}</dt>
        <dd className="num">{f.inr(p.subtotal)}</dd>
      </div>
      <div className="amount-summary__row">
        <dt>
          {gstApplicable === null
            ? t('amount.gstChoose')
            : gstApplicable
              ? t('amount.gstRate', { rate: GST_RATE_PERCENT })
              : t('amount.gstNone')}
        </dt>
        <dd className="num">{f.inr(p.gstAmount)}</dd>
      </div>
      <div className="amount-summary__row amount-summary__total">
        <dt>{t('amount.final')}</dt>
        <dd className="num">{f.inr(p.total)}</dd>
      </div>
    </dl>
  );
}

export function NewOrderPage() {
  const { t, f } = useI18n();
  const navigate = useNavigate();
  const customers = useAsync(() => customersApi.list(), []);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const yesNo = [
    { value: 'yes' as const, label: t('common.yes') },
    { value: 'no' as const, label: t('common.no') },
  ];

  const set = <K extends keyof FormState>(key: K, value: FormState[K], errorKey: string = key) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[errorKey]) setErrors(({ [errorKey]: _removed, ...rest }) => rest);
  };

  const setPaperType = (paperType: PaperType) => {
    setForm((prev) => ({ ...prev, paperType, printType: paperType === 'plain' ? null : prev.printType }));
    setErrors(({ paperType: _p, printType: _t, ...rest }) => rest);
  };

  // Choosing "No" clears the lamination size so a stale size is never saved.
  const setLaminated = (value: 'yes' | 'no') => {
    const laminated = value === 'yes';
    setForm((prev) => ({
      ...prev,
      laminated,
      lamLength: laminated ? prev.lamLength : '',
      lamWidth: laminated ? prev.lamWidth : '',
    }));
    setErrors(
      ({ laminated: _l, laminationSize: _s, 'laminationSize.length': _a, 'laminationSize.width': _b, ...rest }) => rest,
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const clientErrors = validate(form, t);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setSubmitError(t('newOrder.fixFields'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const order = await ordersApi.create(toInput(form));
      navigate('/orders', { state: { flash: t('orders.placed', { number: order.orderNumber }) } });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
      }
      setSubmitError(errorMessage(error));
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const noCustomers = !customers.loading && customers.data?.length === 0;

  return (
    <div className="page page--narrow">
      <PageHeader back={{ to: '/orders', label: t('nav.orders') }} title={t('newOrder.title')} subtitle={t('newOrder.subtitle')} />

      <form className="form" onSubmit={handleSubmit} noValidate>
        {submitError && <Alert>{submitError}</Alert>}

        <section className="panel form-section">
          <h2 className="form-section__title">{t('newOrder.sectionCustomer')}</h2>
          <Field label={t('newOrder.selectCustomer')} htmlFor="customer" error={errors.customer}>
            <select
              id="customer"
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
              disabled={customers.loading}
            >
              <option value="">{customers.loading ? t('newOrder.loadingCustomers') : t('newOrder.chooseCustomer')}</option>
              {customers.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.companyName ? ` — ${c.companyName}` : ''}
                </option>
              ))}
            </select>
          </Field>
          {customers.error && <Alert>{customers.error}</Alert>}
          {noCustomers && (
            <p className="muted">
              {t('newOrder.noCustomers')} <Link to="/customers">{t('newOrder.addCustomer')}</Link>
            </p>
          )}
          <Field label={t('newOrder.productName')} htmlFor="productName" error={errors.productName}>
            <input
              id="productName"
              type="text"
              autoComplete="off"
              maxLength={120}
              placeholder={t('newOrder.productPlaceholder')}
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
            />
          </Field>
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">{t('newOrder.sectionBox')}</h2>

          <fieldset className="size-row">
            <legend className="field__label">{t('newOrder.size')}</legend>
            {(['length', 'width', 'height'] as const).map((dim) => (
              <div className={`field ${errors[`size.${dim}`] ? 'field--error' : ''}`} key={dim}>
                <label className="field__sublabel" htmlFor={dim}>
                  {t(`newOrder.${dim}`)}
                </label>
                <input
                  id={dim}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={form[dim]}
                  onChange={(e) => set(dim, e.target.value, `size.${dim}`)}
                />
                {errors[`size.${dim}`] && <p className="field__error">{errors[`size.${dim}`]}</p>}
              </div>
            ))}
            <div className="field">
              <label className="field__sublabel" htmlFor="unit">
                {t('newOrder.unit')}
              </label>
              <select id="unit" value={form.unit} onChange={(e) => set('unit', e.target.value as SizeUnit)}>
                {SIZE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {f.unit(u)}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className="grid-2">
            <Field label={t('newOrder.boxType')} error={errors.ply}>
              <SegmentedControl
                label={t('newOrder.boxType')}
                options={BOX_PLY.map((p) => ({ value: p, label: t(`ply.${p}`) }))}
                value={form.ply}
                onChange={(v) => set('ply', v)}
              />
            </Field>

            <Field label={t('newOrder.laminated')} error={errors.laminated}>
              <SegmentedControl
                label={t('newOrder.laminated')}
                options={yesNo}
                value={form.laminated === null ? null : form.laminated ? 'yes' : 'no'}
                onChange={setLaminated}
              />
            </Field>
          </div>

          {form.laminated && (
            <fieldset className="pair-row">
              <legend className="field__label">{t('newOrder.laminationSize')}</legend>
              {(
                [
                  ['lamLength', 'newOrder.length', 'laminationSize.length'],
                  ['lamWidth', 'newOrder.width', 'laminationSize.width'],
                ] as const
              ).map(([key, label, errorKey], i) => (
                <div className={`field ${errors[errorKey] ? 'field--error' : ''}`} key={key}>
                  <label className="field__sublabel" htmlFor={key}>
                    {t(label)}
                  </label>
                  <div className="pair-row__input">
                    {i === 1 && (
                      <span className="pair-row__times" aria-hidden="true">
                        ×
                      </span>
                    )}
                    <input
                      id={key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value, errorKey)}
                    />
                    {i === 1 && <span className="pair-row__unit">{f.unit(form.unit)}</span>}
                  </div>
                  {errors[errorKey] && <p className="field__error">{errors[errorKey]}</p>}
                </div>
              ))}
              {errors.laminationSize && <p className="field__error pair-row__error">{errors.laminationSize}</p>}
            </fieldset>
          )}
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">{t('newOrder.sectionPaper')}</h2>

          <div className="grid-2">
            <Field label={t('newOrder.paperType')} error={errors.paperType}>
              <SegmentedControl
                label={t('newOrder.paperType')}
                options={PAPER_TYPES.map((p) => ({ value: p, label: t(`paper.${p}`) }))}
                value={form.paperType}
                onChange={setPaperType}
              />
            </Field>

            {form.paperType === 'printed' && (
              <Field label={t('newOrder.printing')} error={errors.printType}>
                <SegmentedControl
                  label={t('newOrder.printing')}
                  options={PRINT_TYPES.map((p) => ({ value: p, label: t(`print.${p}`) }))}
                  value={form.printType}
                  onChange={(v) => set('printType', v)}
                />
              </Field>
            )}
          </div>

          <div className="grid-2">
            <Field label={t('newOrder.insideTop')} htmlFor="top" error={errors['insidePaper.top']}>
              <input
                id="top"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.top}
                onChange={(e) => set('top', e.target.value, 'insidePaper.top')}
              />
            </Field>
            <Field
              label={t('newOrder.insideFluted')}
              htmlFor="fluted"
              error={errors['insidePaper.fluted']}
              hint={t('newOrder.flutedHint')}
            >
              <input
                id="fluted"
                type="text"
                autoComplete="off"
                placeholder={t('newOrder.flutedPlaceholder')}
                value={form.fluted}
                // Only digits, decimal point, slash and spaces can be typed.
                onChange={(e) => set('fluted', e.target.value.replace(/[^0-9./\s]/g, ''), 'insidePaper.fluted')}
              />
            </Field>
          </div>
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">{t('newOrder.sectionQty')}</h2>
          <div className="grid-2">
            <Field label={t('newOrder.quantity')} htmlFor="quantity" error={errors.quantity}>
              <input
                id="quantity"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </Field>
            <Field label={t('newOrder.rate')} htmlFor="ratePerBox" error={errors.ratePerBox}>
              <div className="input-prefix">
                <span aria-hidden="true">₹</span>
                <input
                  id="ratePerBox"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={form.ratePerBox}
                  // Digits and one decimal point only.
                  onChange={(e) => set('ratePerBox', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                />
              </div>
            </Field>
          </div>

          <Field label={t('newOrder.gst')} error={errors.gstApplicable}>
            <SegmentedControl
              label={t('newOrder.gst')}
              options={[
                { value: 'yes', label: t('newOrder.gstYes', { rate: GST_RATE_PERCENT }) },
                { value: 'no', label: t('common.no') },
              ]}
              value={form.gstApplicable === null ? null : form.gstApplicable ? 'yes' : 'no'}
              onChange={(v) => set('gstApplicable', v === 'yes')}
            />
          </Field>

          <AmountSummary quantity={form.quantity} rate={form.ratePerBox} gstApplicable={form.gstApplicable} />

          <Field label={t('newOrder.deliveryDate')} htmlFor="expectedDeliveryDate" error={errors.expectedDeliveryDate}>
            <input
              id="expectedDeliveryDate"
              type="date"
              min={todayInputValue()}
              value={form.expectedDeliveryDate}
              onChange={(e) => set('expectedDeliveryDate', e.target.value)}
            />
          </Field>
        </section>

        <div className="form-actions">
          <button
            type="button"
            className="button button--secondary button--lg"
            onClick={() => {
              setForm(INITIAL);
              setErrors({});
              setSubmitError(null);
            }}
          >
            {t('newOrder.clear')}
          </button>
          <button type="submit" className="button button--primary button--lg" disabled={submitting}>
            {submitting ? t('newOrder.submitting') : t('newOrder.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
