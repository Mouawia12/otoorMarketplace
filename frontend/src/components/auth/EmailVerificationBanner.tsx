import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

const HIDDEN_PATH_PREFIXES = ['/verify-email', '/login', '/register'];

export default function EmailVerificationBanner() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const resendVerification = useAuthStore((s) => s.resendVerification);

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const hiddenForPath = useMemo(
    () => HIDDEN_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname],
  );

  if (!isAuthenticated || !user || user.email_verified !== false || hiddenForPath) {
    return null;
  }

  const redirectTarget = `${location.pathname}${location.search}`;
  const verifyLink = `/verify-email/sent?email=${encodeURIComponent(
    user.email,
  )}&redirect=${encodeURIComponent(redirectTarget)}`;

  const handleResend = async () => {
    if (sending) return;
    try {
      setSending(true);
      setError('');
      setMessage('');
      await resendVerification(user.email, redirectTarget);
      setMessage(t('auth.resendVerificationSuccess', 'تم إرسال رابط جديد إلى بريدك'));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const responseMessage = err?.response?.data?.message;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (typeof responseMessage === 'string') {
        setError(responseMessage);
      } else {
        setError(t('common.error'));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-4">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 px-4 sm:px-6 py-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-bold text-amber-900">
              {t('auth.emailNotVerifiedTitle', 'بريدك الإلكتروني غير مُفعّل')}
            </p>
            <p className="text-xs sm:text-sm text-amber-900/80">
              {t(
                'auth.emailNotVerifiedDesc',
                'فعّل بريدك الآن لحماية حسابك وتفعيل كامل الميزات',
              )}
            </p>
            {(message || error) && (
              <p className={`text-xs font-semibold ${error ? 'text-red-600' : 'text-emerald-600'}`}>
                {error || message}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:justify-end">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? t('common.loading') : t('auth.resendVerification', 'إعادة إرسال رابط التفعيل')}
            </button>
            <Link
              to={verifyLink}
              className="px-4 py-2.5 rounded-xl border border-amber-200 text-amber-900 text-sm font-semibold hover:bg-amber-100/60 transition text-center"
            >
              {t('auth.completeVerification', 'إكمال التفعيل')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
