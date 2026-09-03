import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { authService } from '../services/auth.service';

const MasterAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUser = authService.getCurrentUser();
  const displayRole = useMemo(() => {
    const role = 'MASTER ADMIN';
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
    { path: '/master-admin', label: 'Dashboard' },
    { path: '/master-admin/admins', label: 'Admin Management' },
    { path: '/master-admin/attendance', label: 'Attendance Report' },
    { path: '/master-admin/staff', label: 'Staff Requests' },
    { path: '/master-admin/departments', label: 'Department' },
    { path: '/master-admin/clinical-reports', label: 'Clinical Report' },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/master-admin') return 'Dashboard';
    if (path === '/master-admin/attendance') return 'Attendance Report';
    if (path === '/master-admin/departments') return 'Department';
    if (path === '/master-admin/admins') return 'Admin Management';
    if (path === '/master-admin/staff') return 'Staff Requests';
    if (path === '/master-admin/clinical-reports') return 'Clinical Report';
    return 'Dashboard';
  };

  return (
    <div className="master-admin-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h1 className="mobile-title">{getPageTitle()}</h1>
      </div>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
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

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          <h1 className="page-title">{getPageTitle()}</h1>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MasterAdminLayout;