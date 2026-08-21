import { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendance.service';
import { authService } from '../../services/auth.service';

const StaffDashboardPage = () => {
  const [currentSession, setCurrentSession] = useState<{ clockInTime: string; clockInLocationStatus: string } | null>(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState<{ totalDays: number; totalMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const user = authService.getCurrentUser();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [session, history] = await Promise.all([
          attendanceService.getCurrentSession().catch(() => ({ success: false, data: null })),
          attendanceService.getAttendanceHistory(getCurrentMonth()).catch(() => ({ success: false, data: { records: [] } })),
        ]);

        if (session.success && session.data) {
          setCurrentSession(session.data);
        }

        if (history.success && history.data?.records) {
          const records = history.data.records;
          const totalDays = records.length;
          const totalMinutes = records.reduce((sum: number, record: any) => sum + (record.workingMinutes || 0), 0);
          setMonthlyAttendance({ totalDays, totalMinutes });
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatWorkingTime = (minutes: number) => {
    if (!minutes) return '0 hr';
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    if (remaining === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${remaining} min`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="staff-dashboard-page">
      {loading ? (
        <div className="staff-dashboard-loading">Loading dashboard...</div>
      ) : (
        <>
          {/* Welcome Hero */}
          <div className="staff-dashboard-welcome">
            <div className="welcome-greeting">
              <div className="welcome-title">Welcome, {user?.name || 'Staff'}</div>
              <div className="welcome-subtitle">Have a productive day.</div>
              <div className="welcome-date">{getCurrentDate()}</div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="staff-dashboard-grid">
            <div className="staff-dashboard-card">
              <div className="sd-card-label">Today Status</div>
              <div className="sd-card-value">{currentSession ? 'Clocked In' : 'Not Clocked In'}</div>
            </div>

            {currentSession && (
              <div className="staff-dashboard-card">
                <div className="sd-card-label">Current Session</div>
                <div className="sd-card-value">
                  {new Date(currentSession.clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="sd-card-sub">{currentSession.clockInLocationStatus}</div>
              </div>
            )}

            {monthlyAttendance && (
              <div className="staff-dashboard-card">
                <div className="sd-card-label">This Month</div>
                <div className="sd-card-value">{monthlyAttendance.totalDays} days</div>
                <div className="sd-card-sub">{formatWorkingTime(monthlyAttendance.totalMinutes)} worked</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StaffDashboardPage;
