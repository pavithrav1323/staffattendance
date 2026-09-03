import { useState } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import { authService } from '../services/auth.service';
import CountryCodePicker, { type Country, countries } from '../components/CountryCodePicker';
import { validateEmail, validatePhone, validatePassword, validateName, validateEmployeeId, getPhoneMaxLength, getPhoneValidationError } from '../utils/validation';

interface Admin {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string;
  designation: string | null;
  status: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface MasterAdminAdminsProps {
  admins: Admin[];
  departments: Department[];
  onSuccess: () => void;
  onDepartmentCreated: () => void;
}

const MasterAdminAdmins = ({ admins, departments, onSuccess, onDepartmentCreated }: MasterAdminAdminsProps) => {
  const currentUser = authService.getCurrentUser();

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'MY') || countries[0]);
  const [password, setPassword] = useState('');
  const [designation, setDesignation] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Inline validation errors
  const [employeeIdError, setEmployeeIdError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deptNameError, setDeptNameError] = useState('');
  const [deptCodeError, setDeptCodeError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate Employee ID
    const trimmedEmployeeId = employeeId.trim();
    if (!trimmedEmployeeId) {
      setEmployeeIdError('Admin ID is required');
      isValid = false;
    } else if (!validateEmployeeId(trimmedEmployeeId)) {
      setEmployeeIdError('Enter a valid Admin ID');
      isValid = false;
    } else {
      setEmployeeIdError('');
    }

    // Validate Name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required');
      isValid = false;
    } else if (!validateName(trimmedName)) {
      setNameError('Enter a valid name');
      isValid = false;
    } else {
      setNameError('');
    }

    // Validate Email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validate Phone (optional)
    if (phone && !validatePhone(phone, selectedCountry.code)) {
      setPhoneError(getPhoneValidationError(selectedCountry.code, selectedCountry.name));
      isValid = false;
    } else {
      setPhoneError('');
    }

    // Validate Password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must contain at least 7 characters with uppercase, lowercase, number and special character.');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Validate Department Name
    const trimmedDeptName = newDeptName.trim();
    if (!trimmedDeptName) {
      setDeptNameError('Department name is required');
      isValid = false;
    } else if (trimmedDeptName.length < 2) {
      setDeptNameError('Department name must be at least 2 characters');
      isValid = false;
    } else {
      setDeptNameError('');
    }

    // Validate Department Code
    const trimmedDeptCode = newDeptCode.trim();
    if (!trimmedDeptCode) {
      setDeptCodeError('Department code is required');
      isValid = false;
    } else {
      setDeptCodeError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    const trimmedDeptName = newDeptName.trim();
    const trimmedDeptCode = newDeptCode.trim();

    const trimmedEmployeeId = employeeId.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneDigits = phone.replace(/\D/g, '');
    const trimmedPassword = password;
    const trimmedDesignation = designation.trim();

    const fullPhone = phone ? `${selectedCountry.dialCode}${trimmedPhoneDigits}` : undefined;

    try {
      setLoading(true);

      // Try to create the department first
      let deptId: string | undefined;
      try {
        const deptResponse = await masterAdminService.createDepartment(trimmedDeptName, trimmedDeptCode);
        if (deptResponse.success && deptResponse.data?.id) {
          deptId = deptResponse.data.id;
          onDepartmentCreated();
        }
      } catch (deptErr: any) {
        // If department already exists, try to find it
        if (deptErr.message?.includes('already exists') || deptErr.message?.includes('409')) {
          const existingDept = departments.find(d =>
            d.code.toLowerCase() === trimmedDeptCode.toLowerCase() &&
            d.isActive
          );
          if (existingDept) {
            deptId = existingDept.id;
          } else {
            // Department exists but not in our list, reload and try again
            onDepartmentCreated();
            throw deptErr;
          }
        } else {
          throw deptErr;
        }
      }

      if (!deptId) {
        setError('Failed to create or find department');
        return;
      }

      const response = await masterAdminService.createAdmin({
        employeeId: trimmedEmployeeId,
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        phone: fullPhone,
        password: trimmedPassword,
        departmentId: deptId,
        designation: trimmedDesignation || undefined,
      });

      if (response.success) {
        setSuccess('Admin created successfully');
        setEmployeeId('');
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        setDesignation('');
        setNewDeptName('');
        setNewDeptCode('');
        setEmployeeIdError('');
        setNameError('');
        setEmailError('');
        setPhoneError('');
        setPasswordError('');
        setDeptNameError('');
        setDeptCodeError('');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return '--';
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : '--';
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this Admin?')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await masterAdminService.deleteAdmin(id);
      setSuccess('Admin deleted successfully');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete admin');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await masterAdminService.activateAdmin(id);
      setSuccess('Admin activated successfully');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to activate admin');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await masterAdminService.deactivateAdmin(id);
      setSuccess('Admin deactivated successfully');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate admin');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditPhone(admin.phone || '');
    setEditDesignation(admin.designation || '');
  };

  const closeEditModal = () => {
    setEditingAdmin(null);
    setEditName('');
    setEditPhone('');
    setEditDesignation('');
    setEditLoading(false);
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setEditLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await masterAdminService.updateAdmin(editingAdmin.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        designation: editDesignation.trim(),
      });

      if (response.success) {
        setSuccess('Admin updated successfully');
        closeEditModal();
        onSuccess();
      } else {
        setError(response.message || 'Failed to update admin');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update admin');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const max = getPhoneMaxLength(selectedCountry.code);
    setPhone(digits.slice(0, max));
    setPhoneError('');
  };

  const handleEmployeeIdChange = (value: string) => {
    setEmployeeId(value);
    if (value.trim() && validateEmployeeId(value.trim())) {
      setEmployeeIdError('');
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim() && validateName(value.trim())) {
      setNameError('');
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim() && validateEmail(value.trim())) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value && validatePassword(value)) {
      setPasswordError('');
    }
  };

  return (
    <div className="master-admin-admins">
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

      <form onSubmit={handleSubmit} className="add-form">
        <div className="form-group">
          <label htmlFor="adminCompanyCode">ILKKM ID</label>
          <input
            type="text"
            id="adminCompanyCode"
            value={currentUser?.companyCode || ''}
            disabled
            readOnly
          />
        </div>

        <div className="form-group">
          <label htmlFor="adminCompanyName">ILKKM Name</label>
          <input
            type="text"
            id="adminCompanyName"
            value={currentUser?.companyName || ''}
            disabled
            readOnly
          />
        </div>

        <div className="form-group">
          <label htmlFor="adminEmail">ILKKM Email</label>
          <input
            type="email"
            id="adminEmail"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={loading}
            placeholder="Enter ILKKM email"
            required
          />
          {emailError && <div className="field-error">{emailError}</div>}
        </div>

        <div className="form-group phone-form-group">
          <label htmlFor="adminPhone">Phone</label>
          <div className="phone-input-group">
            <CountryCodePicker
              selectedCountry={selectedCountry}
              onSelect={(country) => {
                setSelectedCountry(country);
                setPhone((prev) => {
                  const digits = prev.replace(/\D/g, '');
                  const max = getPhoneMaxLength(country.code);
                  return digits.slice(0, max);
                });
                setPhoneError('');
              }}
            />
            <input
              type="tel"
              id="adminPhone"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={loading}
              placeholder="Phone number (optional)"
              className="phone-number-input"
              maxLength={getPhoneMaxLength(selectedCountry.code)}
            />
          </div>
          {phoneError && <div className="field-error">{phoneError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="adminPassword">Password</label>
          <input
            type="text"
            id="adminPassword"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            disabled={loading}
            placeholder="Enter password"
            required
          />
          {passwordError && <div className="field-error">{passwordError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="adminEmployeeId">Admin ID</label>
          <input
            type="text"
            id="adminEmployeeId"
            value={employeeId}
            onChange={(e) => handleEmployeeIdChange(e.target.value)}
            disabled={loading}
            placeholder="Enter Admin ID"
            required
          />
          {employeeIdError && <div className="field-error">{employeeIdError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="adminName">Admin Name</label>
          <input
            type="text"
            id="adminName"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={loading}
            placeholder="Enter Admin Name"
            required
          />
          {nameError && <div className="field-error">{nameError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="adminDesignation">Designation</label>
          <input
            type="text"
            id="adminDesignation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            disabled={loading}
            placeholder="Enter designation (optional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="newDeptName">Department Name</label>
          <input
            type="text"
            id="newDeptName"
            value={newDeptName}
            onChange={(e) => {
              setNewDeptName(e.target.value);
              if (e.target.value.trim().length >= 2) setDeptNameError('');
            }}
            disabled={loading}
            placeholder="Enter department name"
            required
          />
          {deptNameError && <div className="field-error">{deptNameError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="newDeptCode">Department Code</label>
          <input
            type="text"
            id="newDeptCode"
            value={newDeptCode}
            onChange={(e) => {
              setNewDeptCode(e.target.value);
              if (e.target.value.trim()) setDeptCodeError('');
            }}
            disabled={loading}
            placeholder="Enter department code"
            required
          />
          {deptCodeError && <div className="field-error">{deptCodeError}</div>}
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Add Admin'}
        </button>
      </form>

      {admins.length === 0 ? (
        <div className="empty-state">No admins found.</div>
      ) : (
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Admin Name</th>
                <th>ILKKM Email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.employeeId}</td>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{admin.phone || '--'}</td>
                  <td>{getDepartmentName(admin.departmentId)}</td>
                  <td>{admin.designation || '--'}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(admin.status)}`}>
                      {getStatusDisplay(admin.status)}
                    </span>
                  </td>
                  <td className="staff-actions-column">
                    <div className="staff-actions">
                      {(admin.status === 'DISABLED' || admin.status === 'DEACTIVATED') ? (
                        <button
                          onClick={() => handleActivate(admin.id)}
                          disabled={loading}
                          className="action-button activate-button"
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivate(admin.id)}
                          disabled={loading}
                          className="action-button deactivate-button"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditAdmin(admin)}
                        disabled={editLoading}
                        className="action-button"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        disabled={loading}
                        className="action-button delete-button"
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

      {editingAdmin && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Admin</h3>
            <p className="modal-subtitle">
              Admin: <strong>{editingAdmin.name}</strong>
              <br />
              Admin ID: <strong>{editingAdmin.employeeId}</strong>
            </p>

            <form onSubmit={handleEditAdmin}>
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
  );
};

export default MasterAdminAdmins;