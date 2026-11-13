import { useEffect, useState } from 'react';
import { customersApi } from '../../api';
import { errorMessage } from '../../api/http';
import { Icon } from '../../components/icons';
import { Alert, EmptyState, LoadingState, Modal, PageHeader } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useAsync } from '../../lib/useAsync';
import type { Customer } from '../../types';
import { CustomerForm } from './CustomerForm';

type Editing = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

export function CustomersPage() {
  const { t, tn } = useI18n();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const customers = useAsync(() => customersApi.list(search), [search]);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSaved = (customer: Customer) => {
    setMessage({
      tone: 'success',
      text: editing?.mode === 'edit' ? t('customers.updated', { name: customer.name }) : t('customers.added', { name: customer.name }),
    });
    setEditing(null);
    customers.reload();
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(t('customers.confirmDelete', { name: customer.name }))) return;
    try {
      await customersApi.remove(customer._id);
      setMessage({ tone: 'success', text: t('customers.deleted', { name: customer.name }) });
      setEditing(null);
      customers.reload();
    } catch (error) {
      setEditing(null);
      setMessage({ tone: 'error', text: errorMessage(error) });
    }
  };

  const count = customers.data?.length ?? 0;

  return (
    <div className="page">
      <PageHeader
        title={t('customers.title')}
        subtitle={customers.data ? tn('customers.count', count) : undefined}
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <Icon name="plus" size={18} />
            {t('customers.add')}
          </button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">{t('customers.search')}</span>
          <input
            type="search"
            placeholder={t('customers.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      </div>

      {customers.error && <Alert>{customers.error}</Alert>}

      {customers.loading && !customers.data ? (
        <LoadingState />
      ) : customers.data && customers.data.length === 0 ? (
        <EmptyState title={search ? t('customers.noMatch') : t('customers.empty')}>
          {!search && (
            <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
              {t('customers.addFirst')}
            </button>
          )}
        </EmptyState>
      ) : (
        customers.data && (
          <div className="panel">
            <table className="table hide-phone">
              <thead>
                <tr>
                  <th>{t('customers.col.customer')}</th>
                  <th>{t('customers.col.phone')}</th>
                  <th>{t('customers.col.gst')}</th>
                  <th>{t('customers.col.address')}</th>
                  <th aria-label={t('common.actions')} />
                </tr>
              </thead>
              <tbody>
                {customers.data.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="row-title">{c.name}</div>
                      {c.companyName && <div className="subline">{c.companyName}</div>}
                    </td>
                    <td className="nowrap">
                      <div>{c.phone}</div>
                      {c.helplinePhone && <div className="subline">{c.helplinePhone}</div>}
                    </td>
                    <td className="nowrap tabular">{c.gstNumber || <span className="dash">—</span>}</td>
                    <td className="address-cell">{c.address || <span className="dash">—</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="link-button" onClick={() => setEditing({ mode: 'edit', customer: c })}>
                        {t('common.edit')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="row-list show-phone">
              {customers.data.map((c) => (
                <li key={c._id} className="row-item">
                  <button
                    type="button"
                    className="row-item__main row-item__button"
                    onClick={() => setEditing({ mode: 'edit', customer: c })}
                  >
                    <span className="row-title">{c.name}</span>
                    <span className="row-item__sub">
                      {[c.companyName, c.gstNumber].filter(Boolean).join(' · ') || t('customers.noCompany')}
                    </span>
                  </button>
                  <a className="button button--secondary button--icon" href={telHref(c.phone)} aria-label={t('customers.call', { name: c.name })}>
                    <Icon name="phone" size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {editing && (
        <Modal title={editing.mode === 'edit' ? t('customers.editTitle') : t('customers.add')} onClose={() => setEditing(null)}>
          <CustomerForm
            customer={editing.mode === 'edit' ? editing.customer : undefined}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
            onDelete={editing.mode === 'edit' ? () => handleDelete(editing.customer) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}
