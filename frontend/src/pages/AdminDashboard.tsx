import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/admin.service';
import WelcomeMessage from '../components/WelcomeMessage';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [totalStaff, setTotalStaff] = useState(0);
  const [pendingStaff, setPendingStaff] = useState(0);
  const [presentRecords, setPresentRecords] = useState(0);
  const [presentDate, setPresentDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staffRes, pendingRes, summaryRes] = await Promise.all([
          adminService.getStaffList(),
          adminService.getPendingStaff(),
          adminService.getAttendanceSummary(),
        ]);

        if (staffRes.success && staffRes.data) {
          setTotalStaff(staffRes.data.length);
        }
        if (pendingRes.success && pendingRes.data) {
          setPendingStaff(pendingRes.data.length);
        }
        if (summaryRes.success && summaryRes.data) {
          setPresentRecords(summaryRes.data.presentRecords);
          setPresentDate(summaryRes.data.date);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handlePresentClick = () => {
    if (presentDate) {
      navigate(`/admin/attendance?reportType=daily&date=${presentDate}`);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="admin-dashboard-page">
      <WelcomeMessage />
      <div className="dashboard-cards">
      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{totalStaff}</div>
          <div className="card-label">Total Staff</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{pendingStaff}</div>
          <div className="card-label">Pending Staff</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content" onClick={handlePresentClick} style={{ cursor: presentDate ? 'pointer' : 'default' }}>
          <div className="card-value">{presentRecords}</div>
          <div className="card-label">Present Records</div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminDashboard;
