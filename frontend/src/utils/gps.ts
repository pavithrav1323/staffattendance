interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export class GeolocationError extends Error {
  code: number;
  debugInfo?: any;

  constructor(message: string, code: number, debugInfo?: any) {
    super(message);
    this.code = code;
    this.debugInfo = debugInfo;
  }
}

function getMessageForErrorCode(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission is required. Please allow location access for this site and try again.';
    case 2:
      return 'Unable to access your location from this browser. Please check location settings and try again.';
    case 3:
      return 'Unable to get your location in time. Please try again.';
    default:
      return 'Unable to get your location';
  }
}

function detectBrowserName(): string {
  const userAgent = navigator.userAgent || '';
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
    return 'Chrome';
  }
  if (userAgent.includes('DuckDuckGo')) {
    return 'DuckDuckGo';
  }
  if (userAgent.includes('Edg')) {
    return 'Edge';
  }
  if (userAgent.includes('SamsungBrowser')) {
    return 'Samsung Internet';
  }
  if (userAgent.includes('Firefox')) {
    return 'Firefox';
  }
  
  return 'Your Browser';
}

function getPermissionPromptMessage(): string {
  const browserName = detectBrowserName();
  return `For smoother attendance, change it to 'Allow while using the app'. Go to Settings → Apps → ${browserName} or the browser you are currently using → Permissions → Location → Allow while using the app.`;
}

async function checkGeolocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'unsupported';
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
    return permissionStatus.state as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'unsupported';
  }
}

export const getCurrentLocation = (): Promise<GPSLocation> => {
  return new Promise(async (resolve, reject) => {
    const debugInfo: any = {
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      secureContext: window.isSecureContext,
      geolocationSupported: 'geolocation' in navigator
    };

    console.log('[GPS][DEBUG]', debugInfo);

    if (!navigator.geolocation) {
      reject(new GeolocationError('Geolocation is not supported by this browser', -1, {
        ...debugInfo,
        permissionState: 'N/A',
        error: 'Geolocation not supported',
        attempt: 'N/A'
      }));
      return;
    }

    // Log origin and permission state for diagnostics (advisory only)
    console.log('[GPS] origin:', window.location.origin);
    const permissionState = await checkGeolocationPermission();
    console.log('[GPS] permission API state:', permissionState);
    console.log('[GPS][DEBUG] permission state:', permissionState);
    
    debugInfo.permissionState = permissionState;
    
    // If permission state is "prompt", show informational guidance but don't block
    if (permissionState === 'prompt') {
      console.log('[GPS] permission prompt guidance:', getPermissionPromptMessage());
      // Note: We don't reject here; we still attempt geolocation
      // The calling component can choose to display this guidance to the user
    }
    
    // Do NOT reject based on Permissions API state
    // Actual geolocation call is the source of truth

    const attempt = (enableHighAccuracy: boolean, isFallback: boolean) => {
      const options = {
        enableHighAccuracy,
        timeout: enableHighAccuracy ? 3000 : 3000,
        maximumAge: isFallback ? 30000 : 0,
      };

      const attemptName = isFallback ? 'Fallback' : 'High Accuracy';

      if (!isFallback) {
        console.log('[GPS] High accuracy attempt started');
      } else {
        console.log('[GPS] Starting fallback attempt');
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isFallback) {
            console.log('[GPS] High accuracy success');
          } else {
            console.log('[GPS] Fallback success');
          }
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          if (!isFallback) {
            console.log('[GPS] High accuracy failed: code=' + error.code);
          } else {
            console.log('[GPS] Fallback failed: code=' + error.code);
          }

          console.log('[GPS] actual geolocation error code:', error.code);
          console.log('[GPS] actual geolocation error message:', error.message);
          console.error('[GPS][DEBUG] geolocation error:', {
            code: error.code,
            message: error.message,
            isFallback
          });

          const finalDebugInfo = {
            ...debugInfo,
            errorCode: error.code,
            errorMessage: error.message,
            attempt: attemptName
          };

          if (!isFallback && (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)) {
            attempt(false, true);
            return;
          }

          reject(new GeolocationError(getMessageForErrorCode(error.code), error.code, finalDebugInfo));
        },
        options
      );
    };

    attempt(true, false);
  });
};

export { getPermissionPromptMessage, checkGeolocationPermission };
