import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { ApiError } from '../services/api';
import InstallAppButton from '../components/InstallAppButton';
import { validateEmail } from '../utils/validation';

interface PendingApprovalData {
  admin?: {
    name: string;
    role?: string;
  } | null;
}

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalData | null>(null);
  const [rejectedData, setRejectedData] = useState<PendingApprovalData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const deactivationMsg = sessionStorage.getItem('deactivationError');
    if (deactivationMsg) {
      setError(deactivationMsg);
      sessionStorage.removeItem('deactivationError');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!trimmedPassword) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      setPendingApproval(null);
      setRejectedData(null);
      const user = await authService.login(
        trimmedEmail,
        trimmedPassword
      );
      
      if (user.mustChangePassword) {
        navigate('/staff/change-password');
        return;
      }

      if (user.role === 'STAFF') {
        navigate('/staff/attendance');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'MASTER_ADMIN') {
        navigate('/master-admin');
      } else if (user.role === 'PROGRAM_OWNER') {
        navigate('/program-owner');
      } else {
        setError('Unknown role. Please contact support.');
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'STAFF_APPROVAL_PENDING') {
        setPendingApproval({ admin: err.data?.admin || null });
      } else if (err instanceof ApiError && err.code === 'STAFF_ACCOUNT_REJECTED') {
        setRejectedData({ admin: err.data?.admin || null });
      } else if (err instanceof ApiError && err.code === 'ACCOUNT_LOCKED') {
        setError('Account temporarily locked due to repeated failed attempts. Please try again in 15 minutes.');
      } else if (err instanceof ApiError && (err.code === 'ACCOUNT_DEACTIVATED' || err.statusCode === 403)) {
        setError(err.message || 'Your account is currently deactivated. Please contact your administrator.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container login-page">
      <div className="login-card">
        <img
          src="/images/logo.jpeg"
          alt="Kolej Sains Kesihatan Bersekutu Sungai Buloh logo"
          className="college-logo"
        />
        <h1>Staff Attendance</h1>
        <h2>Login</h2>
        
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="close-button">×</button>
          </div>
        )}

        {rejectedData && (
          <div className="rejected-account-message">
            <p className="rejected-account-title">Account Rejected</p>
            {rejectedData.admin?.name ? (
              <>
                <p className="rejected-account-text">
                  Your account was rejected by
                </p>
                <p className="rejected-account-admin">
                  {rejectedData.admin.name}
                </p>
              </>
            ) : (
              <p className="rejected-account-text">
                Your account registration has been rejected by your Admin.
              </p>
            )}
            <p className="rejected-account-hint">
              Please contact your Admin if you need further assistance.
            </p>
          </div>
        )}

        {pendingApproval && (
          <div className="pending-approval-message">
            <p className="pending-approval-title">Approval Pending</p>
            {pendingApproval.admin?.name ? (
              <>
                <p className="pending-approval-text">
                  Your registration request has been sent to:
                </p>
                <p className="pending-approval-admin">
                  {pendingApproval.admin.name}
                </p>
                <p className="pending-approval-admin-role">
                  Master Admin
                </p>
              </>
            ) : (
              <p className="pending-approval-text">
                Your registration request is pending Master Admin approval.
              </p>
            )}
            <p className="pending-approval-hint">
              You can log in once your Master Admin approves your account.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
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
                required
                disabled={loading}
                placeholder="Enter your password"
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <InstallAppButton />

        <div className="auth-switch">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={() => navigate('/staff/register')}
            className="auth-switch-button"
          >
            Register as Staff
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;