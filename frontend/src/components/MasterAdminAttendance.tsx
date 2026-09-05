import { useState, useEffect, useMemo } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import { adminService } from '../services/admin.service';
import { openLocation } from '../utils/map';
import AssignedTaskCell from './AssignedTaskCell';
import DeletedStaffAttendance from './DeletedStaffAttendance';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  attendanceDate: string;
  clockInTime: string | null;
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
  isDeleted?: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface StaffMember {
  employeeId: string;
  name: string;
  departmentId: string | null;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const MasterAdminAttendance = () => {
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
  const [departmentId, setDepartmentId] = useState('');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [normalReportMode, setNormalReportMode] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: 'clockIn' | 'clockOut';
    value: string;
  } | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.role === 'MASTER_ADMIN';
    } catch {
      return false;
    }
  }, []);

  // Load departments and staff list on mount
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await masterAdminService.getDepartments();
        if (response.success && response.data) {
          setDepartments(response.data);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };

    const loadStaff = async () => {
      try {
        const response = await adminService.getStaffList();
        if (response.success && response.data) {
          setStaffList(
            response.data.map((s) => ({
              employeeId: s.employeeId,
              name: s.name,
              departmentId: s.departmentId,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };

    loadDepartments();
    loadStaff();
  }, []);

  // Map departmentId -> department name for table display
  const departmentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const toTimeInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleTimeDoubleClick = (
    record: AttendanceRecord,
    field: 'clockIn' | 'clockOut'
  ) => {
    if (!canEdit || record.isDeleted) return;
    const value =
      field === 'clockIn'
        ? toTimeInput(record.clockInTime)
        : toTimeInput(record.clockOutTime);
    setEditingCell({ id: record.id, field, value });
    setError(null);
    setSuccessMessage(null);
  };

  const handleTimeCancel = () => {
    setEditingCell(null);
  };

  const handleTimeSave = async (
    record: AttendanceRecord,
    field: 'clockIn' | 'clockOut'
  ) => {
    if (!editingCell) return;

    const clockIn =
      field === 'clockIn'
        ? editingCell.value
        : toTimeInput(record.clockInTime);
    const clockOut =
      field === 'clockOut'
        ? editingCell.value
        : toTimeInput(record.clockOutTime);

    try {
      const response = await masterAdminService.updateAttendanceTime(
        record.id,
        {
          clockIn,
          clockOut,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      );

      if (response.success) {
        setSuccessMessage(response.message || 'Attendance time updated');
        await loadAttendance();
      } else {
        setError(response.message || 'Failed to update attendance time');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update attendance time');
    } finally {
      setEditingCell(null);
    }
  };

  // Filter staff by selected department
  const filteredStaff = useMemo(() => {
    const trimmed = staffSearch.trim().toLowerCase();
    let list = staffList;

    if (departmentId) {
      list = list.filter((s) => s.departmentId === departmentId);
    }

    if (trimmed) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(trimmed) ||
          s.employeeId.toLowerCase().includes(trimmed)
      );
    }

    return list;
  }, [staffList, departmentId, staffSearch]);


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
      const response = await masterAdminService.getAttendance(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate,
        departmentId || undefined,
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

  const handleViewReport = () => {
    setPage(1);
    loadAttendance();
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
      const blob = await masterAdminService.exportAttendance(
        reportType,
        dateParams.date,
        dateParams.month,
        dateParams.year,
        dateParams.startDate,
        dateParams.endDate,
        departmentId || undefined,
        employeeId || undefined
      );

      // Avoid silently generating an empty file
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

    setDeleteLoading(true);
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
      setDeleteLoading(false);
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

  const handleDepartmentChange = (newDepartmentId: string) => {
    setDepartmentId(newDepartmentId);
    setEmployeeId('');
    setStaffSearch('');
    setPage(1);
    // Clear previous report data until View Report is clicked
    setAttendance([]);
    setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
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
          <label htmlFor="department">Department</label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            disabled={loading}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
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
            onClick={handleDownload}
            disabled={exporting || loading}
            className="export-button download-button"
          >
            {exporting ? 'Preparing Download...' : 'Download Report'}
          </button>

          <DeletedStaffAttendance
            service={masterAdminService}
            onError={(message) => setError(message)}
            onSuccess={(message) => setSuccessMessage(message)}
            onModeChange={(mode) => {
              setNormalReportMode(mode === 'normal');
              if (mode === 'normal') {
                loadAttendance();
              }
            }}
          />
        </div>
      </div>

      {/* Attendance Table */}
      {normalReportMode && (loading ? (
        <div className="loading-state">Loading attendance report...</div>
      ) : attendance.length === 0 ? (
        <div className="empty-state">
          {departmentId
            ? 'No attendance records found for the selected department and period.'
            : 'No attendance records found for the selected period.'}
        </div>
      ) : (
        <>
          <div className="attendance-selection-controls attendance-action-group">
            <button
              onClick={handleSelectAll}
              disabled={loading || deleteLoading}
              className="export-button"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={loading || deleteLoading}
              className="export-button"
            >
              Deselect All
            </button>
            <span className="selected-records-info">
              Selected Records: {selectedIds.size}
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || loading || deleteLoading}
              className="export-button download-button"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Selected Records'}
            </button>
          </div>
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
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
                {attendance.map((record, index) => (
                  <tr key={`${record.employeeId}-${record.attendanceDate}-${index}`} className={record.isDeleted ? 'deleted-attendance-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelected(record.id)}
                        disabled={deleteLoading}
                      />
                    </td>
                    <td>{record.employeeId}</td>
                    <td>{record.employeeName}</td>
                    <td>{departmentNameMap.get(record.departmentId) || '--'}</td>
                    <td>{record.attendanceDate}</td>
                    <td
                      onDoubleClick={() => handleTimeDoubleClick(record, 'clockIn')}
                      className={canEdit && !record.isDeleted ? 'editable-time-cell' : ''}
                      title={
                        canEdit && !record.isDeleted
                          ? 'Double-click to edit'
                          : undefined
                      }
                    >
                      {editingCell?.id === record.id &&
                      editingCell?.field === 'clockIn' ? (
                        <div className="time-edit-controls">
                          <input
                            type="time"
                            value={editingCell.value}
                            onChange={(e) =>
                              setEditingCell({
                                ...editingCell,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleTimeSave(record, 'clockIn');
                              if (e.key === 'Escape') handleTimeCancel();
                            }}
                            autoFocus
                          />
                          <button
                            className="time-save-btn"
                            onClick={() => handleTimeSave(record, 'clockIn')}
                          >
                            Save
                          </button>
                          <button
                            className="time-cancel-btn"
                            onClick={handleTimeCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        formatTimeOnly(record.clockInTime)
                      )}
                    </td>
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
                    <td
                      onDoubleClick={() => handleTimeDoubleClick(record, 'clockOut')}
                      className={canEdit && !record.isDeleted ? 'editable-time-cell' : ''}
                      title={
                        canEdit && !record.isDeleted
                          ? 'Double-click to edit'
                          : undefined
                      }
                    >
                      {editingCell?.id === record.id &&
                      editingCell?.field === 'clockOut' ? (
                        <div className="time-edit-controls">
                          <input
                            type="time"
                            value={editingCell.value}
                            onChange={(e) =>
                              setEditingCell({
                                ...editingCell,
                                value: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter')
                                handleTimeSave(record, 'clockOut');
                              if (e.key === 'Escape') handleTimeCancel();
                            }}
                            autoFocus
                          />
                          <button
                            className="time-save-btn"
                            onClick={() => handleTimeSave(record, 'clockOut')}
                          >
                            Save
                          </button>
                          <button
                            className="time-cancel-btn"
                            onClick={handleTimeCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        formatTimeOnly(record.clockOutTime)
                      )}
                    </td>
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
      ))}

    </div>
  );
};

export default MasterAdminAttendance;
