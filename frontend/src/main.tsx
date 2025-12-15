import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import './i18n/config';
import i18n from './i18n/config';
import './pwa/registerPwaAssets';
import googleAuthConfig from './utils/googleAuthConfig';

// Set initial RTL/LTR direction based on language
const initialLang = i18n.language || 'ar';
document.documentElement.setAttribute('dir', initialLang === 'ar' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', initialLang);

// Enable Socket.IO client debug logging for diagnostics
if (typeof window !== 'undefined') {
  try {
    localStorage.setItem('debug', 'socket.io-client:*');
  } catch {
    // ignore if storage is unavailable
  }
}

const googleClientId = googleAuthConfig.clientId;
const googleLoginEnabled = googleAuthConfig.isEnabled;

if (googleAuthConfig.hasClientId && !googleAuthConfig.originAllowed && googleAuthConfig.currentOrigin) {
  console.warn(
    `[google-auth] Current origin (${googleAuthConfig.currentOrigin}) is not listed in VITE_GOOGLE_ALLOWED_ORIGINS. Google login widget disabled.`,
  );
}

const Root = () => (
  <React.StrictMode>
    <HelmetProvider>
      {googleLoginEnabled ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </HelmetProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
