import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

type VerifyStatus = 'idle' | 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);

  const { token, redirect } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get('token'),
      redirect: params.get('redirect'),
    };
  }, [location.search]);

  const [status, setStatus] = useState<VerifyStatus>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setStatus('error');
        setError(t('auth.verifyEmailMissingToken', 'رابط التفعيل غير مكتمل'));
        return;
      }

      try {
        setStatus('loading');
        setError('');
        await verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
        }
      } catch (err: any) {
        if (cancelled) return;
        const detail = err?.response?.data?.detail;
        const message = err?.response?.data?.message;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (typeof message === 'string') {
          setError(message);
        } else {
          setError(t('auth.verifyEmailInvalid', 'تعذر التحقق من الرابط، حاول مرة أخرى'));
        }
        setStatus('error');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token, verifyEmail, t]);

  useEffect(() => {
    if (status === 'success') {
      const target = redirect ? decodeURIComponent(redirect) : '/';
      const id = window.setTimeout(() => navigate(target, { replace: true }), 1200);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [status, navigate, redirect]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white via-[#F9F6EF] to-white">
      <div className="w-full max-w-lg">
        <div className="bg-white/95 backdrop-blur border border-black/5 p-8 md:p-10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-black text-white grid place-items-center text-2xl font-bold shadow-sm">
            ✓
          </div>

          {status === 'loading' && (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-charcoal">
                {t('auth.verifyEmailTitle', 'جاري تفعيل حسابك')}
              </h1>
              <p className="text-sm text-taupe">
                {t('auth.verifyEmailSubtitle', 'لحظات ونجهز لك كل شيء')}
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-charcoal">
                {t('auth.verifyEmailSuccessTitle', 'تم تفعيل الحساب بنجاح')}
              </h1>
              <p className="text-sm text-taupe">
                {t('auth.verifyEmailSuccessDesc', 'أهلاً بك! سيتم تحويلك الآن للصفحة الرئيسية')}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-charcoal">
                {t('auth.verifyEmailErrorTitle', 'تعذر تفعيل الحساب')}
              </h1>
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Link
                  to="/verify-email/sent"
                  className="flex-1 bg-gold text-charcoal font-semibold py-3 rounded-xl hover:bg-gold-light transition shadow-sm"
                >
                  {t('auth.resendVerification', 'إعادة إرسال رابط التفعيل')}
                </Link>
                <Link
                  to="/login"
                  className="flex-1 border border-gray-200 text-charcoal font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
                >
                  {t('auth.verifyEmailCtaLogin', 'العودة لتسجيل الدخول')}
                </Link>
              </div>
            </div>
          )}

          {status !== 'error' && (
            <p className="text-xs text-taupe">
              {t('auth.verifyEmailHint', 'إذا طال الانتظار، أعد فتح الرابط من بريدك الإلكتروني')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
