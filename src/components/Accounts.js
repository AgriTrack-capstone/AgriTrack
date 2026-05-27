import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Accounts.css';

const DEFAULT_FORM = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'Farm Worker',
  status: 'Active'
};

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((account) => account.status === 'Active').length;
    const inactive = accounts.filter((account) => account.status !== 'Active').length;
    const admins = accounts.filter((account) => account.role === 'Admin').length;

    return { total, active, inactive, admins };
  }, [accounts]);

  useEffect(() => {
    let mounted = true;

    async function loadAccounts() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('id, full_name, username, email, role, status, created_at')
        .order('id', { ascending: false });

      if (!mounted) return;

      if (error) {
        setMessage('Unable to load accounts right now.');
      } else {
        setAccounts(data || []);
      }

      setIsLoading(false);
    }

    loadAccounts();
    return () => { mounted = false; };
  }, []);

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => setForm(DEFAULT_FORM);

  const validateForm = () => {
    const trimmedName = form.full_name.trim();
    const trimmedUsername = form.username.trim().toLowerCase();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedName || !trimmedUsername || !trimmedEmail || !form.password.trim()) {
      return 'Please complete all required fields.';
    }

    const duplicateUsername = accounts.some((account) => account.username === trimmedUsername);
    if (duplicateUsername) return 'That username is already used.';

    const duplicateEmail = accounts.some((account) => account.email.toLowerCase() === trimmedEmail);
    if (duplicateEmail) return 'That email is already used.';

    return '';
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setMessage('');

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      role: form.role,
      status: form.status
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert(payload)
      .select('id, full_name, username, email, role, status, created_at')
      .single();

    if (error) {
      setMessage('Failed to create account. Please check values and try again.');
      setIsSaving(false);
      return;
    }

    setAccounts((prev) => [data, ...prev]);
    setMessage('Account created successfully.');
    resetForm();
    setIsSaving(false);
    setShowCreate(false);
  };

  const toggleStatus = async (account) => {
    const nextStatus = account.status === 'Active' ? 'Inactive' : 'Active';
    setMessage('');

    const { error } = await supabase
      .from('accounts')
      .update({ status: nextStatus })
      .eq('id', account.id);

    if (error) {
      setMessage('Unable to update status right now.');
      return;
    }

    setAccounts((prev) => prev.map((item) => (
      item.id === account.id ? { ...item, status: nextStatus } : item
    )));
  };

  const deleteAccount = async (accountId) => {
    setMessage('');

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      setMessage('Unable to delete account right now.');
      return;
    }

    setAccounts((prev) => prev.filter((item) => item.id !== accountId));
  };

  return (
    <div className="accounts-container">
      <header className="accounts-header">
        <h1>Account Management</h1>
        <p>Create user accounts and control access status from one place.</p>
      </header>

      <section className="accounts-stats-grid">
        <article className="accounts-stat-card">
          <span>Total Accounts</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="accounts-stat-card">
          <span>Active Users</span>
          <strong>{stats.active}</strong>
        </article>
        <article className="accounts-stat-card">
          <span>Inactive Users</span>
          <strong>{stats.inactive}</strong>
        </article>
        <article className="accounts-stat-card">
          <span>Admin Users</span>
          <strong>{stats.admins}</strong>
        </article>
      </section>

      <section className="accounts-layout">
        <article className="accounts-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Existing Accounts</h2>
            {!showCreate && (
              <button type="button" className="create-account-toggle" onClick={() => setShowCreate(true)}>Create Account</button>
            )}
          </div>

          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5">Loading accounts...</td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan="5">No accounts found.</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.full_name}</td>
                      <td>{account.username}</td>
                      <td>{account.role}</td>
                      <td>
                        <span className={`account-status ${account.status === 'Active' ? 'active' : 'inactive'}`}>
                          {account.status}
                        </span>
                      </td>
                      <td>
                        <div className="account-actions">
                          <button
                            className="account-action-btn"
                            onClick={() => toggleStatus(account)}
                            type="button"
                          >
                            {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="account-action-btn delete"
                            onClick={() => deleteAccount(account.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {showCreate && (
        <div className="modal-root">
          <div className="floating-backdrop" onClick={() => setShowCreate(false)} />
          <aside className="create-account-float" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Create Account</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close">×</button>

            <form className="account-form" onSubmit={handleCreateAccount}>
              <div className="account-form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={onInputChange}
                  placeholder="e.g. Maria Santos"
                  required
                />
              </div>

              <div className="account-form-row">
                <div className="account-form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={onInputChange}
                    placeholder="maria"
                    required
                  />
                </div>

                <div className="account-form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onInputChange}
                    placeholder="maria@farm.local"
                    required
                  />
                </div>
              </div>

              <div className="account-form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onInputChange}
                  placeholder="Enter a temporary password"
                  required
                />
              </div>

              <div className="account-form-row">
                <div className="account-form-group">
                  <label htmlFor="role">Role</label>
                  <select id="role" name="role" value={form.role} onChange={onInputChange}>
                    <option value="Admin">Admin</option>
                    <option value="Farm Worker">Farm Worker</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="account-form-group">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" value={form.status} onChange={onInputChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {message && <p className="account-message">{message}</p>}

              <button className="create-account-btn" type="submit" disabled={isSaving}>
                {isSaving ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

export default Accounts;
