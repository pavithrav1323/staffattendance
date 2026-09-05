import { useState } from 'react';
import { type AttendanceRecord } from '../services/admin.service';

interface DeletedStaffMember {
  id: string;
  employeeId: string;
  name: string;
}

interface DeletedStaffAttendanceService {
  getDeletedStaff: () => Promise<{ success: boolean; data?: DeletedStaffMember[] }>;
  getDeletedStaffAttendance: (employeeId: string) => Promise<{ success: boolean; data?: { staff: DeletedStaffMember; records: AttendanceRecord[] } }>;
  deleteDeletedStaffAttendance: (employeeId: string) => Promise<{ success: boolean; message: string }>;
}

interface DeletedStaffAttendanceProps {
  service: DeletedStaffAttendanceService;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  onModeChange?: (mode: 'normal' | 'deleted') => void;
}

const DeletedStaffAttendance = ({ service, onError, onSuccess, onModeChange }: DeletedStaffAttendanceProps) => {
  const [deletedStaffMode, setDeletedStaffMode] = useState(false);
  const [deletedStaffList, setDeletedStaffList] = useState<DeletedStaffMember[]>([]);
  const [selectedDeletedStaffId, setSelectedDeletedStaffId] = useState('');
  const [deletedStaffRecords, setDeletedStaffRecords] = useState<AttendanceRecord[]>([]);
  const [loadingDeletedStaff, setLoadingDeletedStaff] = useState(false);
  const [loadingDeletedRecords, setLoadingDeletedRecords] = useState(false);
  const [deletingRecords, setDeletingRecords] = useState(false);

  const formatTimeOnly = (dateString: string | null): string => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleViewDeletedStaffRecords = async () => {
    if (deletedStaffMode) {
      setDeletedStaffMode(false);
      setSelectedDeletedStaffId('');
      setDeletedStaffRecords([]);
      onModeChange?.('normal');
      return;
    }

    setLoadingDeletedStaff(true);

    try {
      const response = await service.getDeletedStaff();
      if (response.success && response.data) {
        setDeletedStaffList(response.data);
        setDeletedStaffMode(true);
        onModeChange?.('deleted');
      }
    } catch (err: any) {
      if (onError) onError(err.message || 'Failed to load deleted staff list');
    } finally {
      setLoadingDeletedStaff(false);
    }
  };

  const handleSelectDeletedStaff = async (employeeId: string) => {
    setSelectedDeletedStaffId(employeeId);
    setDeletedStaffRecords([]);

    if (!employeeId) {
      return;
    }

    setLoadingDeletedRecords(true);

    try {
      const response = await service.getDeletedStaffAttendance(employeeId);
      if (response.success && response.data) {
        setDeletedStaffRecords(response.data.records || []);
      }
    } catch (err: any) {
      if (onError) onError(err.message || 'Failed to load deleted staff attendance records');
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

    try {
      const response = await service.deleteDeletedStaffAttendance(selectedDeletedStaffId);
      if (response.success) {
        if (onSuccess) onSuccess(response.message || 'Deleted staff attendance records removed successfully');
        setDeletedStaffRecords([]);
        setSelectedDeletedStaffId('');
        const staffResponse = await service.getDeletedStaff();
        if (staffResponse.success && staffResponse.data) {
          setDeletedStaffList(staffResponse.data);
        }
      }
    } catch (err: any) {
      if (onError) onError(err.message || 'Failed to delete staff records');
    } finally {
      setDeletingRecords(false);
    }
  };

  return (
    <>
      <button
        onClick={handleViewDeletedStaffRecords}
        disabled={loadingDeletedStaff}
        className="export-button delete-deleted-records-button"
      >
        {loadingDeletedStaff ? 'Loading...' : deletedStaffMode ? 'Back to Normal Report' : 'View Deleted Staff Records'}
      </button>

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

      {deletedStaffMode && selectedDeletedStaffId && (
        <div className="attendance-table-wrapper">
          {loadingDeletedRecords ? (
            <div className="loading-state">Loading deleted staff attendance records...</div>
          ) : deletedStaffRecords.length === 0 ? (
            <div className="empty-state">No deleted attendance records found for the selected staff member.</div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Location</th>
                  <th>Attendance Method</th>
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
                      <span className={`method-badge method-${(record.clockInMethod || 'unknown').toLowerCase()}`}>
                        {record.clockInMethod || 'Not recorded'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-deleted-attendance">DELETED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
};

export default DeletedStaffAttendance;
