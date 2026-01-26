import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export default function VerifyEmailSentPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const resendVerification = useAuthStore((s) => s.resendVerification);

  const { initialEmail, redirect } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      initialEmail: params.get('email') ?? '',
      redirect: params.get('redirect') ?? '',
    };
  }, [location.search]);

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setEmailInput(initialEmail);
  }, [initialEmail]);

  const handleResend = async () => {
    const targetEmail = emailInput.trim();
    if (!targetEmail || sending) return;
    try {
      setSending(true);
      setError('');
      setMessage('');
      await resendVerification(targetEmail, redirect || undefined);
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white via-[#F9F6EF] to-white">
      <div className="w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur border border-black/5 p-8 md:p-10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gold text-charcoal grid place-items-center text-2xl font-bold shadow-sm">
            ✉️
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-charcoal">
              {t('auth.verifyEmailSentTitle', 'تحقق من بريدك الإلكتروني')}
            </h1>
            <p className="text-sm text-taupe">
              {t('auth.verifyEmailSentDesc', 'أرسلنا لك رابط تفعيل الحساب')}
            </p>
            <div className="space-y-2 text-right">
              <label className="block text-xs font-semibold text-taupe">
                {t('auth.email', 'البريد الإلكتروني')}
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={t('auth.placeholders.email', 'example@email.com')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-gold/60 focus:border-gold/40 focus:outline-none transition"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={!emailInput.trim() || sending}
              className="w-full bg-gold text-charcoal font-semibold py-3 rounded-xl hover:bg-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {sending
                ? t('common.loading')
                : t('auth.resendVerification', 'إعادة إرسال رابط التفعيل')}
            </button>

            <Link
              to="/login"
              className="block w-full border border-gray-200 text-charcoal font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
            >
              {t('auth.verifyEmailCtaLogin', 'العودة لتسجيل الدخول')}
            </Link>
          </div>

          {message && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-taupe">
            {t(
              'auth.verifyEmailSentHint',
              'افتح الرسالة واضغط على زر التفعيل. إذا لم تجد الرسالة، تحقق من البريد غير الهام',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
