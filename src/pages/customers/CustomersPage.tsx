import { useEffect, useState } from 'react';
import { customersApi } from '../../api';
import { errorMessage } from '../../api/http';
import { Icon } from '../../components/icons';
import { Alert, EmptyState, LoadingState, Modal, PageHeader } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import type { Customer } from '../../types';
import { CustomerForm } from './CustomerForm';

type Editing = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const customers = useAsync(() => customersApi.list(search), [search]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleSaved = (customer: Customer) => {
    setMessage({
      tone: 'success',
      text: editing?.mode === 'edit' ? `${customer.name} updated.` : `${customer.name} added.`,
    });
    setEditing(null);
    customers.reload();
  };

  const handleDelete = async (customer: Customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      await customersApi.remove(customer._id);
      setMessage({ tone: 'success', text: `${customer.name} deleted.` });
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
        title="Customers"
        subtitle={customers.data ? `${count} ${count === 1 ? 'customer' : 'customers'}${search ? ' found' : ''}` : undefined}
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            <Icon name="plus" size={18} />
            Add customer
          </button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <span className="visually-hidden">Search customers</span>
          <input
            type="search"
            placeholder="Search name, company, phone or GST"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      </div>

      {customers.error && <Alert>{customers.error}</Alert>}

      {customers.loading && !customers.data ? (
        <LoadingState />
      ) : customers.data && customers.data.length === 0 ? (
        <EmptyState title={search ? 'No customers match your search.' : 'No customers yet.'}>
          {!search && (
            <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
              Add the first customer
            </button>
          )}
        </EmptyState>
      ) : (
        customers.data && (
          <div className="panel">
            <table className="table hide-phone">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>GST number</th>
                  <th>Address</th>
                  <th aria-label="Actions" />
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
                        Edit
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
                      {[c.companyName, c.gstNumber].filter(Boolean).join(' · ') || 'No company or GST'}
                    </span>
                  </button>
                  <a className="button button--secondary button--icon" href={telHref(c.phone)} aria-label={`Call ${c.name}`}>
                    <Icon name="phone" size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {editing && (
        <Modal title={editing.mode === 'edit' ? 'Edit customer' : 'Add customer'} onClose={() => setEditing(null)}>
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
