import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi, ordersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { Alert, Field, PageHeader, SegmentedControl } from '../../components/ui';
import { PAPER_LABELS, PLY_LABELS, PRINT_LABELS, UNIT_LABELS, toOptions } from '../../lib/labels';
import { formatINR, formatNumber, parseSlashNumbers, todayInputValue } from '../../lib/format';
import { computePricing, GST_RATE_PERCENT } from '../../lib/pricing';
import { useAsync } from '../../lib/useAsync';
import type { BoxPly, OrderInput, PaperType, PrintType, SizeUnit } from '../../types';

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

type Errors = Record<string, string>;

const isPositive = (v: string) => v.trim() !== '' && Number(v) > 0;
const isNonNegative = (v: string) => v.trim() !== '' && Number(v) >= 0;

/** Client-side checks; keys match the server's error paths so both render the same way. */
function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.customer) errors.customer = 'Select a customer';
  if (!form.productName.trim()) errors.productName = 'Enter the product name';
  if (!isPositive(form.length)) errors['size.length'] = 'Enter length';
  if (!isPositive(form.width)) errors['size.width'] = 'Enter width';
  if (!isPositive(form.height)) errors['size.height'] = 'Enter height';
  if (!form.ply) errors.ply = 'Select 3-ply or 5-ply';
  if (!form.paperType) errors.paperType = 'Select printed or plain';
  if (form.paperType === 'printed' && !form.printType) errors.printType = 'Select 4-color or single color';
  if (!isNonNegative(form.top)) errors['insidePaper.top'] = 'Enter top value';
  if (!form.fluted.trim()) errors['insidePaper.fluted'] = 'Enter fluted value';
  else if (!parseSlashNumbers(form.fluted)) errors['insidePaper.fluted'] = 'Use numbers separated by / (e.g. 120/150)';
  else if (parseSlashNumbers(form.fluted)!.length > 10) errors['insidePaper.fluted'] = 'Enter at most 10 values';
  if (form.laminated === null) errors.laminated = 'Select yes or no';
  if (form.laminated) {
    if (!isPositive(form.lamLength)) errors['laminationSize.length'] = 'Enter length';
    if (!isPositive(form.lamWidth)) errors['laminationSize.width'] = 'Enter width';
  }
  if (!isQuantity(form.quantity)) errors.quantity = 'Enter a whole number of at least 1';
  if (!form.ratePerBox.trim()) errors.ratePerBox = 'Enter the rate per box';
  else if (!isRate(form.ratePerBox)) errors.ratePerBox = 'Enter an amount above ₹0 with at most 2 decimals';
  if (form.gstApplicable === null) errors.gstApplicable = 'Select yes or no';
  if (!form.expectedDeliveryDate) errors.expectedDeliveryDate = 'Select the expected delivery date';
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
  if (!isQuantity(quantity) || !isRate(rate)) {
    return (
      <div className="amount-summary amount-summary--empty" aria-live="polite">
        Enter quantity and rate per box to see the amount.
      </div>
    );
  }

  const qty = Number(quantity);
  const p = computePricing(qty, Number(rate), gstApplicable === true);

  return (
    <dl className="amount-summary" aria-live="polite">
      <div className="amount-summary__row">
        <dt>
          {formatNumber(qty)} boxes × {formatINR(p.ratePerBox)}
        </dt>
        <dd className="num">{formatINR(p.subtotal)}</dd>
      </div>
      <div className="amount-summary__row">
        <dt>{gstApplicable === null ? 'GST (choose above)' : gstApplicable ? `GST ${GST_RATE_PERCENT}%` : 'GST not applicable'}</dt>
        <dd className="num">{formatINR(p.gstAmount)}</dd>
      </div>
      <div className="amount-summary__row amount-summary__total">
        <dt>Final amount</dt>
        <dd className="num">{formatINR(p.total)}</dd>
      </div>
    </dl>
  );
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const customers = useAsync(() => customersApi.list(), []);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setSubmitError('Please fill in all the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const order = await ordersApi.create(toInput(form));
      navigate('/orders', { state: { flash: `Order ${order.orderNumber} placed successfully.` } });
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
      <PageHeader
        back={{ to: '/orders', label: 'Orders' }}
        title="New order"
        subtitle="Choose the customer, describe the box, and place the order."
      />

      <form className="form" onSubmit={handleSubmit} noValidate>
        {submitError && <Alert>{submitError}</Alert>}

        <section className="panel form-section">
          <h2 className="form-section__title">Customer &amp; product</h2>
          <Field label="Select customer" htmlFor="customer" error={errors.customer}>
            <select
              id="customer"
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
              disabled={customers.loading}
            >
              <option value="">{customers.loading ? 'Loading customers…' : 'Choose a customer'}</option>
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
              No customers yet. <Link to="/customers">Add a customer</Link> first.
            </p>
          )}
          <Field label="Product name" htmlFor="productName" error={errors.productName}>
            <input
              id="productName"
              type="text"
              autoComplete="off"
              maxLength={120}
              placeholder="e.g. Mango juice 1L carton"
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
            />
          </Field>
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">Box details</h2>

          <fieldset className="size-row">
            <legend className="field__label">Size</legend>
            {(['length', 'width', 'height'] as const).map((dim) => (
              <div className={`field ${errors[`size.${dim}`] ? 'field--error' : ''}`} key={dim}>
                <label className="field__sublabel" htmlFor={dim}>
                  {dim[0].toUpperCase() + dim.slice(1)}
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
                Unit
              </label>
              <select id="unit" value={form.unit} onChange={(e) => set('unit', e.target.value as SizeUnit)}>
                {toOptions(UNIT_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <div className="grid-2">
            <Field label="Box type" error={errors.ply}>
              <SegmentedControl
                label="Box type"
                options={toOptions(PLY_LABELS)}
                value={form.ply}
                onChange={(v) => set('ply', v)}
              />
            </Field>

            <Field label="Laminated" error={errors.laminated}>
              <SegmentedControl
                label="Laminated"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
                value={form.laminated === null ? null : form.laminated ? 'yes' : 'no'}
                onChange={setLaminated}
              />
            </Field>
          </div>

          {form.laminated && (
            <fieldset className="pair-row">
              <legend className="field__label">Lamination size</legend>
              {(
                [
                  ['lamLength', 'Length', 'laminationSize.length'],
                  ['lamWidth', 'Width', 'laminationSize.width'],
                ] as const
              ).map(([key, label, errorKey], i) => (
                <div className={`field ${errors[errorKey] ? 'field--error' : ''}`} key={key}>
                  <label className="field__sublabel" htmlFor={key}>
                    {label}
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
                    {i === 1 && <span className="pair-row__unit">{UNIT_LABELS[form.unit]}</span>}
                  </div>
                  {errors[errorKey] && <p className="field__error">{errors[errorKey]}</p>}
                </div>
              ))}
              {errors.laminationSize && <p className="field__error pair-row__error">{errors.laminationSize}</p>}
            </fieldset>
          )}
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">Paper</h2>

          <div className="grid-2">
            <Field label="Paper type" error={errors.paperType}>
              <SegmentedControl
                label="Paper type"
                options={toOptions(PAPER_LABELS)}
                value={form.paperType}
                onChange={setPaperType}
              />
            </Field>

            {form.paperType === 'printed' && (
              <Field label="Printing" error={errors.printType}>
                <SegmentedControl
                  label="Printing"
                  options={toOptions(PRINT_LABELS)}
                  value={form.printType}
                  onChange={(v) => set('printType', v)}
                />
              </Field>
            )}
          </div>

          <div className="grid-2">
            <Field label="Inside paper — Top" htmlFor="top" error={errors['insidePaper.top']}>
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
              label="Inside paper — Fluted"
              htmlFor="fluted"
              error={errors['insidePaper.fluted']}
              hint="One value, or several separated by / (e.g. 120/150/160)"
            >
              <input
                id="fluted"
                type="text"
                autoComplete="off"
                placeholder="e.g. 120/150"
                value={form.fluted}
                // Only digits, decimal point, slash and spaces can be typed.
                onChange={(e) => set('fluted', e.target.value.replace(/[^0-9./\s]/g, ''), 'insidePaper.fluted')}
              />
            </Field>
          </div>
        </section>

        <section className="panel form-section">
          <h2 className="form-section__title">Quantity, price &amp; delivery</h2>
          <div className="grid-2">
            <Field label="Quantity (boxes)" htmlFor="quantity" error={errors.quantity}>
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
            <Field label="Rate per box" htmlFor="ratePerBox" error={errors.ratePerBox}>
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

          <Field label="Applicable GST" error={errors.gstApplicable}>
            <SegmentedControl
              label="Applicable GST"
              options={[
                { value: 'yes', label: `Yes (${GST_RATE_PERCENT}%)` },
                { value: 'no', label: 'No' },
              ]}
              value={form.gstApplicable === null ? null : form.gstApplicable ? 'yes' : 'no'}
              onChange={(v) => set('gstApplicable', v === 'yes')}
            />
          </Field>

          <AmountSummary quantity={form.quantity} rate={form.ratePerBox} gstApplicable={form.gstApplicable} />

          <Field label="Expected delivery date" htmlFor="expectedDeliveryDate" error={errors.expectedDeliveryDate}>
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
            Clear
          </button>
          <button type="submit" className="button button--primary button--lg" disabled={submitting}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </form>
    </div>
  );
}
