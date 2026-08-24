import { useState, useEffect } from 'react';
import { masterAdminService } from '../services/master-admin.service';

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
                            <span className="status-badge status-approved">
                              {staff.status}
                            </span>
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
      </div>
    </div>
  );
};

export default MasterAdminStaffPage;