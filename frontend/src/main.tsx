import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import './i18n/config';
import i18n from './i18n/config';
import './pwa/registerPwaAssets';

// Set initial RTL/LTR direction based on language
const initialLang = i18n.language || 'ar';
document.documentElement.setAttribute('dir', initialLang === 'ar' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', initialLang);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Root = () => (
  <React.StrictMode>
    <HelmetProvider>
      {googleClientId ? (
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
