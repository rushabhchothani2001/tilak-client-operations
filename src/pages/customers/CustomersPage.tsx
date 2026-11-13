import { useEffect, useState } from 'react';
import { customersApi } from '../../api';
import { errorMessage } from '../../api/http';
import { Alert, EmptyState, LoadingState, Modal, PageHeader } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import type { Customer } from '../../types';
import { CustomerForm } from './CustomerForm';

type Editing = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

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
      customers.reload();
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) });
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Customers"
        subtitle="Customer contact, GST and address details."
        actions={
          <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
            + Add Customer
          </button>
        }
      />

      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="toolbar">
        <input
          type="search"
          className="toolbar__search"
          placeholder="Search by name, company, phone or GST"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {customers.error && <Alert>{customers.error}</Alert>}

      {customers.loading && !customers.data ? (
        <LoadingState />
      ) : customers.data && customers.data.length === 0 ? (
        <EmptyState title={search ? 'No customers match your search' : 'No customers yet'}>
          {!search && (
            <button type="button" className="button button--primary" onClick={() => setEditing({ mode: 'create' })}>
              Add the first customer
            </button>
          )}
        </EmptyState>
      ) : (
        customers.data && (
          <div className="card table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Helpline</th>
                  <th>GST number</th>
                  <th>Address</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {customers.data.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="strong">{c.name}</div>
                      {c.companyName && <div className="muted small">{c.companyName}</div>}
                    </td>
                    <td className="nowrap">{c.phone}</td>
                    <td className="nowrap">{c.helplinePhone || <span className="muted">—</span>}</td>
                    <td className="mono">{c.gstNumber || <span className="muted">—</span>}</td>
                    <td className="address-cell">{c.address || <span className="muted">—</span>}</td>
                    <td className="row-actions">
                      <button type="button" className="link-button" onClick={() => setEditing({ mode: 'edit', customer: c })}>
                        Edit
                      </button>
                      <button type="button" className="link-button link-button--danger" onClick={() => handleDelete(c)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {editing && (
        <Modal title={editing.mode === 'edit' ? 'Edit customer' : 'Add customer'} onClose={() => setEditing(null)}>
          <CustomerForm
            customer={editing.mode === 'edit' ? editing.customer : undefined}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
