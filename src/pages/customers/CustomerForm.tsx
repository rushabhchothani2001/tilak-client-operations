import { FormEvent, useState } from 'react';
import { customersApi } from '../../api';
import { ApiError, errorMessage } from '../../api/http';
import { Alert, Field } from '../../components/ui';
import { useI18n, type Translate } from '../../i18n';
import type { Customer, CustomerInput } from '../../types';

const EMPTY: CustomerInput = {
  name: '',
  companyName: '',
  phone: '',
  helplinePhone: '',
  gstNumber: '',
  address: '',
};

const PHONE_REGEX = /^\+?[0-9][0-9\s-]{6,14}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function validate(values: CustomerInput, t: Translate) {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = t('v.customerName');
  if (!values.phone.trim()) errors.phone = t('v.phoneRequired');
  else if (!PHONE_REGEX.test(values.phone.trim())) errors.phone = t('v.phone');
  if (values.helplinePhone.trim() && !PHONE_REGEX.test(values.helplinePhone.trim()))
    errors.helplinePhone = t('v.phone');
  if (values.gstNumber.trim() && !GST_REGEX.test(values.gstNumber.trim().toUpperCase()))
    errors.gstNumber = t('v.gstin');
  return errors;
}

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
  onDelete,
}: {
  customer?: Customer;
  onSaved: (customer: Customer) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { t } = useI18n();
  const [values, setValues] = useState<CustomerInput>(
    customer
      ? {
          name: customer.name,
          companyName: customer.companyName,
          phone: customer.phone,
          helplinePhone: customer.helplinePhone,
          gstNumber: customer.gstNumber,
          address: customer.address,
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof CustomerInput, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _removed, ...rest }) => rest);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const clientErrors = validate(values, t);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSaving(true);
    try {
      const saved = customer
        ? await customersApi.update(customer._id, values)
        : await customersApi.create(values);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      setSubmitError(errorMessage(error));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {submitError && <Alert>{submitError}</Alert>}

      <div className="grid-2">
        <Field label={t('cform.name')} htmlFor="name" error={errors.name}>
          <input id="name" autoFocus value={values.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label={t('cform.company')} htmlFor="companyName" error={errors.companyName}>
          <input id="companyName" value={values.companyName} onChange={(e) => set('companyName', e.target.value)} />
        </Field>
        <Field label={t('cform.phone')} htmlFor="phone" error={errors.phone}>
          <input id="phone" type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label={t('cform.helpline')} htmlFor="helplinePhone" error={errors.helplinePhone}>
          <input
            id="helplinePhone"
            type="tel"
            value={values.helplinePhone}
            onChange={(e) => set('helplinePhone', e.target.value)}
          />
        </Field>
      </div>

      <Field label={t('cform.gst')} htmlFor="gstNumber" error={errors.gstNumber} hint={t('cform.gstHint')}>
        <input
          id="gstNumber"
          className="uppercase"
          maxLength={15}
          value={values.gstNumber}
          onChange={(e) => set('gstNumber', e.target.value.toUpperCase())}
        />
      </Field>

      <Field label={t('cform.address')} htmlFor="address" error={errors.address}>
        <textarea id="address" rows={3} value={values.address} onChange={(e) => set('address', e.target.value)} />
      </Field>

      <div className="form-actions">
        {onDelete && (
          <button type="button" className="button button--danger-text form-actions__left" onClick={onDelete}>
            {t('common.delete')}
          </button>
        )}
        <button type="button" className="button button--secondary" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? t('common.saving') : customer ? t('common.saveChanges') : t('customers.add')}
        </button>
      </div>
    </form>
  );
}
