import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, type AttendanceRecord } from '../services/admin.service';
import { openLocation } from '../utils/map';
import AssignedTaskCell from './AssignedTaskCell';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
  const [deletingRecords, setDeletingRecords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSessionOnly, setActiveSessionOnly] = useState(false);
  const attendanceTableRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const displayedAttendance = activeSessionOnly
    ? attendance.filter((record) => record.sessionStatus === 'CLOCKED_IN')
    : attendance;

  // Deleted staff management state
  const [deletedStaffMode] = useState(false);
  const [deletedStaffList, setDeletedStaffList] = useState<Array<{ id: string; employeeId: string; name: string }>>([]);
  const [selectedDeletedStaffId, setSelectedDeletedStaffId] = useState('');
  const [deletedStaffRecords, setDeletedStaffRecords] = useState<AttendanceRecord[]>([]);
  const [loadingDeletedRecords, setLoadingDeletedRecords] = useState(false);

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

  const loadAttendance = async () => {
    const validationMsg = validateFilters();
    if (validationMsg) {
      setValidationError(validationMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const dateParams = buildDateParams();
      const response = await adminService.getAttendance(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate,
        employeeId || undefined,
        page,
        limit
      );

      if (response.success && response.data) {
        setAttendance(response.data.records);
        setPagination(response.data);
        setSelectedIds(new Set());
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
    setStartDate('');
    setEndDate('');
    setValidationError(null);
    setPage(1);
  };

  const handleExport = async () => {
    const validationMsg = validateFilters();
    if (validationMsg) {
      setValidationError(validationMsg);
      return;
    }

    try {
      setExporting(true);
      const dateParams = buildDateParams();
      const blob = await adminService.exportAttendance(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate,
        employeeId || undefined
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
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSelectDeletedStaff = async (employeeId: string) => {
    setSelectedDeletedStaffId(employeeId);
    setDeletedStaffRecords([]);
    setError(null);
    setSuccessMessage(null);

    if (!employeeId) {
      return;
    }

    setLoadingDeletedRecords(true);

    try {
      const response = await adminService.getDeletedStaffAttendance(employeeId);
      if (response.success && response.data) {
        setDeletedStaffRecords(response.data.records || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deleted staff attendance records');
    } finally {
      setLoadingDeletedRecords(false);
    }
  };

  const handleDeleteSelectedStaffRecords = async () => {
    if (!selectedDeletedStaffId) {
      return;
    }

    const selectedStaff = deletedStaffList.find(
      (s) => s.employeeId === selectedDeletedStaffId
    );
    const staffLabel = selectedStaff
      ? `${selectedStaff.employeeId} - ${selectedStaff.name}`
      : selectedDeletedStaffId;

    if (!window.confirm(`Are you sure you want to permanently delete attendance records for this deleted staff?\n\n${staffLabel}`)) {
      return;
    }

    setDeletingRecords(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await adminService.deleteDeletedStaffAttendance(selectedDeletedStaffId);
      if (response.success) {
        setSuccessMessage(response.message || 'Deleted staff attendance records removed successfully');
        setDeletedStaffRecords([]);
        setSelectedDeletedStaffId('');
        // Refresh deleted staff list in case it needs updating
        const staffResponse = await adminService.getDeletedStaff();
        if (staffResponse.success && staffResponse.data) {
          setDeletedStaffList(staffResponse.data);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff records');
    } finally {
      setDeletingRecords(false);
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(attendance.map((r) => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the selected attendance records?\n\nSelected Records: ${selectedIds.size}\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingRecords(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await adminService.deleteAttendance(Array.from(selectedIds));
      if (response.success) {
        setSuccessMessage(response.message || 'Selected attendance records deleted successfully');
        setSelectedIds(new Set());
        await loadAttendance();
      } else {
        setError(response.message || 'Failed to delete selected attendance records');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete selected attendance records');
    } finally {
      setDeletingRecords(false);
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

      {successMessage && (
        <div className="success-message">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="close-button">×</button>
        </div>
      )}

      {validationError && (
        <div className="error-message">
          {validationError}
          <button onClick={() => setValidationError(null)} className="close-button">×</button>
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

        <div className="filters-row filters-row-buttons attendance-action-group">
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
            {exporting ? 'Preparing Download...' : 'Download Report'}
          </button>
        </div>

        {deletedStaffMode && (
          <div className="filters-row filters-row-two-col deleted-staff-management">
            {deletedStaffList.length === 0 ? (
              <div className="deleted-staff-empty-state">
                <span className="deleted-staff-empty-icon">🗑</span>
                <span className="deleted-staff-empty-message">
                  No deleted staff records available.
                </span>
              </div>
            ) : (
              <>
                <div className="filter-group">
                  <label htmlFor="deletedStaffSelect">Select Deleted Staff</label>
                  <select
                    id="deletedStaffSelect"
                    value={selectedDeletedStaffId}
                    onChange={(e) => handleSelectDeletedStaff(e.target.value)}
                    disabled={loadingDeletedRecords || deletingRecords}
                  >
                    <option value="">-- Select Deleted Staff --</option>
                    {deletedStaffList.map((staff) => (
                      <option key={staff.id} value={staff.employeeId}>
                        {staff.employeeId} - {staff.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDeletedStaffId && (
                  <div className="filter-group">
                    <label>&nbsp;</label>
                    <button
                      onClick={handleDeleteSelectedStaffRecords}
                      disabled={deletingRecords || loadingDeletedRecords || deletedStaffRecords.length === 0}
                      className="export-button delete-deleted-records-button"
                    >
                      {deletingRecords ? 'Deleting...' : 'Delete Staff Records'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {deletedStaffMode ? (
        loadingDeletedRecords ? (
          <div className="loading-state">Loading deleted staff attendance records...</div>
        ) : !selectedDeletedStaffId ? (
          <div className="empty-state">Select a deleted staff member to view their attendance records.</div>
        ) : deletedStaffRecords.length === 0 ? (
          <div className="empty-state">No deleted attendance records found for the selected staff member.</div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deletedStaffRecords.map((record, index) => (
                  <tr key={`${record.employeeId}-${record.attendanceDate}-${index}`} className="deleted-attendance-row">
                    <td>{record.employeeId}</td>
                    <td>{record.employeeName}</td>
                    <td>{record.attendanceDate}</td>
                    <td>{formatTimeOnly(record.clockInTime)}</td>
                    <td>{formatTimeOnly(record.clockOutTime)}</td>
                    <td>
                      <div className="location-cell">
                        {record.clockInLocationName ? (
                          <span className="location-name">{record.clockInLocationName}</span>
                        ) : record.clockInLatitude && record.clockInLongitude ? (
                          <span className="location-captured">Location captured</span>
                        ) : (
                          <span className="not-available">Not available</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-deleted-attendance">DELETED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : loading ? (
        <div className="loading-state">Loading attendance report...</div>
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

            {displayedAttendance.length === 0 ? (
              <div className="empty-state">
                {activeSessionOnly
                  ? 'No active Staff sessions found.'
                  : 'No attendance records found for the selected period.'}
              </div>
            ) : (
              <>
                <div className="attendance-selection-controls attendance-action-group">
                  <button
                    onClick={handleSelectAll}
                    disabled={loading || deletingRecords}
                    className="export-button"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    disabled={loading || deletingRecords}
                    className="export-button"
                  >
                    Deselect All
                  </button>
                  <span className="selected-records-info">
                    Selected Records: {selectedIds.size}
                  </span>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedIds.size === 0 || loading || deletingRecords}
                    className="export-button delete-deleted-records-button"
                  >
                    {deletingRecords ? 'Deleting...' : 'Delete Selected Records'}
                  </button>
                </div>
                <div className="attendance-table-wrapper">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Employee ID</th>
                        <th>Employee Name</th>
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
                      {displayedAttendance.map((record, index) => (
                        <tr key={`${record.employeeId}-${record.attendanceDate}-${index}`} className={record.isDeleted ? 'deleted-attendance-row' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record.id)}
                              onChange={() => toggleSelected(record.id)}
                              disabled={deletingRecords}
                            />
                          </td>
                          <td>{record.employeeId}</td>
                          <td>{record.employeeName}</td>
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
                          <td>
                            {record.isDeleted ? (
                              <span className="status-badge status-deleted-attendance">DELETED</span>
                            ) : (
                              record.attendanceStatus
                            )}
                          </td>
                          <td>{record.sessionStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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