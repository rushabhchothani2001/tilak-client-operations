import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customersApi, ordersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { Alert, Field, PageHeader, SegmentedControl } from '../../components/ui';
import { PAPER_LABELS, PLY_LABELS, PRINT_LABELS, UNIT_LABELS, toOptions } from '../../lib/labels';
import { parseSlashNumbers, todayInputValue } from '../../lib/format';
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
  quantity: string;
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
  quantity: '',
  expectedDeliveryDate: '',
};

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
  if (!form.quantity.trim() || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 1)
    errors.quantity = 'Enter a whole number of at least 1';
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
    quantity: Number(form.quantity),
    expectedDeliveryDate: form.expectedDeliveryDate,
  };
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
                onChange={(v) => set('laminated', v === 'yes')}
              />
            </Field>
          </div>
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
          <h2 className="form-section__title">Quantity &amp; delivery</h2>
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
            <Field label="Expected delivery date" htmlFor="expectedDeliveryDate" error={errors.expectedDeliveryDate}>
              <input
                id="expectedDeliveryDate"
                type="date"
                min={todayInputValue()}
                value={form.expectedDeliveryDate}
                onChange={(e) => set('expectedDeliveryDate', e.target.value)}
              />
            </Field>
          </div>
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
