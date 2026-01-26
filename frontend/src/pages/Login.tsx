import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore, User } from '../store/authStore';
import { useState } from 'react';
import api from '../lib/api';
import { clearPendingOrder, loadPendingOrder } from '../utils/pendingOrder';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { resolvePostAuthRoute } from '../utils/authNavigation';
import googleAuthConfig from '../utils/googleAuthConfig';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const [processingPending, setProcessingPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const showGoogleSection = googleAuthConfig.hasClientId;
  const resetSuccess = new URLSearchParams(location.search).get('reset') === 'success';
  const redirectParam = new URLSearchParams(location.search).get('redirect');

  const loginSchema = z.object({
    email: z.string().email(t('auth.errors.emailInvalid', 'يرجى إدخال بريد إلكتروني صحيح')),
    password: z
      .string()
      .min(6, t('auth.errors.passwordMinLogin', 'كلمة المرور يجب ألا تقل عن 6 أحرف')),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const emailValue = watch('email');
  const showVerificationHelp = error.includes('تفعيل');
  const verifyLink = `/verify-email/sent?email=${encodeURIComponent(emailValue ?? '')}${
    redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''
  }`;

  const tryCompletePendingOrder = async () => {
    const pending = loadPendingOrder();
    if (!pending) return false;

    try {
      setProcessingPending(true);
      const response = await api.post('/orders', pending);
      const paymentUrl = response.data?.payment_url;
      clearPendingOrder();
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return true;
      }
      navigate(`/order/success?orderId=${response.data.id}`, { replace: true });
      return true;
    } catch (err: any) {
      clearPendingOrder();
      const detail = err?.response?.data?.message || err?.response?.data?.detail;
      setError(detail ?? t('checkout.orderFailed'));
      return false;
    } finally {
      setProcessingPending(false);
    }
  };

  const postLoginNavigation = async (user: User) => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');
    const target = resolvePostAuthRoute(user, redirectParam);

    const handled = await tryCompletePendingOrder();
    if (!handled) {
      navigate(target, { replace: true });
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      const user = await login(data.email, data.password);
      await postLoginNavigation(user);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError(t('auth.invalidCredentials'));
        return;
      }
      if (status === 403) {
        const message = err.response?.data?.message || err.response?.data?.detail;
        if (typeof message === 'string' && message.toLowerCase().includes('suspend')) {
          setError(t('auth.suspendedAccount', 'تم تعليق حسابك. يرجى التواصل مع الدعم.'));
        } else if (typeof message === 'string') {
          setError(message);
        } else {
          setError(t('auth.suspendedAccount', 'تم تعليق حسابك. يرجى التواصل مع الدعم.'));
        }
        return;
      }
      const detail = err.response?.data?.detail;
      const message = err.response?.data?.message;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else if (typeof message === 'string') {
        setError(message);
      } else {
        setError(t('common.error'));
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-white via-[#F9F6EF] to-white">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur border border-black/5 p-8 md:p-10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-charcoal">{t('auth.loginTitle')}</h2>
            <p className="text-sm text-taupe">
              {t('auth.loginSubtitle', 'سجل دخولك وتابع طلباتك بسهولة')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
              {showVerificationHelp && (
                <div className="mt-2">
                  <Link to={verifyLink} className="font-semibold underline underline-offset-2">
                    {t('auth.resendVerification', 'إعادة إرسال رابط التفعيل')}
                  </Link>
                </div>
              )}
            </div>
          )}
          {resetSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
              {t('auth.resetPasswordLoginMessage')}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-charcoal font-medium">{t('auth.email')}</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder={t('auth.placeholders.email', 'example@email.com')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-gold/60 focus:border-gold/40 focus:outline-none transition"
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-charcoal font-medium">{t('auth.password')}</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder={t('auth.placeholders.password', 'أدخل كلمة المرور')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-gold/60 focus:border-gold/40 focus:outline-none transition pe-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 end-0 px-3 text-sm text-taupe hover:text-charcoal transition"
                  aria-label={
                    showPassword
                      ? t('auth.hidePassword', 'إخفاء كلمة المرور')
                      : t('auth.showPassword', 'إظهار كلمة المرور')
                  }
                >
                  {showPassword ? t('auth.hide', 'إخفاء') : t('auth.show', 'إظهار')}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-gold hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || processingPending}
              className="w-full bg-gold text-charcoal font-semibold py-3 rounded-xl hover:bg-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting || processingPending ? t('common.loading') : t('common.login')}
            </button>
          </form>

          {showGoogleSection && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-charcoal-light">
                <span className="flex-1 h-px bg-gray-200" />
                <span>{t('auth.loginWithGoogle', 'أو المتابعة عبر جوجل')}</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
              <GoogleAuthButton onLoggedIn={postLoginNavigation} />
            </div>
          )}

          <p className="text-center text-charcoal-light text-sm">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-gold hover:underline font-semibold">
              {t('common.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
