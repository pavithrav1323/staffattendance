import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import CountryCodePicker, { type Country, countries } from '../components/CountryCodePicker';
import InstallAppButton from '../components/InstallAppButton';
import { validateEmail, validatePhone, validatePassword, validateName, validateEmployeeId, getPhoneMaxLength, getPhoneValidationError } from '../utils/validation';

interface Department {
  id: string;
  name: string;
  code: string;
}

const StaffRegisterPage = () => {
  const navigate = useNavigate();
  const [companyCode, setCompanyCode] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [companyFound, setCompanyFound] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'MY') || countries[0]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<{
    name: string;
    status: string;
    adminName: string | null;
  } | null>(null);

  useEffect(() => {
    const loadDepartments = async () => {
      const trimmed = companyCode.trim();
      if (!trimmed) {
        setDepartments([]);
        setCompanyFound(false);
        setDepartmentId('');
        setError(null);
        return;
      }

      setDepartmentsLoading(true);
      setError(null);
      setCompanyFound(false);
      setDepartmentId('');

      try {
        const data = await authService.getPublicDepartments(trimmed);
        setDepartments(data);
        setCompanyFound(true);
      } catch (err: any) {
        setDepartments([]);
        setCompanyFound(false);
        setError(err.message || 'Company not found');
      } finally {
        setDepartmentsLoading(false);
      }
    };

    const timeout = setTimeout(loadDepartments, 300);
    return () => clearTimeout(timeout);
  }, [companyCode]);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const max = getPhoneMaxLength(selectedCountry.code);
    setPhone(digits.slice(0, max));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    let message = '';

    if (!companyCode.trim()) {
      message = 'Company code is required';
      isValid = false;
    } else if (!companyFound) {
      message = 'Please enter a valid company code';
      isValid = false;
    } else if (!employeeId.trim()) {
      message = 'Employee ID is required';
      isValid = false;
    } else if (!validateEmployeeId(employeeId.trim())) {
      message = 'Enter a valid Employee ID';
      isValid = false;
    } else if (!name.trim()) {
      message = 'Name is required';
      isValid = false;
    } else if (!validateName(name.trim())) {
      message = 'Enter a valid name';
      isValid = false;
    } else if (!email.trim()) {
      message = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email.trim())) {
      message = 'Enter a valid email address';
      isValid = false;
    } else if (phone && !validatePhone(phone, selectedCountry.code)) {
      message = getPhoneValidationError(selectedCountry.code, selectedCountry.name);
      isValid = false;
    } else if (!password) {
      message = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      message = 'Password must contain uppercase, lowercase, number, and special character';
      isValid = false;
    } else if (!departmentId) {
      message = 'Department is required';
      isValid = false;
    }

    if (!isValid) {
      setError(message);
    } else {
      setError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedPhoneDigits = phone.replace(/\D/g, '');
    const fullPhone = phone ? `${selectedCountry.dialCode}${trimmedPhoneDigits}` : undefined;

    try {
      const response = await authService.registerStaff({
        companyCode: companyCode.trim(),
        employeeId: employeeId.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: fullPhone,
        password,
        departmentId,
        designation: designation.trim() || undefined,
      });

      setSuccess('Registration submitted successfully.');
      setRegisteredData({
        name: response.name,
        status: response.status,
        adminName: response.admin?.name || null,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success && registeredData) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Staff Tracker Geo</h1>
          <h2>Staff Registration</h2>

          <div className="registration-success">
            <p className="registration-success-title">
              Registration Submitted Successfully
            </p>

            {registeredData.adminName ? (
              <>
                <p className="registration-success-text">
                  Your registration is pending approval from
                </p>
                <p className="registration-success-admin">
                  {registeredData.adminName}
                </p>
              </>
            ) : (
              <p className="registration-success-text">
                Your registration is pending Admin approval.
              </p>
            )}

            <div className="registration-success-status">
              <span className="status-label">Status</span>
              <span className="status-badge">Pending Approval</span>
            </div>
          </div>

          <button onClick={() => navigate('/login')} className="login-button registration-success-login">
            Go to Login
          </button>
          <InstallAppButton />
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Staff Tracker Geo</h1>
        <h2>Staff Registration</h2>

        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
            <button onClick={() => setError(null)} className="close-button">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companyCode">Company ID / Company Code</label>
            <input
              type="text"
              id="companyCode"
              value={companyCode}
              onChange={(e) => setCompanyCode(e.target.value)}
              disabled={loading}
              placeholder="Enter company ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="employeeId">Employee ID</label>
            <input
              type="text"
              id="employeeId"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={loading}
              placeholder="Enter employee ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
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
                }}
              />
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                disabled={loading}
                placeholder="Phone number (optional)"
                className="phone-number-input"
                maxLength={getPhoneMaxLength(selectedCountry.code)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={loading || departmentsLoading || !companyFound}
              required
            >
              <option value="">
                {departmentsLoading
                  ? 'Loading departments...'
                  : !companyFound
                  ? 'Enter a valid company code first'
                  : departments.length === 0
                  ? 'No active departments found for this company'
                  : 'Select department'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="designation">Designation</label>
            <input
              type="text"
              id="designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              disabled={loading}
              placeholder="Enter designation (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-5.06 5.94M1 1l22 22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <InstallAppButton />

        <div className="auth-switch">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="auth-switch-button"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffRegisterPage;
