import { useState } from 'react';
import { attendanceService } from '../services/attendance.service';
import { openLocation } from '../utils/map';
import AssignedTaskCell from './AssignedTaskCell';

interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  clockInTime: string;
  clockInLatitude: string | null;
  clockInLongitude: string | null;
  clockInLocationName: string | null;
  clockInMethod: string | null;
  assignedTask: string | null;
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

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const AttendanceHistory = () => {
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({
    period: '',
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const buildDateParams = (): {
    date?: string;
    month?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
  } => {
    switch (reportType) {
      case 'daily':
        return { date: date || undefined };
      case 'weekly':
        return { date: date || undefined };
      case 'monthly':
        return { month };
      case 'yearly':
        return { year };
      case 'custom':
        return {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
      default:
        return { month };
    }
  };

  const validateFilters = (): string | null => {
    setValidationError(null);

    if (reportType === 'daily' && !date) {
      return 'Please select a date for the daily report.';
    }

    if (reportType === 'weekly' && !date) {
      return 'Please select a date within the week for the weekly report.';
    }

    if (reportType === 'custom') {
      if (!startDate) {
        return 'Start Date is required for the custom date range report.';
      }
      if (!endDate) {
        return 'End Date is required for the custom date range report.';
      }
      if (endDate < startDate) {
        return 'End Date cannot be earlier than Start Date.';
      }
    }

    return null;
  };

  const loadAttendanceHistory = async () => {
    const validationMsg = validateFilters();
    if (validationMsg) {
      setValidationError(validationMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dateParams = buildDateParams();
      const response = await attendanceService.getAttendanceHistory(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate,
        page,
        limit
      );

      if (response.success && response.data) {
        setRecords(response.data.records);
        setPagination(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = () => {
    setPage(1);
    loadAttendanceHistory();
  };

  const handleDownload = async () => {
    const validationMsg = validateFilters();
    if (validationMsg) {
      setValidationError(validationMsg);
      return;
    }

    try {
      setExporting(true);
      setError(null);
      const dateParams = buildDateParams();
      const blob = await attendanceService.exportAttendanceHistory(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate
      );

      if (blob.size === 0) {
        setError('No attendance records available to download.');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${reportType}-${dateParams.month || dateParams.year || dateParams.date || `${dateParams.startDate}-to-${dateParams.endDate}`}.csv`;
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

  const formatTimeOnly = (dateString: string | null): string => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
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

  const getWorkingTimeStatus = (minutes: number | null): string => {
    if (!minutes) return 'neutral';
    return minutes >= 9 * 60 ? 'complete' : 'short';
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleReportTypeChange = (newReportType: ReportType) => {
    setReportType(newReportType);
    setDate('');
    setStartDate('');
    setEndDate('');
    setValidationError(null);
    setPage(1);
  };

  const getPeriodInput = () => {
    switch (reportType) {
      case 'daily':
        return (
          <input
            type="date"
            id="period"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            disabled={loading}
          />
        );
      case 'weekly':
        return (
          <input
            type="date"
            id="period"
            value={date}
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            disabled={loading}
            placeholder="Select a date in the week"
          />
        );
      case 'monthly':
        return (
          <input
            type="month"
            id="period"
            value={month}
            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
            disabled={loading}
          />
        );
      case 'yearly':
        return (
          <select
            id="period"
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}
            disabled={loading}
          >
            {Array.from({ length: 10 }, (_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        );
      case 'custom':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="admin-attendance">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-button">×</button>
        </div>
      )}

      {validationError && (
        <div className="error-message">
          {validationError}
          <button onClick={() => setValidationError(null)} className="close-button">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filters-row filters-row-two-col">
          <div className="filter-group">
            <label htmlFor="reportType">Report Type</label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => handleReportTypeChange(e.target.value as ReportType)}
              disabled={loading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="period">
              {reportType === 'custom' ? 'Date Range' : 'Period'}
            </label>
            {reportType === 'custom' ? (
              <div className="custom-date-range">
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  disabled={loading}
                  placeholder="Start Date"
                />
                <span className="date-range-separator">to</span>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  disabled={loading}
                  placeholder="End Date"
                />
              </div>
            ) : (
              getPeriodInput()
            )}
          </div>
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

        <div className="filters-row filters-row-buttons">
          <button
            onClick={handleViewReport}
            disabled={loading}
            className="export-button"
          >
            {loading ? 'Loading...' : 'View Report'}
          </button>

          <button
            onClick={handleDownload}
            disabled={exporting || loading}
            className="export-button download-button"
          >
            {exporting ? 'Preparing Download...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="loading-state">Loading attendance report...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">No attendance records found for the selected period.</div>
      ) : (
        <>
          <div className="table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Assigned Task</th>
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
                    <td>{formatTimeOnly(record.clockInTime)}</td>
                    <td className="assigned-task-cell">
                      <AssignedTaskCell task={record.assignedTask} />
                    </td>
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
                    <td>{formatTimeOnly(record.clockOutTime)}</td>
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
                    <td>
                      <span
                        className={`working-time-badge working-time-${getWorkingTimeStatus(record.workingMinutes)}`}
                        title={
                          record.workingMinutes == null
                            ? undefined
                            : record.workingMinutes >= 9 * 60
                            ? 'Completed 9+ hours'
                            : 'Below 9 hours'
                        }
                      >
                        {formatWorkingTime(record.workingMinutes)}
                      </span>
                    </td>
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

export default AttendanceHistory;
