import { useState, useEffect, useMemo } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import { validatePassword } from '../utils/validation';

interface PendingStaff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  departmentId: string;
  departmentName: string | null;
  departmentCode: string | null;
  status: string;
  createdAt: string;
}

interface ApprovedStaff {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  departmentId: string;
  departmentName: string | null;
  departmentCode: string | null;
  status: string;
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

const MasterAdminStaffPage = () => {
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const [approvedStaff, setApprovedStaff] = useState<ApprovedStaff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvedSearch, setApprovedSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const [deleteMode, setDeleteMode] = useState<
    'individual' | 'department' | 'dateRange' | 'company' | 'combined'
  >('individual');
  const [deleteDepartment, setDeleteDepartment] = useState('');
  const [deleteEmployee, setDeleteEmployee] = useState('');
  const [deleteStartDate, setDeleteStartDate] = useState('');
  const [deleteEndDate, setDeleteEndDate] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<
    {
      employeeId: string;
      employeeName: string;
      departmentName: string;
      attendanceCount: number;
      dateRange: string;
    }[]
  >([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<ApprovedStaff | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);

  const currentCompany = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        id: user?.companyId || '',
        name: user?.companyName || 'Current Company',
      };
    } catch {
      return { id: '', name: 'Current Company' };
    }
  }, []);

  const loadPendingStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await masterAdminService.getPendingStaff();
      
      if (response.success && response.data) {
        setPendingStaff(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pending staff');
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedStaff = async () => {
    try {
      setApprovedLoading(true);
      const response = await masterAdminService.getApprovedStaff();
      
      if (response.success && response.data) {
        setApprovedStaff(response.data);
        // Extract unique departments with readable names
        const deptMap = new Map<string, Department>();
        response.data.forEach(s => {
          if (s.departmentId && !deptMap.has(s.departmentId)) {
            deptMap.set(s.departmentId, {
              id: s.departmentId,
              name: s.departmentName || s.departmentCode || 'Unknown Department',
              code: s.departmentCode || '',
            });
          }
        });
        setDepartments(Array.from(deptMap.values()));
      }
    } catch (err: any) {
      console.error('Failed to load approved staff:', err);
    } finally {
      setApprovedLoading(false);
    }
  };

  useEffect(() => {
    loadPendingStaff();
    loadApprovedStaff();
  }, []);

  const getFilteredStaff = () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pendingStaff;

    return pendingStaff.filter((staff) => {
      const fields = [
        staff.employeeId,
        staff.name,
        staff.email,
        staff.phone,
      ];

      return fields.some((field) =>
        (field || '').toLowerCase().includes(query)
      );
    });
  };

  const getDepartmentDisplay = (staff: { departmentName: string | null; departmentCode: string | null }): string => {
    if (staff.departmentName && staff.departmentCode) {
      return `${staff.departmentCode} - ${staff.departmentName}`;
    }
    return staff.departmentName || staff.departmentCode || 'Unknown Department';
  };

  const getFilteredApprovedStaff = () => {
    let filtered = approvedStaff;
    
    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(staff => staff.departmentId === selectedDepartment);
    }
    
    // Filter by search
    const query = approvedSearch.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((staff) => {
        const fields = [
          staff.employeeId,
          staff.name,
          staff.email,
          staff.departmentName,
          staff.departmentCode,
        ];

        return fields.some((field) =>
          (field || '').toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  const handleApprove = async (staffId: string) => {
    try {
      setProcessingId(staffId);
      setError(null);
      setSuccess(null);

      const response = await masterAdminService.approveStaff(staffId);

      if (response.success) {
        setSuccess('Staff registration approved successfully');
        await loadPendingStaff();
        await loadApprovedStaff();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve staff');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (staffId: string) => {
    try {
      setProcessingId(staffId);
      setError(null);
      setSuccess(null);

      const response = await masterAdminService.rejectStaff(staffId);

      if (response.success) {
        setSuccess('Staff registration rejected');
        await loadPendingStaff();
        await loadApprovedStaff();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject staff');
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to activate ${name}?`)) return;

    try {
      setProcessingId(staffId);
      setError(null);
      setSuccess(null);
      setApprovedStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: 'APPROVED' } : s))
      );
      const response = await masterAdminService.activateStaff(staffId);
      if (response.success) {
        setSuccess('Staff activated successfully');
        loadApprovedStaff();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate staff');
      loadApprovedStaff();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivate = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;

    try {
      setProcessingId(staffId);
      setError(null);
      setSuccess(null);
      setApprovedStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: 'DISABLED' } : s))
      );
      const response = await masterAdminService.deactivateStaff(staffId);
      if (response.success) {
        setSuccess('Staff deactivated successfully');
        loadApprovedStaff();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate staff');
      loadApprovedStaff();
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusDisplay = (status: string): string => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
        return 'ACTIVE';
      case 'DISABLED':
      case 'DEACTIVATED':
        return 'DEACTIVATED';
      case 'PENDING':
        return 'PENDING';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'APPROVED':
      case 'ACTIVE':
        return 'status-approved';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      case 'DISABLED':
      case 'DEACTIVATED':
        return 'status-disabled';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const validateDeleteFilters = (): boolean => {
    if (!currentCompany.id) {
      setDeleteError('Company context not available');
      return false;
    }

    if (deleteMode === 'individual' && !deleteEmployee) {
      setDeleteError('Please select a staff member');
      return false;
    }

    if (deleteMode === 'department' && !deleteDepartment) {
      setDeleteError('Please select a department');
      return false;
    }

    if (
      (deleteMode === 'dateRange' || deleteMode === 'combined') &&
      (!deleteStartDate || !deleteEndDate)
    ) {
      setDeleteError('Please select both start and end dates');
      return false;
    }

    if (
      deleteStartDate &&
      deleteEndDate &&
      deleteEndDate < deleteStartDate
    ) {
      setDeleteError('End date cannot be earlier than start date');
      return false;
    }

    return true;
  };

  const handleViewRecords = async () => {
    if (!validateDeleteFilters()) return;

    setPreviewLoading(true);
    setDeleteError(null);
    setDeleteSuccess(null);
    setShowPreview(false);
    setShowConfirm(false);

    try {
      const response = await masterAdminService.previewStaffData(
        currentCompany.id,
        {
          departmentId: deleteDepartment || undefined,
          employeeId: deleteEmployee || undefined,
          dateStart: deleteStartDate || undefined,
          dateEnd: deleteEndDate || undefined,
        }
      );

      if (response.success && response.data) {
        setPreviewRecords(response.data.records);
        setPreviewTotal(response.data.total);
        setShowPreview(true);
      } else {
        setDeleteError(response.message || 'Failed to load preview');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleShowConfirm = () => {
    setShowConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  const handleDeleteStaffData = async () => {
    if (!currentCompany.id) {
      setDeleteError('Company context not available');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const payload: any = { companyId: currentCompany.id };

      if (deleteMode === 'individual') {
        payload.employeeId = deleteEmployee;
      } else if (deleteMode === 'department') {
        payload.departmentId = deleteDepartment;
      } else if (deleteMode === 'dateRange') {
        payload.dateStart = deleteStartDate;
        payload.dateEnd = deleteEndDate;
      } else if (deleteMode === 'combined') {
        payload.departmentId = deleteDepartment;
        payload.dateStart = deleteStartDate;
        payload.dateEnd = deleteEndDate;
      }

      const response = await masterAdminService.deleteStaffData(payload);

      if (response.success) {
        setDeleteSuccess(
          response.message || 'Staff records deleted successfully'
        );
        setDeleteEmployee('');
        setDeleteDepartment('');
        setDeleteStartDate('');
        setDeleteEndDate('');
        setShowPreview(false);
        setShowConfirm(false);
        setPreviewRecords([]);
        setPreviewTotal(0);
        await loadPendingStaff();
        await loadApprovedStaff();
      } else {
        setDeleteError(response.message || 'Failed to delete staff records');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete staff records');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!selectedStaff) return;

    if (!temporaryPassword) {
      setResetError('Temporary password is required');
      return;
    }

    if (!validatePassword(temporaryPassword)) {
      setResetError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      );
      return;
    }

    if (temporaryPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);

    try {
      await masterAdminService.resetStaffPassword(
        selectedStaff.id,
        temporaryPassword
      );
      setResetSuccess(
        'Temporary password created successfully. The staff user can now log in using this temporary password and will be required to create a new password.'
      );
      setTemporaryPassword('');
      setConfirmPassword('');
      await loadApprovedStaff();
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetDevice = async (staffId: string, name: string) => {
    if (resettingStaffId) return;

    if (
      !window.confirm(
        `Allow ${name} to log in from another device? They will have 5 minutes to complete login on the new device.`
      )
    )
      return;

    setResettingStaffId(staffId);
    setError(null);
    setSuccess(null);

    try {
      const response = await masterAdminService.resetStaffDevice(staffId);
      if (response.success) {
        setSuccess(
          `Device access allowed for 5 minutes for ${name}. They can now log in from a new device within this window.`
        );
      } else {
        setSuccess(response.message || 'Device access allowed successfully');
      }
      await loadApprovedStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to allow new device');
    } finally {
      setResettingStaffId(null);
    }
  };

  const closeResetModal = () => {
    setSelectedStaff(null);
    setTemporaryPassword('');
    setConfirmPassword('');
    setResetError(null);
    setResetSuccess(null);
  };

  return (
    <div className="page-content">
      <div className="admin-staff-management staff-management-content">
        <div className="pending-staff-list">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ILKKM ID, name, or email"
            className="staff-search-input"
          />

          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="close-button">×</button>
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess(null)} className="close-button">×</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state">Loading pending staff...</div>
          ) : pendingStaff.length === 0 ? (
            <div className="empty-state">No pending staff requests.</div>
          ) : (
            <>
              {(() => {
                const filtered = getFilteredStaff();
                return filtered.length === 0 ? (
                  <div className="empty-state">No pending staff found matching your search.</div>
                ) : (
                  <div className="table-container">
                    <table className="staff-table">
                      <thead>
                        <tr>
                          <th>ILKKM ID</th>
                          <th>ILKKM Name</th>
                          <th>ILKKM Email</th>
                          <th>Phone</th>
                          <th>Department</th>
                          <th>Designation</th>
                          <th>Registration Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((staff) => (
                          <tr key={staff.id}>
                            <td>{staff.employeeId}</td>
                            <td>{staff.name}</td>
                            <td>{staff.email}</td>
                            <td>{staff.phone || '--'}</td>
                            <td>{getDepartmentDisplay(staff)}</td>
                            <td>{staff.designation || '--'}</td>
                            <td>{formatDate(staff.createdAt)}</td>
                            <td>
                              <span className="status-badge status-pending">
                                {staff.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => handleApprove(staff.id)}
                                  disabled={processingId === staff.id}
                                  className="approve-button"
                                >
                                  {processingId === staff.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleReject(staff.id)}
                                  disabled={processingId === staff.id}
                                  className="reject-button"
                                >
                                  {processingId === staff.id ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className="approved-staff-list">
          <h3>Approved Staff List</h3>

          <div className="staff-filters">
            <input
              type="text"
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Search by ILKKM ID, name, email, or department"
              className="staff-search-input"
            />

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="department-filter"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code ? `${dept.code} - ${dept.name}` : dept.name}
                </option>
              ))}
            </select>
          </div>

          {approvedLoading ? (
            <div className="loading-state">Loading approved staff...</div>
          ) : approvedStaff.length === 0 ? (
            <div className="empty-state">No approved staff found.</div>
          ) : (
            (() => {
              const filtered = getFilteredApprovedStaff();
              return filtered.length === 0 ? (
                <div className="empty-state">No approved staff found matching your search.</div>
              ) : (
                <div className="table-container">
                  <table className="staff-table">
                    <thead>
                      <tr>
                        <th>ILKKM ID</th>
                        <th>ILKKM Name</th>
                        <th>ILKKM Email</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Designation</th>
                        <th>Approved Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((staff) => (
                        <tr key={staff.id}>
                          <td>{staff.employeeId}</td>
                          <td>{staff.name}</td>
                          <td>{staff.email}</td>
                          <td>{staff.phone || '--'}</td>
                          <td>{getDepartmentDisplay(staff)}</td>
                          <td>{staff.designation || '--'}</td>
                          <td>{formatDate(staff.createdAt)}</td>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(staff.status)}`}>
                              {getStatusDisplay(staff.status)}
                            </span>
                          </td>
                          <td>
                            <div className="staff-actions">
                              {(staff.status === 'APPROVED' || staff.status === 'ACTIVE') && (
                                <button
                                  onClick={() => handleDeactivate(staff.id, staff.name)}
                                  disabled={processingId === staff.id}
                                  className="action-btn action-btn-deactivate"
                                  type="button"
                                >
                                  {processingId === staff.id ? 'Processing...' : 'Deactivate'}
                                </button>
                              )}
                              {(staff.status === 'DISABLED' || staff.status === 'DEACTIVATED') && (
                                <button
                                  onClick={() => handleActivate(staff.id, staff.name)}
                                  disabled={processingId === staff.id}
                                  className="action-btn action-btn-activate"
                                  type="button"
                                >
                                  {processingId === staff.id ? 'Processing...' : 'Activate'}
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedStaff(staff)}
                                className="action-btn action-btn-reset"
                                type="button"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleResetDevice(staff.id, staff.name)}
                                className="action-btn action-btn-reset"
                                type="button"
                                disabled={resettingStaffId === staff.id}
                              >
                                {resettingStaffId === staff.id
                                  ? 'Allowing...'
                                  : 'Allow From Another Device'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>

        <div className="staff-data-delete">
          <h3>Staff Data Management</h3>

          {deleteError && (
            <div className="error-message">
              {deleteError}
              <button onClick={() => setDeleteError(null)} className="close-button">×</button>
            </div>
          )}

          {deleteSuccess && (
            <div className="success-message">
              {deleteSuccess}
              <button onClick={() => setDeleteSuccess(null)} className="close-button">×</button>
            </div>
          )}

          <div className="delete-filter-group">
            <label htmlFor="deleteMode">Delete Mode</label>
            <select
              id="deleteMode"
              value={deleteMode}
              onChange={(e) => {
                setDeleteMode(e.target.value as typeof deleteMode);
                setShowPreview(false);
                setShowConfirm(false);
              }}
              className="department-filter"
            >
              <option value="individual">Select Staff</option>
              <option value="department">Select Department</option>
              <option value="dateRange">Select Date Range</option>
              <option value="company">Select Company</option>
              <option value="combined">Company + Department + Date Range</option>
            </select>
          </div>

          <div className="delete-filter-group">
            <label htmlFor="deleteCompany">Company</label>
            <input
              id="deleteCompany"
              type="text"
              value={currentCompany.name}
              readOnly
              className="staff-search-input"
            />
          </div>

          {deleteMode === 'individual' && (
            <div className="delete-filter-group">
              <label htmlFor="deleteEmployee">Select Staff</label>
              <select
                id="deleteEmployee"
                value={deleteEmployee}
                onChange={(e) => {
                  setDeleteEmployee(e.target.value);
                  setShowPreview(false);
                  setShowConfirm(false);
                }}
                className="department-filter"
              >
                <option value="">Select Staff</option>
                {approvedStaff.map((staff) => (
                  <option key={staff.id} value={staff.employeeId}>
                    {staff.employeeId} - {staff.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(deleteMode === 'department' || deleteMode === 'combined') && (
            <div className="delete-filter-group">
              <label htmlFor="deleteDepartment">
                {deleteMode === 'combined'
                  ? 'Department (optional)'
                  : 'Department'}
              </label>
              <select
                id="deleteDepartment"
                value={deleteDepartment}
                onChange={(e) => {
                  setDeleteDepartment(e.target.value);
                  setShowPreview(false);
                  setShowConfirm(false);
                }}
                className="department-filter"
              >
                <option value="">
                  {deleteMode === 'combined'
                    ? 'All Departments'
                    : 'Select Department'}
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.code ? `${dept.code} - ${dept.name}` : dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(deleteMode === 'dateRange' || deleteMode === 'combined') && (
            <>
              <div className="delete-filter-group">
                <label htmlFor="deleteStartDate">Start Date</label>
                <input
                  id="deleteStartDate"
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => {
                    setDeleteStartDate(e.target.value);
                    setShowPreview(false);
                    setShowConfirm(false);
                  }}
                  className="staff-search-input"
                />
              </div>
              <div className="delete-filter-group">
                <label htmlFor="deleteEndDate">End Date</label>
                <input
                  id="deleteEndDate"
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => {
                    setDeleteEndDate(e.target.value);
                    setShowPreview(false);
                    setShowConfirm(false);
                  }}
                  className="staff-search-input"
                />
              </div>
            </>
          )}

          <button
            onClick={handleViewRecords}
            disabled={previewLoading || deleting}
            className="export-button"
          >
            {previewLoading ? 'Loading...' : 'View Records'}
          </button>

          {showPreview && (
            <>
              <div className="preview-summary">
                <h4>Preview</h4>
                <p>
                  <strong>Total Records Found:</strong> {previewTotal}
                </p>
              </div>

              {previewRecords.length > 0 && (
                <>
                  <div className="table-container">
                    <table className="staff-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Employee Name</th>
                          <th>Department</th>
                          <th>Attendance Count</th>
                          <th>Date Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRecords.map((record) => (
                          <tr key={record.employeeId}>
                            <td>{record.employeeId}</td>
                            <td>{record.employeeName}</td>
                            <td>{record.departmentName || '--'}</td>
                            <td>{record.attendanceCount}</td>
                            <td>{record.dateRange}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleShowConfirm}
                    disabled={deleting}
                    className="reject-button"
                  >
                    Delete Selected Staff Records
                  </button>
                </>
              )}
            </>
          )}

          {showConfirm && (
            <div className="delete-confirm-modal">
              <h3>Confirm Delete</h3>
              <p>
                Are you sure you want to permanently delete these staff records?
              </p>

              <div className="confirm-details">
                <p>
                  <strong>Company:</strong> {currentCompany.name}
                </p>
                <p>
                  <strong>Department:</strong>{' '}
                  {departments.find((d) => d.id === deleteDepartment)?.name || 'All'}
                </p>
                <p>
                  <strong>Staff:</strong>{' '}
                  {approvedStaff.find((s) => s.employeeId === deleteEmployee)?.name || 'All'}
                </p>
                <p>
                  <strong>Date Range:</strong>{' '}
                  {deleteStartDate && deleteEndDate
                    ? `${new Date(deleteStartDate).toLocaleDateString(
                        'en-GB'
                      )} to ${new Date(deleteEndDate).toLocaleDateString('en-GB')}`
                    : 'All dates'}
                </p>
                <p>
                  <strong>Records:</strong> {previewTotal}
                </p>
              </div>

              <div className="action-buttons">
                <button
                  onClick={handleDeleteStaffData}
                  disabled={deleting}
                  className="reject-button"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="approve-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedStaff && (
          <div className="modal-overlay" onClick={closeResetModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Reset Password</h3>
              <p className="modal-subtitle">
                Staff: <strong>{selectedStaff.name}</strong>
                <br />
                Employee ID: <strong>{selectedStaff.employeeId}</strong>
              </p>

              {resetError && (
                <div className="error-message">
                  {resetError}
                  <button onClick={() => setResetError(null)} className="close-button">×</button>
                </div>
              )}

              {resetSuccess && (
                <div className="success-message">
                  {resetSuccess}
                  <button onClick={() => setResetSuccess(null)} className="close-button">×</button>
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="temporaryPassword">Temporary Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="temporaryPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      placeholder="Enter temporary password"
                      className="staff-search-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="toggle-password"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Temporary Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm temporary password"
                    className="staff-search-input"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="reject-button"
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="approve-button"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterAdminStaffPage;