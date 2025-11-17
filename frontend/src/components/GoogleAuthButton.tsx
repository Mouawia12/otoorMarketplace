import { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuthStore, User } from '../store/authStore';

type Props = {
  onLoggedIn?: (user: User) => void | Promise<void>;
  role?: 'buyer' | 'seller';
};

export function GoogleAuthButton({ onLoggedIn, role }: Props) {
  const { t } = useTranslation();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="space-y-2">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap
        text="continue_with"
        shape="pill"
        logo_alignment="left"
        type="standard"
        locale={t('lang', 'ar') === 'ar' ? 'ar' : 'en'}
        width="100%"
      />
      {loading && <p className="text-sm text-charcoal-light">{t('common.loading')}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
