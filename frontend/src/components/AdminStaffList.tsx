import { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';
import { validatePassword } from '../utils/validation';

interface StaffRecord {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  status: string;
  createdAt: string;
}

interface AdminStaffListProps {
  refreshKey?: number;
}

const AdminStaffList = ({ refreshKey }: AdminStaffListProps) => {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getStaffList();
      
      if (response.success && response.data) {
        setStaff(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStaff = () => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) return staff;

    return staff.filter((member) => {
      const fields = [
        member.employeeId,
        member.name,
        member.email,
        member.phone,
      ];

      return fields.some((field) =>
        (field || '').toLowerCase().includes(query)
      );
    });
  };

  useEffect(() => {
    loadStaff();
  }, [refreshKey]);

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

  const handleActivate = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to activate ${name}?`)) return;

    try {
      setMessage(null);
      setError(null);
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: 'APPROVED' } : s))
      );
      await adminService.activateStaff(staffId);
      setMessage('Staff activated successfully');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to activate staff');
      loadStaff();
    }
  };

  const handleDeactivate = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;

    try {
      setMessage(null);
      setError(null);
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: 'DISABLED' } : s))
      );
      await adminService.deactivateStaff(staffId);
      setMessage('Staff deactivated successfully');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate staff');
      loadStaff();
    }
  };

  const handleDelete = async (staffId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${name}?`)) return;

    try {
      setMessage(null);
      setError(null);
      await adminService.deleteStaff(staffId);
      setMessage('Staff deleted successfully');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff');
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
      setResetError('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');
      return;
    }

    if (temporaryPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);

    try {
      await adminService.resetStaffPassword(selectedStaff.id, temporaryPassword);
      setResetSuccess('Temporary password created successfully. The Staff user can now log in using this temporary password and will be required to create a new password.');
      setTemporaryPassword('');
      setConfirmPassword('');
      loadStaff();
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetDevice = async (staffId: string, name: string) => {
    if (resettingStaffId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Session expired. Please login again.');
      return;
    }

    if (!window.confirm(`Allow ${name} to log in from another device? They will have 5 minutes to complete login on the new device.`)) return;

    setResettingStaffId(staffId);
    setMessage(null);
    setError(null);

    try {
      const response = await adminService.resetStaffDevice(staffId);
      if (response.success) {
        setMessage(`Device access allowed for 5 minutes for ${name}. They can now log in from a new device within this window.`);
      } else {
        setMessage(response.message || 'Device access allowed successfully');
      }
      loadStaff();
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
    <div className="admin-staff-list">
      <h3>Staff List</h3>

      <input
        type="text"
        value={staffSearch}
        onChange={(e) => setStaffSearch(e.target.value)}
        placeholder="Search by employee ID, name, or email"
        className="staff-search-input"
      />

      {message && (
        <div className="success-message">
          {message}
          <button onClick={() => { setMessage(null); }} className="close-button">×</button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} className="close-button">×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading staff list...</div>
      ) : staff.length === 0 ? (
        <div className="empty-state">No staff found.</div>
      ) : (
        <>
          {(() => {
            const filtered = getFilteredStaff();
            return filtered.length === 0 ? (
              <div className="empty-state">No staff found.</div>
            ) : (
              <div className="table-container">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th className="staff-actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((staffMember) => (
                      <tr key={staffMember.id}>
                        <td>{staffMember.employeeId}</td>
                        <td>{staffMember.name}</td>
                        <td>{staffMember.email}</td>
                        <td>{staffMember.phone || '--'}</td>
                        <td>{staffMember.designation || '--'}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(staffMember.status)}`}>
                            {getStatusDisplay(staffMember.status)}
                          </span>
                        </td>
                        <td className="staff-actions-column">
                          <div className="staff-actions">
                            {(staffMember.status === 'APPROVED' || staffMember.status === 'ACTIVE') && (
                              <button
                                onClick={() => handleDeactivate(staffMember.id, staffMember.name)}
                                className="action-btn action-btn-deactivate"
                                type="button"
                              >
                                Deactivate
                              </button>
                            )}
                            {(staffMember.status === 'DISABLED' || staffMember.status === 'DEACTIVATED') && (
                              <button
                                onClick={() => handleActivate(staffMember.id, staffMember.name)}
                                className="action-btn action-btn-activate"
                                type="button"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(staffMember.id, staffMember.name)}
                              className="action-btn action-btn-delete"
                              type="button"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setSelectedStaff(staffMember)}
                              className="action-btn action-btn-reset"
                              type="button"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleResetDevice(staffMember.id, staffMember.name)}
                              className="action-btn action-btn-reset"
                              type="button"
                              disabled={resettingStaffId === staffMember.id}
                            >
                              {resettingStaffId === staffMember.id ? 'Allowing...' : 'Allow From Another Device'}
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
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="success-message" style={{ marginBottom: '1rem' }}>
                {resetSuccess}
              </div>
            )}

            {!resetSuccess ? (
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="temporaryPassword">Temporary Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="temporaryPassword"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    disabled={resetLoading}
                    placeholder="Enter temporary password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Temporary Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={resetLoading}
                    placeholder="Confirm temporary password"
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  <label htmlFor="showPassword" style={{ margin: 0 }}>Show password</label>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="action-btn action-btn-cancel"
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-btn action-btn-confirm"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="action-btn action-btn-confirm"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffList;