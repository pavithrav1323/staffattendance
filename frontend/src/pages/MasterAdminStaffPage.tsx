import { useState, useEffect } from 'react';
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
  isActive: boolean;
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

  const [selectedStaff, setSelectedStaff] = useState<ApprovedStaff | null>(null);
  const [deleteModeActive, setDeleteModeActive] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);

  const [editingStaff, setEditingStaff] = useState<ApprovedStaff | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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
      }
    } catch (err: any) {
      console.error('Failed to load approved staff:', err);
    } finally {
      setApprovedLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await masterAdminService.getDepartments();

      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load departments:', err);
    }
  };

  useEffect(() => {
    loadPendingStaff();
    loadApprovedStaff();
    loadDepartments();
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

  const handleToggleStaff = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleSelectAll = () => {
    const filtered = getFilteredApprovedStaff().map((staff) => staff.id);
    setSelectedStaffIds(filtered);
  };

  const handleDeselectAll = () => {
    setSelectedStaffIds([]);
  };

  const handleDeleteSelectedStaff = () => {
    setDeleteModeActive(true);
  };

  const handleCancelDeleteMode = () => {
    setDeleteModeActive(false);
    setSelectedStaffIds([]);
    setShowBulkConfirm(false);
  };

  const handleShowBulkConfirm = () => {
    if (selectedStaffIds.length === 0) return;
    setShowBulkConfirm(true);
  };

  const handleCancelBulkDelete = () => {
    setShowBulkConfirm(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStaffIds.length === 0) return;

    setIsBulkDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await masterAdminService.deleteStaff(selectedStaffIds);

      if (response.success) {
        setSuccess('Selected staff members were permanently deleted successfully.');
        setSelectedStaffIds([]);
        setDeleteModeActive(false);
        setShowBulkConfirm(false);
        await loadApprovedStaff();
        await loadDepartments();
      } else {
        setError(response.message || 'Failed to delete selected staff');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete selected staff');
    } finally {
      setIsBulkDeleting(false);
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

  const handleOpenEditStaff = (staff: ApprovedStaff) => {
    setEditingStaff(staff);
    setEditEmployeeId(staff.employeeId);
    setEditName(staff.name);
    setEditPhone(staff.phone || '');
    setEditDesignation(staff.designation || '');
    setEditError(null);
  };

  const closeEditModal = () => {
    setEditingStaff(null);
    setEditEmployeeId('');
    setEditName('');
    setEditPhone('');
    setEditDesignation('');
    setEditError(null);
    setEditLoading(false);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setEditLoading(true);
    setEditError(null);
    setError(null);
    setSuccess(null);

    try {
      const response = await masterAdminService.updateStaff(editingStaff.id, {
        employeeId: editEmployeeId.trim(),
        name: editName.trim(),
        phone: editPhone.trim(),
        designation: editDesignation.trim(),
      });

      if (response.success) {
        setSuccess('Staff updated successfully');
        closeEditModal();
        await loadApprovedStaff();
      } else {
        const message = response.message || 'Failed to update staff';
        setEditError(
          message.toLowerCase().includes('employee id already exists')
            ? 'Employee ID already exists for this company.'
            : message
        );
      }
    } catch (err: any) {
      const message = err.message || 'Failed to update staff';
      setEditError(
        message.toLowerCase().includes('employee id already exists')
          ? 'Employee ID already exists for this company.'
          : message
      );
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="admin-staff-management staff-management-content">
        <div className="pending-staff-list">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee ID, name, or email"
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
                          <th>Employee ID</th>
                          <th>Name</th>
                          <th>Email</th>
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
              placeholder="Search by Employee ID, name, email, or department"
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

          <div className="bulk-delete-controls" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            {!deleteModeActive ? (
              <button
                onClick={handleDeleteSelectedStaff}
                className="reject-button"
                type="button"
              >
                Delete Selected Staff
              </button>
            ) : (
              <div
                className="bulk-delete-actions"
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
              >
                <button
                  onClick={handleSelectAll}
                  className="action-btn"
                  type="button"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="action-btn"
                  type="button"
                >
                  Deselect All
                </button>
                <span>Selected Staff: {selectedStaffIds.length}</span>
                <button
                  onClick={handleShowBulkConfirm}
                  disabled={selectedStaffIds.length === 0 || isBulkDeleting}
                  className="reject-button"
                  type="button"
                >
                  Delete Selected
                </button>
                <button
                  onClick={handleCancelDeleteMode}
                  className="approve-button"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )}

            {showBulkConfirm && (
              <div className="delete-confirm-modal" style={{ marginTop: '1rem' }}>
                <h3>Confirm Delete</h3>
                <p>
                  Are you sure you want to permanently delete the selected staff members?
                </p>
                <p>
                  <strong>Selected Staff:</strong> {selectedStaffIds.length}
                </p>
                <p>This action cannot be undone.</p>
                <div className="action-buttons">
                  <button
                    onClick={handleConfirmBulkDelete}
                    disabled={isBulkDeleting}
                    className="reject-button"
                    type="button"
                  >
                    {isBulkDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={handleCancelBulkDelete}
                    disabled={isBulkDeleting}
                    className="approve-button"
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                        {deleteModeActive && <th></th>}
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Email</th>
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
                          {deleteModeActive && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedStaffIds.includes(staff.id)}
                                onChange={() => handleToggleStaff(staff.id)}
                              />
                            </td>
                          )}
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
                              <button
                                onClick={() => handleOpenEditStaff(staff)}
                                className="action-btn"
                                type="button"
                              >
                                Edit
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

        {editingStaff && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Staff</h3>
              <p className="modal-subtitle">
                Staff: <strong>{editingStaff.name}</strong>
              </p>

              <form onSubmit={handleEditStaff}>
                <div className="form-group">
                  <label htmlFor="editEmployeeId">Employee ID</label>
                  <input
                    id="editEmployeeId"
                    type="text"
                    value={editEmployeeId}
                    onChange={(e) => {
                      setEditEmployeeId(e.target.value);
                      setEditError(null);
                    }}
                    placeholder="Enter employee ID"
                    className="staff-search-input"
                    required
                  />
                </div>

                {editError && (
                  <div className="error-message" role="alert">
                    {editError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="editName">Name</label>
                  <input
                    id="editName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                    className="staff-search-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editPhone">Phone</label>
                  <input
                    id="editPhone"
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone"
                    className="staff-search-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="editDesignation">Designation</label>
                  <input
                    id="editDesignation"
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="Enter designation"
                    className="staff-search-input"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="reject-button"
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="approve-button"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
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