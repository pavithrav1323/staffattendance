import { apiRequest, getAccessToken } from './api';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

export type BiometricAttemptOutcome =
  | 'success'
  | 'cancelled'
  | 'unavailable'
  | 'failed';

export class BiometricError extends Error {
  kind: BiometricAttemptOutcome;
  constructor(kind: BiometricAttemptOutcome, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface BiometricDiagnostics {
  origin: string;
  isSecureContext: boolean;
  displayMode: string;
  userAgent: string;
  userAgentData: string;
  credentialsSupported: boolean;
  credentialsCreateType: string;
  credentialsGetType: string;
  publicKeyCredentialSupported: boolean;
  publicKeyCredentialType: string;
  platformAuthenticatorMethod: string;
  platformAuthenticatorResult: boolean | null;
  runtime: string;
  supportedBrowser: boolean;
}

export type BiometricResult =
  | {
      status: 'available';
      message?: string;
    }
  | {
      status: 'unavailable';
      message: string;
    }
  | {
      status: 'unknown';
      message: string;
    };

export type BiometricCapability = BiometricResult & BiometricDiagnostics;

function isSupportedBrowser(runtime: string): boolean {
  return runtime === 'Chrome Android' || runtime === 'Chrome Desktop';
}

function detectRuntime(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('wv') || ua.includes('webview')) return 'WebView';
  if ((window.navigator as any).standalone === true) return 'iOS PWA (standalone)';
  if ((window.navigator as any).standalone === false) return 'iOS Safari';

  if (ua.includes('samsungbrowser')) return 'Samsung Internet';
  if (ua.includes('edg/')) return 'Microsoft Edge';
  if (ua.includes('firefox/')) return 'Firefox';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('chrome/') && ua.includes('mobile')) return 'Chrome Android';
  if (ua.includes('chrome/')) return 'Chrome Desktop';
  if (ua.includes('safari/') && ua.includes('mobile')) return 'Safari iOS';
  if (ua.includes('safari/')) return 'Safari Desktop';

  return 'Unknown';
}

function getUserAgentData(): string {
  const nav = navigator as any;
  if (!nav.userAgentData) return 'not available';

  const brands = nav.userAgentData.brands
    ?.map((b: any) => `${b.brand}/${b.version}`)
    .join(', ');
  const mobile = nav.userAgentData.mobile;
  const platform = nav.userAgentData.platform;

  return `mobile=${mobile}; platform=${platform}; brands=${brands || 'none'}`;
}

function getDisplayMode(): string {
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone PWA';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: browser)').matches) return 'browser tab';
  }
  if ((navigator as any).standalone === true) return 'iOS standalone PWA';
  return 'normal browser tab';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function fetchWebAuthn(endpoint: string, body?: unknown): Promise<{ status: number; body: any }> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = { success: false, message: responseText || 'Invalid JSON response' };
  }

  return { status: response.status, body: parsed };
}

function classifyRegisterError(
  error: any,
  uvpaa?: boolean | null
): { kind: BiometricAttemptOutcome; message: string } {
  if (!error) {
    return { kind: 'failed', message: 'Biometric setup failed. Please try again.' };
  }

  const name = error.name || '';
  const message = error.message || '';
  const lowerMessage = message.toLowerCase();

  const isCancelSignal =
    lowerMessage.includes('user') &&
    (lowerMessage.includes('cancel') || lowerMessage.includes('dismiss') || lowerMessage.includes('decline'));

  const isNoAuthenticatorOrPasskey =
    lowerMessage.includes('passkey') ||
    lowerMessage.includes('authenticator') ||
    lowerMessage.includes('no credential') ||
    lowerMessage.includes('not available');

  const isCredentialManagerFailure =
    lowerMessage.includes('credential manager') && !isCancelSignal;

  const isPlatformUnavailable =
    isCredentialManagerFailure ||
    isNoAuthenticatorOrPasskey ||
    lowerMessage.includes('unknown error occurred') ||
    name === 'UnknownError' ||
    name === 'NotSupportedError' ||
    name === 'SecurityError' ||
    uvpaa === false;

  if (isPlatformUnavailable) {
    return {
      kind: 'unavailable',
      message: 'Biometric setup could not be completed because this device cannot use a local platform authenticator.',
    };
  }

  switch (name) {
    case 'InvalidStateError':
      return { kind: 'failed', message: 'Biometric credential state is invalid. You may need to re-enroll.' };
    case 'AbortError':
      return { kind: 'cancelled', message: 'Biometric setup was aborted.' };
    case 'NotAllowedError':
      if (isCancelSignal || lowerMessage.includes('cancel') || lowerMessage.includes('timeout')) {
        return { kind: 'cancelled', message: 'Biometric setup was cancelled. Please try again.' };
      }
      return {
        kind: uvpaa === true ? 'failed' : 'unavailable',
        message: 'Biometric setup could not be completed on this device. Check your screen lock, fingerprint settings, Chrome, and Google Play Services, then try again.',
      };
    default:
      return { kind: 'failed', message: message || 'Biometric setup failed. Please try again.' };
  }
}

function classifyAuthError(
  error: any,
  uvpaa?: boolean | null
): { kind: BiometricAttemptOutcome; message: string } {
  if (!error) {
    return { kind: 'failed', message: 'Biometric verification failed. Please try again.' };
  }

  const name = error.name || '';
  const message = error.message || '';
  const lowerMessage = message.toLowerCase();

  const isCancelSignal =
    lowerMessage.includes('cancel') ||
    lowerMessage.includes('abort') ||
    lowerMessage.includes('dismiss') ||
    lowerMessage.includes('timeout');

  const isNoPasskeyOrCredential =
    !isCancelSignal &&
    (lowerMessage.includes('passkey') ||
      lowerMessage.includes('passkeys') ||
      lowerMessage.includes('no passkeys') ||
      lowerMessage.includes('no matching') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('no credential') ||
      lowerMessage.includes('credential not found') ||
      lowerMessage.includes('authenticator unavailable'));

  const isCredentialMissing =
    !isCancelSignal &&
    (lowerMessage.includes('credential') ||
      lowerMessage.includes('registered') ||
      lowerMessage.includes('available'));

  const isPlatformUnavailable =
    name === 'NotSupportedError' ||
    name === 'SecurityError' ||
    name === 'UnknownError' ||
    lowerMessage.includes('unknown error occurred') ||
    lowerMessage.includes('credential manager') ||
    uvpaa === false;

  if (isPlatformUnavailable) {
    return {
      kind: 'unavailable',
      message: 'Biometric verification could not be completed on this device.',
    };
  }

  if (isNoPasskeyOrCredential) {
    return { kind: 'unavailable', message: 'No registered biometric credential is available on this device.' };
  }

  if (isCredentialMissing) {
    return { kind: 'unavailable', message: 'No registered biometric credential is available on this device.' };
  }

  switch (name) {
    case 'InvalidStateError':
      return { kind: 'failed', message: 'Biometric credential state is invalid. You may need to re-enroll.' };
    case 'AbortError':
      return { kind: 'cancelled', message: 'Biometric verification was aborted.' };
    case 'NotAllowedError':
      if (isCancelSignal) {
        return { kind: 'cancelled', message: 'Biometric verification was cancelled. Please try again.' };
      }
      // For authentication, if NotAllowedError without explicit cancel and UVPAA is true/unknown, treat as unavailable
      // This handles Android "No passkeys available" with generic error
      if (uvpaa === true || uvpaa === null) {
        return { kind: 'unavailable', message: 'No registered biometric credential is available on this device.' };
      }
      return {
        kind: 'unavailable',
        message: 'Biometric verification could not be completed on this device.',
      };
    default:
      return { kind: 'failed', message: message || 'Biometric verification failed. Please try again.' };
  }
}

class BiometricService {
  private lastCapability: BiometricCapability | null = null;

  /**
   * Check biometric capability with three possible states:
   * available, unavailable, unknown
   */
  async checkCapability(): Promise<BiometricCapability> {
    const origin = window.location.origin;
    const isSecureContext = window.isSecureContext;
    const userAgent = navigator.userAgent || 'unknown';
    const userAgentData = getUserAgentData();
    const displayMode = getDisplayMode();
    const runtime = detectRuntime(userAgent);
    const supportedBrowser = isSupportedBrowser(runtime);

    const credentialsSupported = 'credentials' in navigator;
    const credentialsCreateType = credentialsSupported
      ? typeof navigator.credentials.create
      : 'n/a';
    const credentialsGetType = credentialsSupported
      ? typeof navigator.credentials.get
      : 'n/a';

    const publicKeyCredentialSupported = 'PublicKeyCredential' in window;
    const publicKeyCredentialType = publicKeyCredentialSupported
      ? typeof (window as any).PublicKeyCredential
      : 'n/a';

    const platformAuthenticatorMethod = publicKeyCredentialSupported
      ? typeof (window as any).PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable
      : 'n/a';

    let platformAuthenticatorResult: boolean | null = null;

    const base = {
      origin,
      isSecureContext,
      displayMode,
      userAgent,
      userAgentData,
      credentialsSupported,
      credentialsCreateType,
      credentialsGetType,
      publicKeyCredentialSupported,
      publicKeyCredentialType,
      platformAuthenticatorMethod,
      platformAuthenticatorResult,
      runtime,
      supportedBrowser,
    };

    if (!isSecureContext) {
      return {
        ...base,
        status: 'unavailable',
        message: 'Biometric authentication requires a secure HTTPS connection.',
      };
    }

    const actualWebAuthnMissing =
      !credentialsSupported ||
      typeof navigator.credentials.create !== 'function' ||
      typeof navigator.credentials.get !== 'function' ||
      !publicKeyCredentialSupported;

    if (actualWebAuthnMissing) {
      return {
        ...base,
        status: 'unavailable',
        message:
          'This browser/runtime does not support WebAuthn authentication. Please open the app in a supported browser such as Chrome.',
      };
    }

    if (!supportedBrowser) {
      return {
        ...base,
        status: 'unavailable',
        message:
          'Biometric attendance is not supported in this browser. Please open this page in Google Chrome.',
      };
    }

    const puvpaa = (window as any).PublicKeyCredential
      ?.isUserVerifyingPlatformAuthenticatorAvailable;

    // If the detection method does not exist, do not assume the device
    // lacks biometric support. The browser may simply not expose it.
    if (typeof puvpaa !== 'function') {
      return {
        ...base,
        status: 'unknown',
        message:
          'Biometric capability could not be detected in this browser. You can still try biometric authentication.',
      };
    }

    try {
      platformAuthenticatorResult = await Promise.race([
        puvpaa(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('uvpaa timeout')), 1500)
        ),
      ]);
    } catch (error: any) {
      const result: BiometricCapability = {
        ...base,
        status: 'unknown',
        message:
          'Biometric capability could not be checked. You can still try biometric authentication.',
      };
      this.lastCapability = result;
      return result;
    }

    if (platformAuthenticatorResult) {
      const result: BiometricCapability = {
        ...base,
        status: 'available',
        message: 'Biometric authentication is available.',
        platformAuthenticatorResult,
      };
      this.lastCapability = result;
      return result;
    }

    const result: BiometricCapability = {
      ...base,
      status: 'unavailable',
      message:
        'Secure device authentication is not available or not configured on this device.',
      platformAuthenticatorResult,
    };
    this.lastCapability = result;
    return result;
  }

  /**
   * Check if user has enrolled biometric credentials
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const response = await apiRequest<{ hasCredentials: boolean }>('/webauthn/credentials', 'GET');
      return response.data?.hasCredentials || false;
    } catch (error) {
      console.error('Failed to check biometric credentials:', error);
      return false;
    }
  }

  /**
   * Register biometric credential
   */
  async register(): Promise<boolean> {
    let patchedCreate = false;
    let originalCreate: any = null;
    let uvpaa: boolean | null = null;
    let publicKeyCredential: boolean = false;
    let optionsStatus: number | null = null;

    try {
      console.log('[WEBAUTHN][REGISTER] START');
      console.log('[WEBAUTHN][REGISTER] origin:', window.location.origin);
      console.log('[WEBAUTHN][REGISTER] hostname:', window.location.hostname);
      console.log('[WEBAUTHN][REGISTER] userAgent:', navigator.userAgent);

      publicKeyCredential = 'PublicKeyCredential' in window;
      console.log('[WEBAUTHN][REGISTER] PublicKeyCredential:', publicKeyCredential);
      console.log('[WEBAUTHN][REGISTER] navigator.credentials:', 'credentials' in navigator);
      console.log('[WEBAUTHN][REGISTER] credentials.create type:', typeof navigator.credentials?.create);
      console.log(
        '[WEBAUTHN][REGISTER] isUserVerifyingPlatformAuthenticatorAvailable type:',
        typeof (window as any).PublicKeyCredential
          ?.isUserVerifyingPlatformAuthenticatorAvailable
      );

      const uvpaaMethod = (window as any).PublicKeyCredential
        ?.isUserVerifyingPlatformAuthenticatorAvailable;
      if (typeof uvpaaMethod === 'function') {
        try {
          uvpaa = await uvpaaMethod();
          console.log('[WEBAUTHN][REGISTER] UVPAA:', uvpaa);
        } catch (uvpaaError) {
          console.error('[WEBAUTHN][REGISTER] UVPAA check failed:', uvpaaError);
        }
      } else {
        console.log('[WEBAUTHN][REGISTER] UVPAA not available');
      }

      console.log('[WEBAUTHN][REGISTER] POST /webauthn/register/options');
      const optionsResult = await fetchWebAuthn('/webauthn/register/options');
      optionsStatus = optionsResult.status;
      console.log('[WEBAUTHN][REGISTER] options HTTP status:', optionsStatus);
      console.log('[WEBAUTHN][REGISTER] options response body:', optionsResult.body);

      if (optionsResult.status !== 200 || !optionsResult.body?.success) {
        throw new Error(
          optionsResult.body?.message ||
          `Registration options failed with HTTP ${optionsResult.status}`
        );
      }

      const options = optionsResult.body.data;

      console.log('[WEBAUTHN][REGISTER] register options (JSON):', JSON.stringify(options, (_key, value) => {
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
          return `[${value.constructor.name} ${value.byteLength} bytes]`;
        }
        return value;
      }, 2));

      const diagnostic = {
        userAgent: navigator.userAgent,
        origin: window.location.origin,
        isSecureContext: window.isSecureContext,
        publicKeyCredential,
        credentialsCreateType: typeof navigator.credentials?.create,
        uvpaaMethodType: typeof (window as any).PublicKeyCredential
          ?.isUserVerifyingPlatformAuthenticatorAvailable,
        uvpaa,
        authenticatorSelection: options?.authenticatorSelection,
        optionsHttpStatus: optionsStatus,
      };

      console.log('[WEBAUTHN][REGISTER] DIAGNOSTIC:', diagnostic);

      // Patch navigator.credentials.create for detailed tracing
      if (navigator.credentials && typeof navigator.credentials.create === 'function') {
        originalCreate = navigator.credentials.create.bind(navigator.credentials);
        (navigator.credentials as any).create = async (args: any) => {
          const startedAt = Date.now();
          const publicKeyOptions = args?.publicKey;

          console.log('[WEBAUTHN][REGISTER] BEFORE CREATE');
          console.log('[WEBAUTHN][REGISTER] origin:', window.location.origin);
          console.log('[WEBAUTHN][REGISTER] UA:', navigator.userAgent);
          console.log('[WEBAUTHN][REGISTER] PublicKeyCredential:', typeof (window as any).PublicKeyCredential);
          console.log('[WEBAUTHN][REGISTER] credentials.create:', typeof navigator.credentials?.create);

          console.log('[WEBAUTHN][REGISTER] createOptions:', {
            challengeIsBinary:
              publicKeyOptions?.challenge instanceof ArrayBuffer ||
              ArrayBuffer.isView(publicKeyOptions?.challenge),
            userIdIsBinary:
              publicKeyOptions?.user?.id instanceof ArrayBuffer ||
              ArrayBuffer.isView(publicKeyOptions?.user?.id),
            authenticatorSelection: publicKeyOptions?.authenticatorSelection,
            excludeCredentialsCount: publicKeyOptions?.excludeCredentials?.length ?? 0,
          });

          try {
            const credential = await originalCreate(args);
            console.log('[WEBAUTHN][REGISTER] CREATE SUCCESS', Date.now() - startedAt, 'ms');
            console.log('[WEBAUTHN][REGISTER] credential:', credential);
            return credential;
          } catch (error: any) {
            console.error('[WEBAUTHN][REGISTER] CREATE FAILED', error);
            if (error instanceof DOMException) {
              console.error('[WEBAUTHN][REGISTER] DOMException name:', error.name);
              console.error('[WEBAUTHN][REGISTER] DOMException message:', error.message);
              console.error('[WEBAUTHN][REGISTER] DOMException code:', error.code);
            }
            throw error;
          }
        };
        patchedCreate = true;
      }

      console.log('[WEBAUTHN][REGISTER] calling startRegistration');
      const registrationResponse = await startRegistration({ optionsJSON: options as any });

      console.log('[WEBAUTHN][REGISTER] credential created:', registrationResponse);

      console.log('[WEBAUTHN][REGISTER] POST /webauthn/register/verify');
      const verifyResult = await fetchWebAuthn('/webauthn/register/verify', registrationResponse);
      console.log('[WEBAUTHN][REGISTER] verify HTTP status:', verifyResult.status);
      console.log('[WEBAUTHN][REGISTER] verify response body:', verifyResult.body);

      return verifyResult.status === 200 && verifyResult.body?.success;
    } catch (error: any) {
      console.error('[WEBAUTHN][REGISTER] FAILED:', error);

      if (error instanceof DOMException) {
        console.error('[WEBAUTHN][REGISTER] DOMException name:', error.name);
        console.error('[WEBAUTHN][REGISTER] DOMException message:', error.message);
        console.error('[WEBAUTHN][REGISTER] DOMException code:', error.code);
      }

      if (error?.name) console.error('[WEBAUTHN][REGISTER] error.name:', error.name);
      if (error?.message) console.error('[WEBAUTHN][REGISTER] error.message:', error.message);

      if (error?.cause) {
        console.error('[WEBAUTHN][REGISTER] error.cause:', error.cause);
        if (error.cause instanceof DOMException) {
          console.error('[WEBAUTHN][REGISTER] cause DOMException name:', error.cause.name);
          console.error('[WEBAUTHN][REGISTER] cause DOMException message:', error.cause.message);
          console.error('[WEBAUTHN][REGISTER] cause DOMException code:', error.cause.code);
        }
      }

      if (publicKeyCredential && uvpaa === false) {
        throw new BiometricError(
          'unavailable',
          'The browser supports WebAuthn, but Android is not exposing a local platform authenticator on this device. This is why Credential Manager is offering NFC/USB/external-device security keys instead of fingerprint.'
        );
      }

      const { kind, message } = classifyRegisterError(error, uvpaa);
      throw new BiometricError(kind, message);
    } finally {
      if (patchedCreate && originalCreate) {
        (navigator.credentials as any).create = originalCreate;
      }
    }
  }

  /**
   * Verify biometric credential
   */
  async verify(): Promise<boolean> {
    try {
      console.log('[WEBAUTHN][AUTHENTICATE] START');
      console.log('[WEBAUTHN][AUTHENTICATE] origin:', window.location.origin);
      console.log('[WEBAUTHN][AUTHENTICATE] hostname:', window.location.hostname);
      console.log('[WEBAUTHN][AUTHENTICATE] PublicKeyCredential:', !!window.PublicKeyCredential);
      console.log('[WEBAUTHN][AUTHENTICATE] navigator.credentials:', !!navigator.credentials);

      console.log('[WEBAUTHN][AUTHENTICATE] POST /webauthn/authenticate/options');
      const optionsResponse = await apiRequest('/webauthn/authenticate/options', 'POST');
      console.log('[WEBAUTHN][AUTHENTICATE] options response status:', 200);

      const options = optionsResponse.data;

      console.log('[WEBAUTHN][AUTHENTICATE] authenticate options:', JSON.stringify(options, (_key, value) => {
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
          return `[${value.constructor.name} ${value.byteLength} bytes]`;
        }
        return value;
      }, 2));

      console.log('[WEBAUTHN][AUTHENTICATE] calling navigator.credentials.get');
      const authResponse = await startAuthentication({ optionsJSON: options as any });

      console.log('[WEBAUTHN][AUTHENTICATE] credential retrieved:', authResponse);

      console.log('[WEBAUTHN][AUTHENTICATE] POST /webauthn/authenticate/verify');
      const verifyResponse = await apiRequest('/webauthn/authenticate/verify', 'POST', authResponse);
      console.log('[WEBAUTHN][AUTHENTICATE] verify response:', verifyResponse);

      return verifyResponse.success;
    } catch (error: any) {
      console.error('[WEBAUTHN][AUTHENTICATE] FAILED:', error);

      if (error instanceof DOMException) {
        console.error('[WEBAUTHN][AUTHENTICATE] DOMException name:', error.name);
        console.error('[WEBAUTHN][AUTHENTICATE] DOMException message:', error.message);
      }

      if (error?.name) console.error('[WEBAUTHN][AUTHENTICATE] error.name:', error.name);
      if (error?.message) console.error('[WEBAUTHN][AUTHENTICATE] error.message:', error.message);

      const uvpaa = this.lastCapability?.platformAuthenticatorResult ?? null;
      const { kind, message } = classifyAuthError(error, uvpaa);
      throw new BiometricError(kind, message);
    }
  }
}

export const biometricService = new BiometricService();