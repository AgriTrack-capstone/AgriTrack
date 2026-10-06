import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartColumn, faClipboardList, faFileLines, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import '../styles/Navbar.css';

function Navbar({ activeTab, setActiveTab, onLogout, userName, userRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const roleLabel = userRole === 'Farm Worker' ? 'Labor' : userRole || 'User';

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
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: faChartColumn },
    { id: 'farm-records', label: 'Farm Records', icon: faClipboardList },
    { id: 'reports', label: 'Reports', icon: faFileLines }
  ];

  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-profile">
          <div className="sidebar-avatar">{userInitials || 'U'}</div>
          <div className="sidebar-user-info">
            <h3>{userName}</h3>
            <p>{roleLabel}</p>
          </div>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabChange(item.id)}
                type="button"
              >
                <span className="sidebar-link-icon">
                  <FontAwesomeIcon icon={item.icon} />
                </span>
                <span className="label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <button className="sidebar-logout" aria-label="Logout" onClick={onLogout}>
          <span className="sidebar-link-icon">
            <FontAwesomeIcon icon={faRightFromBracket} />
          </span>
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
        <div className="topbar-date">{dateString}</div>
      </nav>
    </>
  );
}

export default Navbar;
