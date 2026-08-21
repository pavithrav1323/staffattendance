import { useState } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import { openLocation } from '../utils/map';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  clockInTime: string | null;
  clockInLatitude: string | null;
  clockInLongitude: string | null;
  clockInLocationName: string | null;
  clockInMethod: string | null;
  clockOutTime: string | null;
  clockOutLatitude: string | null;
  clockOutLongitude: string | null;
  clockOutLocationName: string | null;
  clockOutMethod: string | null;
  workingMinutes: number | null;
  attendanceStatus: string;
  sessionStatus: string;
}

const MasterAdminAttendance = () => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({
    month: '',
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await masterAdminService.getAttendance(
        month,
        departmentId || undefined,
        employeeId || undefined,
        page,
        limit
      );
      
      if (response.success && response.data) {
        setAttendance(response.data.records);
        setPagination(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = () => {
    setPage(1);
    loadAttendance();
  };

  const handleDownload = async () => {
    try {
      setExporting(true);
      setError(null);
      const blob = await masterAdminService.exportAttendance(
        month,
        departmentId || undefined,
        employeeId || undefined
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `master-admin-attendance-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setExporting(false);
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatWorkingTime = (minutes: number | null): string => {
    if (!minutes) return '--';
    if (minutes === 1) return '1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  return (
    <div className="admin-attendance">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-button">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filter-group">
          <label htmlFor="month">Month</label>
          <input
            type="month"
            id="month"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
            disabled={loading}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="department">Department</label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            disabled={loading}
          >
            <option value="">All Departments</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="employee">Employee</label>
          <input
            type="text"
            id="employee"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
            disabled={loading}
            placeholder="Search by employee ID"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="limit">Page Size</label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            disabled={loading}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <button
          onClick={handleViewReport}
          disabled={loading}
          className="export-button"
        >
          {loading ? 'Loading...' : 'View Report'}
        </button>

        <button
          onClick={handleDownload}
          disabled={exporting}
          className="export-button download-button"
        >
          {exporting ? 'Downloading...' : 'Download Report'}
        </button>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="loading-state">Loading attendance...</div>
      ) : attendance.length === 0 ? (
        <div className="empty-state">No attendance records found for the selected period.</div>
      ) : (
        <>
          <div className="table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock In Location</th>
                  <th>Clock In Method</th>
                  <th>Clock Out</th>
                  <th>Clock Out Location</th>
                  <th>Clock Out Method</th>
                  <th>Working Time</th>
                  <th>Attendance Status</th>
                  <th>Session Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => (
                  <tr key={`${record.employeeId}-${record.attendanceDate}-${index}`}>
                    <td>{record.employeeId}</td>
                    <td>{record.employeeName}</td>
                    <td>{record.attendanceDate}</td>
                    <td>{formatDateTime(record.clockInTime)}</td>
                    <td>
                      <div className="location-cell">
                        {record.clockInLocationName ? (
                          <span className="location-name">{record.clockInLocationName}</span>
                        ) : record.clockInLatitude && record.clockInLongitude ? (
                          <span className="location-captured">Location captured</span>
                        ) : (
                          <span className="not-available">Not available</span>
                        )}
                        {record.clockInLatitude && record.clockInLongitude && (
                          <button
                            onClick={() => openLocation(record.clockInLatitude, record.clockInLongitude)}
                            className="location-button"
                          >
                            View Location
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`method-badge method-${(record.clockInMethod || 'unknown').toLowerCase()}`}>
                        {record.clockInMethod || 'Not recorded'}
                      </span>
                    </td>
                    <td>{formatDateTime(record.clockOutTime)}</td>
                    <td>
                      <div className="location-cell">
                        {record.clockOutLocationName ? (
                          <span className="location-name">{record.clockOutLocationName}</span>
                        ) : record.clockOutLatitude && record.clockOutLongitude ? (
                          <span className="location-captured">Location captured</span>
                        ) : (
                          <span className="not-available">Not available</span>
                        )}
                        {record.clockOutLatitude && record.clockOutLongitude && (
                          <button
                            onClick={() => openLocation(record.clockOutLatitude, record.clockOutLongitude)}
                            className="location-button"
                          >
                            View Location
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`method-badge method-${(record.clockOutMethod || 'unknown').toLowerCase()}`}>
                        {record.clockOutMethod || 'Not recorded'}
                      </span>
                    </td>
                    <td>{formatWorkingTime(record.workingMinutes)}</td>
                    <td>{record.attendanceStatus}</td>
                    <td>{record.sessionStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1 || loading}
              className="pagination-button"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.totalPages || loading}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MasterAdminAttendance;