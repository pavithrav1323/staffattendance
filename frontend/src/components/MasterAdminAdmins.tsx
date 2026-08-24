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
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Inline validation errors
  const [employeeIdError, setEmployeeIdError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate Employee ID
    const trimmedEmployeeId = employeeId.trim();
    if (!trimmedEmployeeId) {
      setEmployeeIdError('Employee ID is required');
      isValid = false;
    } else if (!validateEmployeeId(trimmedEmployeeId)) {
      setEmployeeIdError('Enter a valid Employee ID');
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
      setPasswordError('Password must contain uppercase, lowercase, number, and special character');
      isValid = false;
    } else {
      setPasswordError('');
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

    if (!trimmedDeptName || trimmedDeptName.length < 2) {
      setError('Department name must be at least 2 characters');
      return;
    }
    if (!trimmedDeptCode) {
      setError('Department code is required');
      return;
    }

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
          if (deptId) {
            setDepartmentId(deptId);
          }
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
            setDepartmentId(existingDept.id);
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
        setDepartmentId('');
        setDesignation('');
        setNewDeptName('');
        setNewDeptCode('');
        setEmployeeIdError('');
        setNameError('');
        setEmailError('');
        setPhoneError('');
        setPasswordError('');
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentName = (deptId: string): string => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || '--';
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
          <label htmlFor="adminEmployeeId">ILKKM ID</label>
          <input
            type="text"
            id="adminEmployeeId"
            value={employeeId}
            onChange={(e) => handleEmployeeIdChange(e.target.value)}
            disabled={loading}
            placeholder="Enter ILKKM ID"
            required
          />
          {employeeIdError && <div className="field-error">{employeeIdError}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="adminName">ILKKM Name</label>
          <input
            type="text"
            id="adminName"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={loading}
            placeholder="Enter ILKKM name"
            required
          />
          {nameError && <div className="field-error">{nameError}</div>}
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
          <label htmlFor="newDeptName">Department Name</label>
          <input
            type="text"
            id="newDeptName"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            disabled={loading}
            placeholder="Enter department name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="newDeptCode">Department Code</label>
          <input
            type="text"
            id="newDeptCode"
            value={newDeptCode}
            onChange={(e) => setNewDeptCode(e.target.value)}
            disabled={loading}
            placeholder="Enter department code"
            required
          />
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

        <button type="submit" disabled={loading || !departmentId} className="submit-button">
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
                <th>ILKKM ID</th>
                <th>ILKKM Name</th>
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
                    <span className={`status-badge ${admin.status === 'APPROVED' ? 'status-approved' : admin.status === 'DISABLED' ? 'status-disabled' : 'status-pending'}`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className="staff-actions-column">
                    <div className="staff-actions">
                      {admin.status !== 'APPROVED' ? (
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
    </div>
  );
};

export default MasterAdminAdmins;