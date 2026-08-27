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
      return 'Location permission is disabled. Please enable location access from browser settings.';
    case 2:
      return 'Unable to access your location from this browser. Please check location settings and try again.';
    case 3:
      return 'Unable to get your current location. Please enable GPS/location permission and try again.';
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

const MAX_ATTEMPTS = 3;
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
};

const isDev = import.meta.env.DEV;

function logGps(label: string, data: Record<string, any>) {
  if (!isDev) return;
  console.log(`[GPS][DEV] ${label}`, data);
}

export const getCurrentLocation = (): Promise<GPSLocation> => {
  return new Promise(async (resolve, reject) => {
    const debugInfo: any = {
      origin: window.location.origin,
      userAgent: navigator.userAgent,
      secureContext: window.isSecureContext,
      geolocationSupported: 'geolocation' in navigator,
    };

    logGps('Init', {
      origin: debugInfo.origin,
      secureContext: debugInfo.secureContext,
      geolocationSupported: debugInfo.geolocationSupported,
    });

    if (!navigator.geolocation) {
      reject(new GeolocationError('Geolocation is not supported by this browser', -1, {
        ...debugInfo,
        permissionState: 'N/A',
        error: 'Geolocation not supported',
        attempt: 'N/A',
      }));
      return;
    }

    const permissionState = await checkGeolocationPermission();
    debugInfo.permissionState = permissionState;
    logGps('Permission state', { permissionState });

    if (permissionState === 'denied') {
      const finalDebugInfo = { ...debugInfo, attempt: 'Permission check' };
      reject(new GeolocationError(getMessageForErrorCode(1), 1, finalDebugInfo));
      return;
    }

    let attemptNumber = 0;

    const tryGetPosition = () => {
      attemptNumber += 1;
      const attemptName = `Attempt ${attemptNumber}`;
      logGps('Starting attempt', { attempt: attemptNumber, ...GEO_OPTIONS });

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          debugInfo.attempt = attemptName;

          logGps('Success', {
            attempt: attemptNumber,
            accuracy,
            // Coordinates are only logged in dev; kept out of production logs
            latitude: isDev ? latitude : undefined,
            longitude: isDev ? longitude : undefined,
          });

          resolve({ latitude, longitude, accuracy });
        },
        (error) => {
          logGps('Failed', {
            attempt: attemptNumber,
            errorCode: error.code,
            errorMessage: error.message,
          });

          debugInfo.errorCode = error.code;
          debugInfo.errorMessage = error.message;

          if (error.code === error.TIMEOUT && attemptNumber < MAX_ATTEMPTS) {
            logGps('Retrying after timeout', { attempt: attemptNumber, maxAttempts: MAX_ATTEMPTS });
            tryGetPosition();
            return;
          }

          const finalDebugInfo = { ...debugInfo, attempt: attemptName };
          reject(new GeolocationError(getMessageForErrorCode(error.code), error.code, finalDebugInfo));
        },
        GEO_OPTIONS
      );
    };

    tryGetPosition();
  });
};

export { getPermissionPromptMessage, checkGeolocationPermission };
