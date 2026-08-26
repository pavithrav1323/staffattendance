import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface StaffStats {
  totalRegistered: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

const MasterAdminDashboard = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats>({
    totalRegistered: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const [deptResponse, adminResponse, statsResponse] = await Promise.all([
          masterAdminService.getDepartments(),
          masterAdminService.getAdmins(),
          masterAdminService.getDashboardStats(),
        ]);

        if (deptResponse.success && deptResponse.data) {
          setDepartments(deptResponse.data);
        }
        if (adminResponse.success && adminResponse.data) {
          setAdmins(adminResponse.data);
        }
        if (statsResponse.success && statsResponse.data) {
          setStaffStats(statsResponse.data);
        } else {
          setError('Failed to load staff statistics');
        }
      } catch (error: any) {
        setError(error.message || 'Failed to load dashboard data');
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
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="dashboard-cards">
        <div className="summary-card">
          <div className="card-content">
            <div className="card-value">{staffStats.totalRegistered}</div>
            <div className="card-label">Total Registered Staff</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content" onClick={() => navigate('/master-admin/staff')} style={{ cursor: 'pointer' }}>
            <div className="card-value">{staffStats.pendingApproval}</div>
            <div className="card-label">Pending Approval</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <div className="card-value">{staffStats.approved}</div>
            <div className="card-label">Approved Staff</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-content">
            <div className="card-value">{staffStats.rejected}</div>
            <div className="card-label">Rejected Staff</div>
          </div>
        </div>

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