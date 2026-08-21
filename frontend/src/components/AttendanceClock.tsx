import { useState, useEffect } from 'react';
import { attendanceService } from '../services/attendance.service';
import { biometricService, BiometricError, type BiometricCapability } from '../services/biometric.service';
import { getCurrentLocation, getPermissionPromptMessage, checkGeolocationPermission, GeolocationError } from '../utils/gps';

type BiometricStatus = BiometricCapability['status'];

interface CurrentSession {
  attendanceId: string;
  clockInTime: string;
  clockInLocationStatus: 'INSIDE_GEOFENCE' | 'OUTSIDE_GEOFENCE';
  clockInDistanceMeters: number;
  clockInMethod?: string | null;
}

const AttendanceClock = () => {
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [workingTime, setWorkingTime] = useState<string>('00:00:00');
  const [pendingManualAction, setPendingManualAction] = useState<'in' | 'out' | null>(null);
  const [permissionGuidance, setPermissionGuidance] = useState<string | null>(null);
  const [gpsDebugInfo, setGpsDebugInfo] = useState<any>(null);

  const manualAllowed =
    biometricStatus === 'unavailable' ||
    biometricFailed;

  useEffect(() => {
    loadCurrentSession();
    checkBiometricStatus();
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const permissionState = await checkGeolocationPermission();
      
      // Only show guidance if permission is "prompt" AND hasn't been shown yet this session
      if (permissionState === 'prompt') {
        const guidanceShown = sessionStorage.getItem('staff_location_guidance_shown');
        if (!guidanceShown) {
          setPermissionGuidance(getPermissionPromptMessage());
          sessionStorage.setItem('staff_location_guidance_shown', 'true');
        }
      }
    } catch {
      // Permission API not supported, ignore
    }
  };

  useEffect(() => {
    if (!currentSession) return;

    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now);

      const clockIn = new Date(currentSession.clockInTime);
      const elapsed = now.getTime() - clockIn.getTime();
      const hours = Math.floor(elapsed / (1000 * 60 * 60));
      const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

      setWorkingTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const loadCurrentSession = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getCurrentSession();
      
      if (response.success) {
        if (response.data) {
          setCurrentSession(response.data);
        } else {
          setCurrentSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to load current session:', err);
      setCurrentSession(null);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const info = await biometricService.checkCapability();
      setBiometricStatus(info.status);

      if (info.status === 'unavailable') return;

      const hasCredentials = await biometricService.hasCredentials();
      setNeedsEnrollment(!hasCredentials);
    } catch (err: any) {
      console.error('Biometric status check failed:', err);
      setBiometricStatus('unavailable');
    }
  };

  const performClockWithLocation = async (
    action: 'in' | 'out',
    method: 'BIOMETRIC' | 'MANUAL'
  ) => {
    setLocationLoading(true);
    setGpsDebugInfo(null);
    try {
      const location = await getCurrentLocation();
      // Clear permission guidance once location is successfully obtained
      setPermissionGuidance(null);
      
      const request = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        method,
      };

      const response = action === 'in'
        ? await attendanceService.clockIn(request)
        : await attendanceService.clockOut(request);

      if (response.success) {
        setSuccess(action === 'in' ? 'Clock in successful!' : 'Clock out successful!');
        if (action === 'in') {
          await loadCurrentSession();
        } else {
          setCurrentSession(null);
          setWorkingTime('00:00:00');
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || `Clock ${action === 'in' ? 'in' : 'out'} failed`;

      console.log('[ATTENDANCE] GPS Error details:', {
        message: err.message,
        code: err.code,
        debugInfo: err.debugInfo,
        isGeolocationError: err instanceof GeolocationError
      });

      // Capture debug info from GPS error if available
      if (err instanceof GeolocationError && err.debugInfo) {
        console.log('[ATTENDANCE] Setting GPS debug info:', err.debugInfo);
        setGpsDebugInfo(err.debugInfo);
      } else {
        // Fallback: create basic debug info even if not GeolocationError
        const basicDebugInfo = {
          origin: window.location.origin,
          userAgent: navigator.userAgent,
          secureContext: window.isSecureContext,
          geolocationSupported: 'geolocation' in navigator,
          permissionState: 'N/A',
          errorCode: err.code || 'N/A',
          errorMessage: err.message || 'Unknown error',
          attempt: 'N/A'
        };
        console.log('[ATTENDANCE] Setting fallback GPS debug info:', basicDebugInfo);
        setGpsDebugInfo(basicDebugInfo);
      }

      // If user already has an active session, refresh to show correct state
      if (action === 'in' && errorMessage.includes('already has an active clock-in session')) {
        setSuccess('An active attendance session already exists.');
        await loadCurrentSession();
      } else {
        setError(errorMessage);
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      const verified = await biometricService.verify();
      if (!verified) {
        setError('Biometric verification failed');
        return;
      }

      setVerifying(false);
      await performClockWithLocation('in', 'BIOMETRIC');
    } catch (err: any) {
      if (err instanceof BiometricError) {
        if (err.kind === 'cancelled') {
          setError('Biometric verification was cancelled. Please try again.');
        } else if (err.kind === 'unavailable') {
          setBiometricFailed(true);
          setVerifying(false);
          setError(null);
        } else {
          if (biometricStatus === 'unknown') {
            setBiometricFailed(true);
            setVerifying(false);
          } else {
            setError(err.message);
          }
        }
      } else {
        setError(err.message || 'Clock in failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      const verified = await biometricService.verify();
      if (!verified) {
        setError('Biometric verification failed');
        return;
      }

      setVerifying(false);
      await performClockWithLocation('out', 'BIOMETRIC');
    } catch (err: any) {
      if (err instanceof BiometricError) {
        if (err.kind === 'cancelled') {
          setError('Biometric verification was cancelled. Please try again.');
        } else if (err.kind === 'unavailable') {
          setBiometricFailed(true);
          setVerifying(false);
          setError(null);
        } else {
          if (biometricStatus === 'unknown') {
            setBiometricFailed(true);
            setVerifying(false);
          } else {
            setError(err.message);
          }
        }
      } else {
        setError(err.message || 'Clock out failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleBiometricSetup = async () => {
    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      await biometricService.register();
      setNeedsEnrollment(false);
      setBiometricFailed(false);
      setSuccess('Biometric setup completed successfully');
    } catch (err: any) {
      if (err instanceof BiometricError) {
        if (err.kind === 'cancelled') {
          setError('Biometric setup was cancelled. Please try again.');
        } else if (err.kind === 'unavailable') {
          setBiometricFailed(true);
          setVerifying(false);
          setError(null);
        } else {
          if (biometricStatus === 'unknown') {
            setBiometricFailed(true);
            setVerifying(false);
          } else {
            setError(err.message);
          }
        }
      } else {
        setError(err.message || 'Biometric setup failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleBiometricAction = async () => {
    if (needsEnrollment) {
      await handleBiometricSetup();
    } else if (currentSession) {
      await handleClockOut();
    } else {
      await handleClockIn();
    }
  };

  const openManualConfirm = (action: 'in' | 'out') => {
    setPendingManualAction(action);
    setError(null);
    setSuccess(null);
  };

  const cancelManualConfirm = () => {
    setPendingManualAction(null);
  };

  const confirmManualAction = async () => {
    if (!pendingManualAction) return;
    setPendingManualAction(null);
    await performClockWithLocation(pendingManualAction, 'MANUAL');
  };

  const copyGpsDebug = () => {
    if (!gpsDebugInfo) return;
    
    const debugText = `GPS Debug:
Browser: ${gpsDebugInfo.userAgent}
Origin: ${gpsDebugInfo.origin}
Secure Context: ${gpsDebugInfo.secureContext}
Geolocation Supported: ${gpsDebugInfo.geolocationSupported}
Permissions API State: ${gpsDebugInfo.permissionState}
Actual Geolocation Error Code: ${gpsDebugInfo.errorCode}
Actual Geolocation Error Message: ${gpsDebugInfo.errorMessage}
Attempt: ${gpsDebugInfo.attempt}`;
    
    navigator.clipboard.writeText(debugText).then(() => {
      setSuccess('GPS Debug copied to clipboard');
      setTimeout(() => setSuccess(null), 2000);
    }).catch(() => {
      setError('Failed to copy debug info');
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusText = (): string => {
    if (currentSession) return manualAllowed ? 'Manual Clock Out' : 'Currently Clocked In';
    if (manualAllowed) return 'Manual Clock In';
    if (needsEnrollment && biometricStatus === 'available') return 'Set Up Biometric';
    return 'Ready to Clock In';
  };

  const getActionText = (): string => {
    if (needsEnrollment && biometricStatus === 'available') return 'Set Up Biometric';
    if (currentSession) return 'Tap to Clock Out';
    return 'Tap to Clock In';
  };

  const getWorkStatusMessage = (): string => {
    if (currentSession) {
      return 'You are working\nHave a productive day!';
    }
    return 'Ready to Clock In\nStart your work session when you are ready.';
  };

  const getButtonText = (): string => {
    if (verifying) return 'Verifying identity...';
    if (locationLoading) return 'Getting location...';
    return currentSession ? 'Clock Out' : 'Clock In';
  };

  const actionDisabled =
    verifying ||
    locationLoading;

  if (loading) {
    return <div className="staff-attendance-page">
      <div className="attendance-loading">Loading attendance status...</div>
    </div>;
  }

  return (
    <div className="staff-attendance-page">
      <div className="attendance-page-container">
        {error && (
          <div className="error-message-overlay">
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="close-button">×</button>
            </div>
          </div>
        )}

        {success && (
          <div className="success-message-overlay">
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess(null)} className="close-button">×</button>
            </div>
          </div>
        )}

        {permissionGuidance && (
          <div className="success-message-overlay">
            <div className="success-message" style={{ backgroundColor: '#eff6ff', borderLeftColor: '#2563eb', color: '#1e40af' }}>
              {permissionGuidance}
              <button onClick={() => setPermissionGuidance(null)} className="close-button">×</button>
            </div>
          </div>
        )}

        {/* Blue Hero Section */}
        <section className="attendance-hero">
          <div className="hero-time">{formatTime(currentTime)}</div>
          <div className="hero-date">{formatDate(currentTime)}</div>
          <div className="hero-status">
            <span className={`status-dot ${currentSession ? 'status-active' : ''}`}></span>
            <span className="status-text">{getStatusText()}</span>
          </div>
        </section>

        {/* Biometric Circle */}
        {biometricStatus && biometricStatus !== 'unavailable' && !biometricFailed && (
          <section className="attendance-biometric-wrapper">
            <div
              className={`attendance-biometric-circle ${actionDisabled ? 'disabled' : ''}`}
              onClick={!actionDisabled ? handleBiometricAction : undefined}
            >
              {verifying ? (
                <div className="biometric-loading">...</div>
              ) : (
                <img
                  src="/images/fingerprint.png"
                  alt="Biometric Fingerprint"
                  className="biometric-fingerprint-image"
                />
              )}
            </div>
            <div className="biometric-action-text">{getActionText()}</div>
          </section>
        )}

        {/* Main Content */}
        <section className="attendance-content">
          <div className="attendance-content-inner">
            {/* Work Status Message */}
            <div className="work-status-message">
              {getWorkStatusMessage().split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            {/* Attendance Stats */}
            <div className="attendance-time-summary">
              <div className="time-summary-item">
                <div className="time-summary-label">Clock In</div>
                <div className="time-summary-value">
                  {currentSession ? formatTime(new Date(currentSession.clockInTime)) : '--:--'}
                </div>
              </div>
              <div className="time-summary-divider"></div>
              <div className="time-summary-item">
                <div className="time-summary-label">Clock Out</div>
                <div className="time-summary-value">
                  {currentSession ? '--:--' : '--:--'}
                </div>
              </div>
              <div className="time-summary-divider"></div>
              <div className="time-summary-item">
                <div className="time-summary-label">Working Time</div>
                <div className="time-summary-value">
                  {currentSession ? workingTime : '00:00:00'}
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            {!manualAllowed && (
              <button
                onClick={currentSession ? handleClockOut : handleClockIn}
                disabled={actionDisabled}
                className="attendance-action-button"
              >
                {getButtonText()}
              </button>
            )}

            {/* Manual Fallback */}
            {manualAllowed && (
              <button
                onClick={() => openManualConfirm(currentSession ? 'out' : 'in')}
                disabled={actionDisabled}
                className="attendance-action-button manual-action-button"
              >
                {currentSession ? 'Manual Clock Out' : 'Manual Clock In'}
              </button>
            )}

            {/* Location Note */}
            <div className="location-note">
              Your current location will be recorded when you clock in or clock out.
            </div>
          </div>
        </section>

        {/* Manual Confirmation Modal */}
        {pendingManualAction && (
          <div className="modal-overlay" onClick={cancelManualConfirm}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Confirm Manual {pendingManualAction === 'in' ? 'Clock In' : 'Clock Out'}</h3>
              <p>Are you sure you want to record this attendance manually?</p>
              <div className="modal-actions">
                <button onClick={cancelManualConfirm} className="action-btn action-btn-cancel" type="button">
                  Cancel
                </button>
                <button
                  onClick={confirmManualAction}
                  disabled={locationLoading}
                  className="action-btn action-btn-confirm"
                  type="button"
                >
                  {locationLoading ? 'Getting location...' : `Confirm ${pendingManualAction === 'in' ? 'Clock In' : 'Clock Out'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GPS Debug Panel */}
        {gpsDebugInfo && (
          <>
            {console.log('[ATTENDANCE] Rendering GPS Debug panel:', gpsDebugInfo)}
            <div style={{ marginTop: '24px', padding: '16px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ color: '#92400e', fontSize: '14px' }}>GPS Debug (Temporary)</strong>
                <button 
                  onClick={copyGpsDebug}
                  style={{ 
                    padding: '6px 12px', 
                    background: '#f59e0b', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    cursor: 'pointer' 
                  }}
                >
                  Copy GPS Debug
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '1.6' }}>
                <div><strong>Browser:</strong> {gpsDebugInfo.userAgent}</div>
                <div><strong>Origin:</strong> {gpsDebugInfo.origin}</div>
                <div><strong>Secure Context:</strong> {String(gpsDebugInfo.secureContext)}</div>
                <div><strong>Geolocation Supported:</strong> {String(gpsDebugInfo.geolocationSupported)}</div>
                <div><strong>Permissions API State:</strong> {gpsDebugInfo.permissionState}</div>
                <div><strong>Actual Geolocation Error Code:</strong> {gpsDebugInfo.errorCode}</div>
                <div><strong>Actual Geolocation Error Message:</strong> {gpsDebugInfo.errorMessage}</div>
                <div><strong>Attempt:</strong> {gpsDebugInfo.attempt}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceClock;