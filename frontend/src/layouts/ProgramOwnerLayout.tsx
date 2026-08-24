import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { authService } from '../services/auth.service';

const ProgramOwnerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = authService.getCurrentUser();
  const displayRole = useMemo(() => {
    const role = 'PROGRAM OWNER';
    const deptName = currentUser?.departmentName;
    return deptName ? `${role} - ${deptName}` : role;
  }, [currentUser?.departmentName]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/program-owner', label: 'Dashboard' },
    { path: '/program-owner/master-admins', label: 'Master Admins' },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/program-owner') return 'Dashboard';
    if (path === '/program-owner/master-admins') return 'Master Admins';
    return 'Dashboard';
  };

  return (
    <div className="master-admin-layout">
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h1 className="mobile-title">{getPageTitle()}</h1>
      </div>

      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="app-name">Staff Attendance</h2>
          <p className="user-role">{displayRole}</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => navigate('/profile')} className="profile-btn">
            Profile
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="content-wrapper">
          <h1 className="page-title">{getPageTitle()}</h1>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default ProgramOwnerLayout;