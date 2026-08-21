import { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';
import AdminAttendance from '../components/AdminAttendance';

const AdminAttendancePage = () => {
  const [staffList, setStaffList] = useState<Array<{ employeeId: string; name: string }>>([]);

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const response = await adminService.getStaffList();
        if (response.success && response.data) {
          setStaffList(response.data.map((s) => ({ employeeId: s.employeeId, name: s.name })));
        }
      } catch (error) {
        console.error('Failed to load staff list:', error);
      }
    };

    loadStaff();
  }, []);

  return (
    <div className="admin-attendance-page">
      <AdminAttendance staffList={staffList} />
    </div>
  );
};

export default AdminAttendancePage;
