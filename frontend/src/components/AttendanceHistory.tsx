import { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendance.service';
import { openLocation } from '../utils/map';

interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  clockInTime: string;
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
  clockInLocationStatus: string;
  clockOutLocationStatus: string | null;
}

const AttendanceHistory = () => {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAttendanceHistory();
  }, [month]);

  const loadAttendanceHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await attendanceService.getAttendanceHistory(month);
      
      if (response.success && response.data) {
        setRecords(response.data.records);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance history');
    } finally {
      setLoading(false);
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(e.target.value);
  };

  return (
    <div className="attendance-history">
      <div className="month-selector">
        <label htmlFor="month-select">Select Month:</label>
        <input
          type="month"
          id="month-select"
          value={month}
          onChange={handleMonthChange}
          disabled={loading}
        />
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-button">×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading attendance history...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">No attendance records found for this month.</div>
      ) : (
        <div className="table-container">
          <table className="attendance-table">
            <thead>
              <tr>
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
              {records.map((record) => (
                <tr key={record.id}>
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
      )}
    </div>
  );
};

export default AttendanceHistory;