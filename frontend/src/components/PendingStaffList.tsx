import { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';

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

interface PendingStaffListProps {
  onSuccess: () => void;
}

const PendingStaffList = ({ onSuccess }: PendingStaffListProps) => {
  const [pendingStaff, setPendingStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');

  const loadPendingStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getPendingStaff();
      
      if (response.success && response.data) {
        setPendingStaff(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pending staff');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPendingStaff = () => {
    const query = pendingSearch.trim().toLowerCase();
    if (!query) return pendingStaff;

    return pendingStaff.filter((member) => {
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
    loadPendingStaff();
  }, []);

  const handleApprove = async (staffId: string) => {
    try {
      setProcessingId(staffId);
      setError(null);
      setSuccess(null);

      const response = await adminService.approveStaff(staffId);

      if (response.success) {
        setSuccess('Staff member approved successfully');
        await loadPendingStaff();
        onSuccess();
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

      const response = await adminService.rejectStaff(staffId);

      if (response.success) {
        setSuccess('Staff member rejected successfully');
        await loadPendingStaff();
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject staff');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="pending-staff-list">
      <h3>Pending Staff</h3>

      <input
        type="text"
        value={pendingSearch}
        onChange={(e) => setPendingSearch(e.target.value)}
        placeholder="Search by employee ID, name, or email"
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
            const filtered = getFilteredPendingStaff();
            return filtered.length === 0 ? (
              <div className="empty-state">No pending staff found.</div>
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
                      <th>Actions</th>
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
                          <span className="status-badge status-pending">
                            {staffMember.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleApprove(staffMember.id)}
                              disabled={processingId === staffMember.id}
                              className="approve-button"
                            >
                              {processingId === staffMember.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(staffMember.id)}
                              disabled={processingId === staffMember.id}
                              className="reject-button"
                            >
                              {processingId === staffMember.id ? 'Processing...' : 'Reject'}
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
  );
};

export default PendingStaffList;