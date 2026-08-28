import { useEffect, useMemo, useState } from 'react';
import {
  programOwnerService,
  type Company,
  type CompanyDetails,
} from '../services/program-owner.service';

interface MessageState {
  error: string | null;
  success: string | null;
}

const ProgramOwnerCompaniesPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>({
    error: null,
    success: null,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(
    null
  );
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [confirmCompanyId, setConfirmCompanyId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setMessage({ error: null, success: null });
      const response = await programOwnerService.getCompanies();
      if (response.success && response.data) {
        setCompanies(response.data);
      }
    } catch (err: any) {
      setMessage({ error: err.message || 'Failed to load companies', success: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((company) => {
      const fields = [
        company.companyCode,
        company.companyName,
        company.adminName,
        company.adminEmail,
      ];
      return fields.some((field) =>
        (field || '').toLowerCase().includes(query)
      );
    });
  }, [companies, searchQuery]);

  const handleViewDetails = async (company: Company) => {
    setSelectedCompany(company);
    setCompanyDetails(null);
    setDeleteTarget(null);
    setConfirmCompanyId('');
    try {
      setDetailsLoading(true);
      const response = await programOwnerService.getCompanyDetails(company.id);
      if (response.success && response.data) {
        setCompanyDetails(response.data);
      }
    } catch (err: any) {
      setMessage({
        error: err.message || 'Failed to load company details',
        success: null,
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteClick = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(company);
    setSelectedCompany(null);
    setCompanyDetails(null);
    setConfirmCompanyId('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (confirmCompanyId.trim() !== deleteTarget.companyCode) {
      setMessage({
        error: 'Company ID does not match. Please type the exact company ID.',
        success: null,
      });
      return;
    }

    setDeleting(true);
    setMessage({ error: null, success: null });

    try {
      const response = await programOwnerService.deleteCompany(deleteTarget.id);
      if (response.success) {
        setMessage({
          error: null,
          success:
            response.message ||
            'Company and all associated records deleted successfully.',
        });
        setDeleteTarget(null);
        setConfirmCompanyId('');
        await loadCompanies();
      } else {
        setMessage({
          error: response.message || 'Failed to delete company',
          success: null,
        });
      }
    } catch (err: any) {
      setMessage({
        error: err.message || 'Failed to delete company',
        success: null,
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="page-content">
      <div className="program-owner-companies">
        {message.error && (
          <div className="error-message">
            {message.error}
            <button
              onClick={() => setMessage({ ...message, error: null })}
              className="close-button"
            >
              ×
            </button>
          </div>
        )}

        {message.success && (
          <div className="success-message">
            {message.success}
            <button
              onClick={() => setMessage({ ...message, success: null })}
              className="close-button"
            >
              ×
            </button>
          </div>
        )}

        <div className="companies-header">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company ID, name, admin, or email"
            className="staff-search-input"
          />
        </div>

        {loading ? (
          <div className="loading-state">Loading companies...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="empty-state">No companies found.</div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Company ID</th>
                  <th>Company Name</th>
                  <th>Admin Name</th>
                  <th>Admin Email</th>
                  <th>Master Admin Count</th>
                  <th>Staff Count</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => handleViewDetails(company)}
                    className="clickable-row"
                  >
                    <td>{company.companyCode}</td>
                    <td>{company.companyName}</td>
                    <td>{company.adminName || '--'}</td>
                    <td>{company.adminEmail || '--'}</td>
                    <td>{company.masterAdminCount}</td>
                    <td>{company.staffCount}</td>
                    <td>{formatDate(company.createdAt)}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          company.isActive ? 'status-approved' : 'status-disabled'
                        }`}
                      >
                        {company.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={(e) => handleDeleteClick(company, e)}
                          className="reject-button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteTarget && (
          <div className="company-delete-confirm">
            <h3>Delete Company</h3>
            <p className="warning-text">
              This action will permanently delete the company and all associated
              data. Type the Company ID below to confirm:
            </p>
            <p>
              <strong>Company Name:</strong> {deleteTarget.companyName}
            </p>
            <p className="confirm-target-name">
              <strong>Company ID:</strong> {deleteTarget.companyCode}
            </p>
            <input
              type="text"
              value={confirmCompanyId}
              onChange={(e) => setConfirmCompanyId(e.target.value)}
              placeholder="Type company ID"
              className="staff-search-input"
            />
            <div className="action-buttons">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting || confirmCompanyId.trim() !== deleteTarget.companyCode}
                className="reject-button"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setConfirmCompanyId('');
                }}
                className="approve-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {selectedCompany && (
          <div className="company-details">
            <h3>Company Details</h3>
            {detailsLoading ? (
              <div className="loading-state">Loading company details...</div>
            ) : companyDetails ? (
              <>
                <div className="details-section">
                  <h4>Company</h4>
                  <p>
                    <strong>Company ID:</strong>{' '}
                    {companyDetails.company.companyCode}
                  </p>
                  <p>
                    <strong>Name:</strong> {companyDetails.company.companyName}
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    {companyDetails.company.email || '--'}
                  </p>
                  <p>
                    <strong>Phone:</strong>{' '}
                    {companyDetails.company.phone || '--'}
                  </p>
                  <p>
                    <strong>Timezone:</strong>{' '}
                    {companyDetails.company.timezone}
                  </p>
                  <p>
                    <strong>Status:</strong> {companyDetails.status}
                  </p>
                  <p>
                    <strong>Created:</strong>{' '}
                    {formatDate(companyDetails.company.createdAt)}
                  </p>
                </div>

                {companyDetails.admin && (
                  <div className="details-section">
                    <h4>Admin</h4>
                    <p>
                      <strong>Name:</strong> {companyDetails.admin.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {companyDetails.admin.email}
                    </p>
                    <p>
                      <strong>Status:</strong> {companyDetails.admin.status}
                    </p>
                  </div>
                )}

                <div className="details-section">
                  <h4>Master Admins</h4>
                  {companyDetails.masterAdmins.length === 0 ? (
                    <p>No master admins found.</p>
                  ) : (
                    <ul className="details-list">
                      {companyDetails.masterAdmins.map((ma) => (
                        <li key={ma.id}>
                          {ma.name} ({ma.email}) - {ma.status}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="details-section">
                  <h4>Staff</h4>
                  <p>
                    <strong>Total Staff:</strong> {companyDetails.staffCount}
                  </p>
                </div>

                <div className="details-section">
                  <h4>Departments</h4>
                  {companyDetails.departments.length === 0 ? (
                    <p>No departments found.</p>
                  ) : (
                    <ul className="details-list">
                      {companyDetails.departments.map((dept) => (
                        <li key={dept.id}>
                          {dept.code ? `${dept.code} - ` : ''}
                          {dept.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramOwnerCompaniesPage;
