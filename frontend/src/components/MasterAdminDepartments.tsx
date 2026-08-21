import { useState } from 'react';
import { masterAdminService } from '../services/master-admin.service';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface MasterAdminDepartmentsProps {
  departments: Department[];
  onSuccess: () => void;
}

const MasterAdminDepartments = ({ departments, onSuccess }: MasterAdminDepartmentsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this department?')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await masterAdminService.deleteDepartment(id);
      setSuccess('Department deleted successfully');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="master-admin-departments">
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

      {departments.length === 0 ? (
        <div className="empty-state">No departments found.</div>
      ) : (
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id}>
                  <td>{dept.name}</td>
                  <td>{dept.code}</td>
                  <td>
                    <span className={`status-badge ${dept.isActive ? 'status-approved' : 'status-rejected'}`}>
                      {dept.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      disabled={loading}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MasterAdminDepartments;
