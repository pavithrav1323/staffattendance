import { useState, useEffect } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import WelcomeMessage from '../components/WelcomeMessage';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Admin {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string;
  designation: string | null;
  status: string;
}

const MasterAdminDashboard = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [deptResponse, adminResponse] = await Promise.all([
          masterAdminService.getDepartments(),
          masterAdminService.getAdmins(),
        ]);

        if (deptResponse.success && deptResponse.data) {
          setDepartments(deptResponse.data);
        }
        if (adminResponse.success && adminResponse.data) {
          setAdmins(adminResponse.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <>
      <WelcomeMessage />
      <div className="dashboard-cards">
      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{departments.length}</div>
          <div className="card-label">Departments</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{admins.length}</div>
          <div className="card-label">Admins</div>
        </div>
      </div>
    </div>
    </>
  );
};

export default MasterAdminDashboard;