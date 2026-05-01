import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Accounts.css';
import { supabase } from '../supabaseClient';

function Accounts({ records = [], crops = [] }) {
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'Farm Worker',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadAccounts = async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.error('Error loading accounts', error);
        return;
      }

      if (!mounted || !data) return;

      setAccounts(data.map((account) => ({
        id: account.id,
        fullName: account.full_name,
        username: account.username,
        role: account.role,
        email: account.email,
        status: account.status,
        createdAt: account.created_at
          ? new Date(account.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : ''
      })));
    };

    loadAccounts();
    return () => {
      mounted = false;
    };
  }, []);

  const accountStats = useMemo(() => {
    const active = accounts.filter((a) => a.status === 'Active').length;
    const inactive = accounts.filter((a) => a.status === 'Inactive').length;
    const admins = accounts.filter((a) => a.role === 'Admin').length;
    return {
      total: accounts.length,
      active,
      inactive,
      admins
    };
  }, [accounts]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();

    const normalizedUsername = formData.username.trim().toLowerCase();
    const normalizedEmail = formData.email.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !formData.password) {
      setMessage('Please complete all fields.');
      return;
    }

    const exists = accounts.some(
      (account) => account.username.toLowerCase() === normalizedUsername
    );

    if (exists) {
      setMessage('Username already exists. Please choose another one.');
      return;
    }

    const insertPayload = {
      full_name: formData.fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: formData.password,
      role: formData.role,
      status: 'Active'
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Error creating account', error);
      setMessage('Unable to create account. Please try again.');
      return;
    }

    const newAccount = {
      id: data.id,
      fullName: data.full_name,
      username: data.username,
      role: data.role,
      email: data.email,
      status: data.status,
      createdAt: data.created_at
        ? new Date(data.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : ''
    };

    setAccounts((prev) => [newAccount, ...prev]);
    setFormData({
      fullName: '',
      username: '',
      role: 'Farm Worker',
      email: '',
      password: ''
    });
    setMessage('Account created successfully.');
  };

  const handleToggleStatus = async (id) => {
    const account = accounts.find((a) => a.id === id);
    if (!account) return;

    const newStatus = account.status === 'Active' ? 'Inactive' : 'Active';
    const { error } = await supabase
      .from('accounts')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error toggling account status', error);
      setMessage('Unable to update account status.');
      return;
    }

    setAccounts((prev) => prev.map((current) => (
      current.id === id ? { ...current, status: newStatus } : current
    )));
    setMessage('Account status updated.');
  };

  const handleDeleteAccount = async (id) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account', error);
      setMessage('Unable to delete account.');
      return;
    }

    setAccounts((prev) => prev.filter((account) => account.id !== id));
    setMessage('Account deleted successfully.');
  };

  return (
    <div className="accounts-container">
      <div className="accounts-header">
        <div>
          <h1>Accounts</h1>
          <p>Create and manage user accounts for your farm team.</p>
        </div>
      </div>

      <div className="accounts-stats-grid">
        <div className="accounts-stat-card">
          <span>Total Accounts</span>
          <strong>{accountStats.total}</strong>
        </div>
        <div className="accounts-stat-card">
          <span>Active Users</span>
          <strong>{accountStats.active}</strong>
        </div>
        <div className="accounts-stat-card">
          <span>Inactive Users</span>
          <strong>{accountStats.inactive}</strong>
        </div>
        <div className="accounts-stat-card">
          <span>Admins</span>
          <strong>{accountStats.admins}</strong>
        </div>
      </div>

      <div className="accounts-layout">
        <section className="accounts-card account-create-card">
          <h2>Create User Account</h2>
          <form onSubmit={handleCreateAccount} className="account-form">
            <div className="account-form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="account-form-row">
              <div className="account-form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="account-form-group">
                <label>Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="Farm Worker">Farm Worker</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="account-form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="account-form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Set temporary password"
                required
              />
            </div>

            {message && <p className="account-message">{message}</p>}

            <button type="submit" className="create-account-btn">+ Create Account</button>
          </form>
        </section>

        <section className="accounts-card accounts-list-card">
          <h2>Team Accounts</h2>

          <div className="accounts-table-wrap">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.fullName}</td>
                    <td>{account.username}</td>
                    <td>{account.role}</td>
                    <td>
                      <span className={`account-status ${account.status.toLowerCase()}`}>
                        {account.status}
                      </span>
                    </td>
                    <td>{account.createdAt}</td>
                    <td>
                      <div className="account-actions">
                        <button
                          type="button"
                          className="account-action-btn"
                          onClick={() => handleToggleStatus(account.id)}
                        >
                          {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="account-action-btn delete"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Accounts;
