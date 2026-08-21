import { useState } from 'react';
import PendingStaffList from '../components/PendingStaffList';
import AdminStaffList from '../components/AdminStaffList';

const AdminStaffPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="page-content staff-management-page">
      <div className="admin-staff-management staff-management-content">
        <PendingStaffList onSuccess={handleSuccess} />
        <AdminStaffList refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AdminStaffPage;
