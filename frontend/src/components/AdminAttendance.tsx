import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, type AttendanceRecord } from '../services/admin.service';
import { openLocation } from '../utils/map';

interface AdminAttendanceProps {
  staffList: Array<{ employeeId: string; name: string }>;
}

const AdminAttendance = ({ staffList }: AdminAttendanceProps) => {
  const [searchParams] = useSearchParams();
  const [reportType, setReportType] = useState('monthly');
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [employeeId, setEmployeeId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({
    period: '',
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [summary, setSummary] = useState({
    date: '',
    presentRecords: 0,
    activeSessions: 0,
    totalWorkingMinutes: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionOnly, setActiveSessionOnly] = useState(false);
  const attendanceTableRef = useRef<HTMLDivElement>(null);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAttendance(
        reportType,
        date || undefined,
        reportType === 'monthly' ? month : undefined,
        reportType === 'yearly' ? year : undefined,
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

  const loadSummary = async () => {
    try {
      const response = await adminService.getAttendanceSummary();
      
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  };

  useState(() => {
    loadSummary();
  });

  useEffect(() => {
    const reportTypeParam = searchParams.get('reportType');
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    if (reportTypeParam) {
      setReportType(reportTypeParam);
    }

    if (dateParam) {
      setDate(dateParam);
    }

    if (monthParam) {
      setMonth(monthParam);
    }

    if (yearParam) {
      setYear(yearParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const reportTypeParam = searchParams.get('reportType');
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    // Auto-load if coming from dashboard with query params
    if (reportTypeParam && (dateParam || monthParam || yearParam)) {
      loadAttendance();
    }
  }, [reportType, date, month, year, searchParams]);

  const handleViewReport = () => {
    setPage(1);
    loadAttendance();
  };

  const handleActiveSessionsClick = () => {
    setActiveSessionOnly(true);
    setPage(1);
    attendanceTableRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const clearActiveSessionFilter = () => {
    setActiveSessionOnly(false);
  };

  const handleReportTypeChange = (newReportType: string) => {
    setReportType(newReportType);
    setDate('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await adminService.exportAttendance(
        reportType,
        date || undefined,
        reportType === 'monthly' ? month : undefined,
        reportType === 'yearly' ? year : undefined,
        employeeId || undefined
      );
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${reportType}-${reportType === 'monthly' ? month : reportType === 'yearly' ? year : date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Export failed');
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

  const formatTotalWorkingTime = (minutes: number): string => {
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

  const filteredStaff = useMemo(() => {
    const trimmed = staffSearch.trim().toLowerCase();
    if (!trimmed) return staffList;
    return staffList.filter(
      (staff: { employeeId: string; name: string }) =>
        staff.name.toLowerCase().includes(trimmed) ||
        staff.employeeId.toLowerCase().includes(trimmed)
    );
  }, [staffList, staffSearch]);

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

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Date</div>
          <div className="summary-value">{summary.date || month}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Present Records</div>
          <div className="summary-value">{summary.presentRecords}</div>
        </div>
        <div
          className={`summary-card summary-card-clickable ${activeSessionOnly ? 'summary-card-active' : ''}`}
          onClick={handleActiveSessionsClick}
          role="button"
          tabIndex={0}
        >
          <div className="summary-label">Active Sessions</div>
          <div className="summary-value">{summary.activeSessions}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Working Time</div>
          <div className="summary-value">{formatTotalWorkingTime(summary.totalWorkingMinutes)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filters-row filters-row-two-col">
          <div className="filter-group">
            <label htmlFor="reportType">Report Type</label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => handleReportTypeChange(e.target.value)}
              disabled={loading}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="period">Period</label>
            {getPeriodInput()}
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="staffSearch">Search Staff</label>
          <input
            type="text"
            id="staffSearch"
            value={staffSearch}
            onChange={(e) => {
              setStaffSearch(e.target.value);
              setPage(1);
            }}
            disabled={loading}
            placeholder="Search by name or employee ID"
          />
          {staffSearch && filteredStaff.length === 0 && (
            <span className="staff-search-hint">No staff found</span>
          )}
        </div>

        <div className="filters-row filters-row-two-col">
          <div className="filter-group">
            <label htmlFor="employee">Employee</label>
            <select
              id="employee"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setPage(1);
              }}
              disabled={loading}
            >
              <option value="">All Employees</option>
              {filteredStaff.map((staff) => (
                <option key={staff.employeeId} value={staff.employeeId}>
                  {staff.employeeId} - {staff.name}
                </option>
              ))}
            </select>
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
            onClick={handleExport}
            disabled={exporting || loading}
            className="export-button"
          >
            {exporting ? 'Exporting...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="loading-state">Loading attendance...</div>
      ) : attendance.length === 0 ? (
        <div className="empty-state">No attendance records found for the selected period.</div>
      ) : (
        <>
          <div
            ref={attendanceTableRef}
            className={`attendance-table-section ${activeSessionOnly ? 'active-session-mode' : ''}`}
          >
            {activeSessionOnly && (
              <div className="active-session-indicator">
                <span>Showing: Active Sessions</span>
                <button
                  onClick={clearActiveSessionFilter}
                  className="clear-active-session-btn"
                  type="button"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {(() => {
              const displayedAttendance = activeSessionOnly
                ? attendance.filter((record) => record.sessionStatus === 'CLOCKED_IN')
                : attendance;

              return displayedAttendance.length === 0 ? (
                <div className="empty-state">
                  {activeSessionOnly
                    ? 'No active Staff sessions found.'
                    : 'No attendance records found for the selected period.'}
                </div>
              ) : (
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
                      {displayedAttendance.map((record, index) => (
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
              );
            })()}
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

export default AdminAttendance;