import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

const OAUTH_CLIENT_ID = (firebaseConfig as any).oAuthClientId || '386922011945-oi6jap6175lm48h92h41g328dof098me.apps.googleusercontent.com';
const STORAGE_KEY = 'huso_google_user_info';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'email',
  'profile',
  'openid',
].join(' ');

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://mail.google.com/');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface GoogleUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  accessToken: string;
  expiresAt?: number;
}

/**
 * Retrieves saved Google user info from localStorage if present and valid.
 */
export const getStoredGoogleUser = (): GoogleUserInfo | null => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed: GoogleUserInfo = JSON.parse(saved);
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    cachedAccessToken = parsed.accessToken;
    return parsed;
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/**
 * Saves Google user info into localStorage and memory cache.
 */
const saveGoogleUser = (userInfo: GoogleUserInfo) => {
  cachedAccessToken = userInfo.accessToken;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo));
};

export const initAuthListener = (
  onSuccess: (userInfo: GoogleUserInfo) => void,
  onFailure: () => void
) => {
  // Check localStorage first
  const stored = getStoredGoogleUser();
  if (stored) {
    onSuccess(stored);
  }

  // Also sync with Firebase Auth state
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      const userInfo: GoogleUserInfo = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        accessToken: cachedAccessToken,
      };
      saveGoogleUser(userInfo);
      onSuccess(userInfo);
    } else if (!stored && !isSigningIn) {
      onFailure();
    }
  });
};

/**
 * Ensure Google Identity Services SDK script is loaded.
 */
const ensureGsiLoaded = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window is not defined'));
    if ((window as any).google?.accounts?.oauth2) {
      return resolve();
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      if ((window as any).google?.accounts?.oauth2) {
        return resolve();
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script')));
      setTimeout(() => {
        if ((window as any).google?.accounts?.oauth2) resolve();
        else reject(new Error('Google Identity Services timeout'));
      }, 3500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });
};

/**
 * Prompt OAuth using Google Identity Services (GIS) Token Client.
 * Works seamlessly across both preview iframe and external domain links.
 */
const signInWithGSI = async (): Promise<GoogleUserInfo> => {
  await ensureGsiLoaded();

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services SDK is loading. Please try again in a moment.'));
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            if (
              response.error === 'access_denied' ||
              response.error === 'popup_closed' ||
              response.error === 'user_cancelled'
            ) {
              return resolve(null as any);
            }
            return reject(new Error(`Google OAuth: ${response.error}`));
          }
          if (!response.access_token) {
            return resolve(null as any);
          }

          const accessToken = response.access_token;
          const expiresIn = response.expires_in ? parseInt(response.expires_in, 10) * 1000 : 3600000;
          const expiresAt = Date.now() + expiresIn;

          try {
            // Fetch user profile from Google UserInfo endpoint
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            let displayName = 'ผู้ใช้งาน Google';
            let email = 'user@huso.edu.th';
            let photoURL = null;
            let uid = `gsi-${Date.now()}`;

            if (profileRes.ok) {
              const profileData = await profileRes.json();
              uid = profileData.sub || uid;
              displayName = profileData.name || displayName;
              email = profileData.email || email;
              photoURL = profileData.picture || null;
            }

            const userInfo: GoogleUserInfo = {
              uid,
              displayName,
              email,
              photoURL,
              accessToken,
              expiresAt,
            };

            saveGoogleUser(userInfo);
            resolve(userInfo);
          } catch (err) {
            // Fallback user info if profile fetch fails
            const userInfo: GoogleUserInfo = {
              uid: `gsi-${Date.now()}`,
              displayName: 'ผู้ใช้งาน Google',
              email: 'google-user@huso.edu.th',
              photoURL: null,
              accessToken,
              expiresAt,
            };
            saveGoogleUser(userInfo);
            resolve(userInfo);
          }
        },
        error_callback: (err: any) => {
          const type = err?.type || '';
          const msg = (err?.message || '').toLowerCase();
          // Check if popup was closed by user or cancelled
          if (
            type === 'popup_closed' ||
            type === 'user_cancel' ||
            type === 'cancelled' ||
            msg.includes('closed') ||
            msg.includes('cancel')
          ) {
            // Resolve null gracefully when user closes the popup
            resolve(null as any);
            return;
          }
          reject(new Error(`Google Popup: ${err.message || err.type || 'Pop-up failed'}`));
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(err);
    }
  });
};

export const signInWithGoogle = async (): Promise<GoogleUserInfo | null> => {
  isSigningIn = true;
  try {
    // Priority 1: Try Google Identity Services (GIS) token client first (works outside iframe & cross-domain)
    try {
      const gsiUser = await signInWithGSI();
      if (gsiUser) {
        return gsiUser;
      }
      // If user closed popup/cancelled, resolve cleanly with null
      return null;
    } catch (gsiErr: any) {
      const msg = (gsiErr?.message || '').toLowerCase();
      if (msg.includes('closed') || msg.includes('cancel') || msg.includes('denied')) {
        return null;
      }
      console.warn('GIS Token Client fallback to Firebase popup:', gsiErr);
    }

    // Priority 2: Fallback to Firebase Auth signInWithPopup
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to retrieve OAuth access token');
      }

      const userInfo: GoogleUserInfo = {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        accessToken: credential.accessToken,
      };

      saveGoogleUser(userInfo);
      return userInfo;
    } catch (fbErr: any) {
      if (
        fbErr?.code === 'auth/popup-closed-by-user' ||
        fbErr?.code === 'auth/cancelled-popup-request' ||
        (fbErr?.message && fbErr.message.toLowerCase().includes('closed'))
      ) {
        return null;
      }
      throw fbErr;
    }
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      (error?.message && (error.message.toLowerCase().includes('closed') || error.message.toLowerCase().includes('cancel')))
    ) {
      return null;
    }
    console.warn('Google Sign-In notice:', error?.message || error);
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error('โดเมนนี้ยังไม่ได้เพิ่มใน Firebase Authorized Domains');
    } else if (error?.code === 'auth/popup-blocked') {
      throw new Error('เบราว์เซอร์บล็อกหน้าต่าง Pop-up กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้แล้วลองใหม่อีกครั้ง');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const stored = getStoredGoogleUser();
  return stored ? stored.accessToken : null;
};

export const isAuthExpiredError = (err: any): boolean => {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
  return (
    msg.includes('401') ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('invalid authentication credentials') ||
    msg.includes('Invalid Credentials') ||
    msg.includes('authError') ||
    msg.includes('GOOGLE_AUTH_EXPIRED')
  );
};

export const handleInvalidAuthToken = async () => {
  cachedAccessToken = null;
  localStorage.removeItem(STORAGE_KEY);
  try {
    await signOut(auth);
  } catch (e) {
    // Ignore signout error
  }
};

export const googleLogout = handleInvalidAuthToken;



