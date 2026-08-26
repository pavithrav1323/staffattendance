import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/admin.service';
import WelcomeMessage from '../components/WelcomeMessage';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [totalStaff, setTotalStaff] = useState(0);
  const [presentRecords, setPresentRecords] = useState(0);
  const [presentDate, setPresentDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await adminService.getDashboardStats();

        if (response.success && response.data) {
          setTotalStaff(response.data.totalStaff);
          setPresentRecords(response.data.presentRecords);
          setPresentDate(response.data.presentDate);
        } else {
          setError('Failed to load dashboard statistics');
          console.error('Dashboard API returned no data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
        console.error('Failed to load dashboard data:', err);
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
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className="dashboard-cards">
        <div className="summary-card">
          <div className="card-content">
            <div className="card-value">{totalStaff}</div>
            <div className="card-label">Total Staff</div>
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
