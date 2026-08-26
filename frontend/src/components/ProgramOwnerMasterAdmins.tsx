import { useState, useEffect } from 'react';
import { programOwnerService, type MasterAdmin } from '../services/program-owner.service';
import CountryCodePicker, { type Country, countries } from './CountryCodePicker';
import { validateEmail, validatePhone, validatePassword, validateName, validateEmployeeId, getPhoneMaxLength, getPhoneValidationError } from '../utils/validation';

const ProgramOwnerMasterAdmins = () => {
  const [masterAdmins, setMasterAdmins] = useState<MasterAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Inline validation errors
  const [employeeIdError, setEmployeeIdError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [companyCodeError, setCompanyCodeError] = useState('');
  const [companyNameError, setCompanyNameError] = useState('');

  const loadMasterAdmins = async () => {
    setLoading(true);
    try {
      const response = await programOwnerService.getMasterAdmins();
      if (response.success && response.data) {
        setMasterAdmins(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load master admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterAdmins();
  }, []);

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

    // Validate Phone
    if (!phone) {
      setPhoneError('Phone number is required');
      isValid = false;
    } else if (!validatePhone(phone, selectedCountry.code)) {
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

    // Validate ILKKM ID
    const trimmedCompanyCode = companyCode.trim();
    if (!trimmedCompanyCode) {
      setCompanyCodeError('ILKKM ID is required');
      isValid = false;
    } else {
      setCompanyCodeError('');
    }

    // Validate Company Name
    const trimmedCompanyName = companyName.trim();
    if (!trimmedCompanyName) {
      setCompanyNameError('Company Name is required');
      isValid = false;
    } else if (trimmedCompanyName.length < 2) {
      setCompanyNameError('Company Name must be at least 2 characters');
      isValid = false;
    } else {
      setCompanyNameError('');
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

    setProcessing(true);

    const trimmedEmployeeId = employeeId.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompanyCode = companyCode.trim();
    const trimmedCompanyName = companyName.trim();

    const fullPhone = `${selectedCountry.dialCode}${phone.replace(/\D/g, '')}`;

    try {
      await programOwnerService.createMasterAdmin({
        employeeId: trimmedEmployeeId,
        name: trimmedName,
        email: trimmedEmail.toLowerCase(),
        phone: fullPhone,
        password: password,
        companyCode: trimmedCompanyCode,
        companyName: trimmedCompanyName,
      });

      setSuccess('Master Admin created successfully');
      setEmployeeId('');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setCompanyCode('');
      setCompanyName('');
      setEmployeeIdError('');
      setNameError('');
      setEmailError('');
      setPhoneError('');
      setPasswordError('');
      setCompanyCodeError('');
      setCompanyNameError('');
      setShowForm(false);
      loadMasterAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to create Master Admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async (id: string) => {
    setError(null);
    setSuccess(null);
    setProcessing(true);

    try {
      await programOwnerService.activateMasterAdmin(id);
      setSuccess('Master Admin activated successfully');
      loadMasterAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to activate Master Admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    setError(null);
    setSuccess(null);
    setProcessing(true);

    try {
      await programOwnerService.deactivateMasterAdmin(id);
      setSuccess('Master Admin deactivated successfully');
      loadMasterAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate Master Admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Master Admin?')) {
      return;
    }

    setError(null);
    setSuccess(null);
    setProcessing(true);

    try {
      await programOwnerService.deleteMasterAdmin(id);
      setSuccess('Master Admin deleted successfully');
      loadMasterAdmins();
    } catch (err: any) {
      setError(err.message || 'Failed to delete Master Admin');
    } finally {
      setProcessing(false);
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

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="program-owner-master-admins">
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

      <div className="page-content">
        {!showForm && (
          <div className="section-header">
            <button
              onClick={() => setShowForm(true)}
              className="submit-button"
            >
              + Add Master Admin
            </button>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="add-form">
            <div className="form-group">
              <label htmlFor="employeeId">Employee ID</label>
              <input
                type="text"
                id="employeeId"
                value={employeeId}
                onChange={(e) => handleEmployeeIdChange(e.target.value)}
                disabled={processing}
                placeholder="Enter employee ID"
                required
              />
              {employeeIdError && <div className="field-error">{employeeIdError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={processing}
                placeholder="Enter name"
                required
              />
              {nameError && <div className="field-error">{nameError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                disabled={processing}
                placeholder="Enter email"
                required
              />
              {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div className="form-group phone-form-group">
              <label htmlFor="phone">Phone</label>
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
                  type="text"
                  id="phone"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={processing}
                  placeholder="Phone number"
                  className="phone-number-input"
                  maxLength={getPhoneMaxLength(selectedCountry.code)}
                  required
                />
              </div>
              {phoneError && <div className="field-error">{phoneError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="text"
                id="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                disabled={processing}
                placeholder="Enter password"
                required
              />
              {passwordError && <div className="field-error">{passwordError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="companyCode">ILKKM ID</label>
              <input
                type="text"
                id="companyCode"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                disabled={processing}
                placeholder="e.g. COMP001"
                required
              />
              {companyCodeError && <div className="field-error">{companyCodeError}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={processing}
                placeholder="e.g. ABC Technologies"
                required
              />
              {companyNameError && <div className="field-error">{companyNameError}</div>}
            </div>

            <div className="form-action-row">
              <button
                type="submit"
                disabled={processing}
                className="submit-button form-action-btn"
              >
                {processing ? 'Creating...' : 'Create Master Admin'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={processing}
                className="cancel-button form-action-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {masterAdmins.length === 0 ? (
          <div className="empty-state">No master admins found.</div>
        ) : (
          <div className="table-scroll-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>ILKKM ID</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {masterAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.employeeId || '--'}</td>
                    <td>{admin.name}</td>
                    <td>{admin.email}</td>
                    <td>{admin.phone || '--'}</td>
                    <td>{admin.companyCode || '--'}</td>
                    <td>
                      <span className={`status-badge ${admin.status === 'APPROVED' ? 'status-approved' : 'status-rejected'}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        {admin.status === 'APPROVED' ? (
                          <>
                            <button
                              onClick={() => handleDelete(admin.id)}
                              disabled={processing}
                              className="delete-button"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleDeactivate(admin.id)}
                              disabled={processing}
                              className="reject-button"
                            >
                              Deactivate
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDelete(admin.id)}
                              disabled={processing}
                              className="delete-button"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleActivate(admin.id)}
                              disabled={processing}
                              className="approve-button"
                            >
                              Activate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramOwnerMasterAdmins;