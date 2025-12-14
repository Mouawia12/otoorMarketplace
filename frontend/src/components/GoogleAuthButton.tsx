import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuthStore, User } from '../store/authStore';
import googleAuthConfig from '../utils/googleAuthConfig';

type Props = {
  onLoggedIn?: (user: User) => void | Promise<void>;
  role?: 'buyer' | 'seller';
};

export function GoogleAuthButton({ onLoggedIn, role }: Props) {
  const { t } = useTranslation();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const currentOrigin = googleAuthConfig.currentOrigin;
  const originAllowed = googleAuthConfig.originAllowed;
  const googleEnabled = googleAuthConfig.isEnabled;

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError(t('auth.googleError', 'فشل تسجيل الدخول عبر جوجل'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = await loginWithGoogle(credentialResponse.credential, role);
      await onLoggedIn?.(user);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.message;
      setError(detail ?? t('auth.googleError', 'فشل تسجيل الدخول عبر جوجل'));
    } finally {
      setLoading(false);
    }
  };

  const handleError = () => {
    setError(t('auth.googleError', 'فشل تسجيل الدخول عبر جوجل'));
  };

  if (!originAllowed && currentOrigin) {
    return (
      <div className="w-full rounded-luxury border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t('auth.googleOriginMismatch', {
          origin: currentOrigin,
          defaultValue:
            'يجب إضافة {{origin}} إلى المصادر المصرح بها في Google OAuth أو تحديث VITE_GOOGLE_ALLOWED_ORIGINS.',
        })}
      </div>
    );
  }

  if (!googleEnabled) {
    return null;
  }

  return (
    <div className="space-y-2 flex flex-col items-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        text="continue_with"
        shape="pill"
        logo_alignment="left"
        type="standard"
        locale={t('lang', 'ar') === 'ar' ? 'ar' : 'en'}
        width="320"
      />
      {loading && <p className="text-sm text-charcoal-light">{t('common.loading')}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
