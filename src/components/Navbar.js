import React, { useEffect, useState } from 'react';
import '../styles/Navbar.css';

function Navbar({ activeTab, setActiveTab, onLogout, userName, userRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const canAccessAccounts = userRole === 'Admin';
  const canAccessReports = userRole !== 'Farm Worker';

  const dateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', !sidebarOpen);

    return () => {
      document.body.classList.remove('sidebar-collapsed');
    };
  }, [sidebarOpen]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Close sidebar on mobile after clicking a menu item
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-profile">
          <div className="sidebar-avatar">{userInitials || 'U'}</div>
          <div className="sidebar-user-info">
            <h3>{userName}</h3>
            <p>{userRole || 'User'}</p>
          </div>
        </div>

        <ul className="sidebar-menu">
          <li>
            <button
              className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('dashboard')}
            >
              <span className="icon">⌂</span>
              <span className="label">Dashboard</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-link ${activeTab === 'farmRecords' ? 'active' : ''}`}
              onClick={() => handleTabChange('farmRecords')}
            >
              <span className="icon">▪</span>
              <span className="label">Farm Records</span>
            </button>
          </li>
          <li>
            <button
              className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => handleTabChange('inventory')}
            >
              <span className="icon">▣</span>
              <span className="label">Inventory</span>
            </button>
          </li>
          {canAccessReports && (
            <li>
              <button
                className={`sidebar-link ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => handleTabChange('reports')}
              >
                <span className="icon">▨</span>
                <span className="label">Reports</span>
              </button>
            </li>
          )}
          {canAccessAccounts && (
            <li>
              <button
                className={`sidebar-link ${activeTab === 'accounts' ? 'active' : ''}`}
                onClick={() => handleTabChange('accounts')}
              >
                <span className="icon">⊙</span>
                <span className="label">Accounts</span>
              </button>
            </li>
          )}
        </ul>

        <button className="sidebar-logout" aria-label="Logout" onClick={onLogout}>
          <span className="icon">⏎</span>
          <span className="label">Logout</span>
        </button>
      </aside>

      <nav className="topbar">
        <button
          className={`hamburger ${sidebarOpen ? '' : 'active'}`}
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="topbar-date"><span className="topbar-icon">⧐</span> {dateString}</div>
      </nav>
    </>
  );
}

export default Navbar;
