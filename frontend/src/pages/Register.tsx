import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, User } from '../store/authStore';
import { useState } from 'react';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { resolvePostAuthRoute } from '../utils/authNavigation';
import googleAuthConfig from '../utils/googleAuthConfig';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const showGoogleSection = googleAuthConfig.hasClientId;

  const registerSchema = z.object({
    full_name: z
      .string()
      .min(3, t('auth.errors.fullNameMin', 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل')),
    email: z.string().email(t('auth.errors.emailInvalid', 'يرجى إدخال بريد إلكتروني صحيح')),
    password: z
      .string()
      .min(8, t('auth.errors.passwordMin', 'كلمة المرور يجب ألا تقل عن 8 أحرف')),
    termsAccepted: z.literal(true, {
      errorMap: () => ({
        message: t('auth.errors.termsRequired', 'يجب الموافقة على الشروط والأحكام'),
      }),
    }),
  });

  type RegisterForm = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const redirectAfterSignup = (user: User) => {
    const target = resolvePostAuthRoute(user);
    navigate(target, { replace: true });
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError('');
      // نرسل فقط الحقول المطلوبة
      const result = await registerUser({
        fullName: data.full_name,
        email: data.email,
        password: data.password,
        roles: ['BUYER'],
      });
      if (result.user) {
        redirectAfterSignup(result.user);
        return;
      }
      const targetEmail = result.email ?? data.email;
      navigate(`/verify-email/sent?email=${encodeURIComponent(targetEmail)}`, {
        replace: true,
      });
    } catch (err: any) {
      const response = err?.response?.data;
      const detail = response?.detail;
      const message = response?.message;
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
            <h2 className="text-3xl font-bold text-charcoal">{t('auth.registerTitle')}</h2>
            <p className="text-sm text-taupe">
              {t('auth.registerSubtitle', 'أنشئ حسابك وابدأ البيع والشراء بثقة')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* الاسم الكامل */}
            <div className="space-y-2">
              <label className="block text-charcoal font-medium">
                {t('auth.fullName', 'الاسم الكامل')}
              </label>
              <input
                {...register('full_name')}
                type="text"
                autoComplete="name"
                placeholder={t('auth.placeholders.fullName', 'مثال: محمد أحمد')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-gold/60 focus:border-gold/40 focus:outline-none transition"
              />
              {errors.full_name && (
                <p className="text-red-500 text-sm">{errors.full_name.message}</p>
              )}
            </div>
            {/* البريد الإلكتروني */}
            <div className="space-y-2">
              <label className="block text-charcoal font-medium">{t('auth.email')}</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder={t('auth.placeholders.email', 'example@email.com')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-gold/60 focus:border-gold/40 focus:outline-none transition"
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            {/* كلمة المرور */}
            <div className="space-y-2">
              <label className="block text-charcoal font-medium">{t('auth.password')}</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder={t('auth.placeholders.password', 'أدخل كلمة مرور قوية')}
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
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            {/* الشروط والأحكام */}
            <div>
              <label className="flex items-start gap-2 text-sm text-charcoal">
                <input
                  {...register('termsAccepted')}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-gold focus:ring-gold"
                />
                <span>
                  {t('auth.termsPrefix', 'أوافق على')}{' '}
                  <Link to="/terms" className="text-gold hover:underline font-semibold">
                    {t('auth.termsLink', 'الشروط والأحكام')}
                  </Link>
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="text-red-500 text-sm mt-1">{errors.termsAccepted.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gold text-charcoal font-semibold py-3 rounded-xl hover:bg-gold-light transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? t('common.loading') : t('common.register')}
            </button>
          </form>

          {showGoogleSection && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-charcoal-light">
                <span className="flex-1 h-px bg-gray-200" />
                <span>{t('auth.loginWithGoogle', 'أو المتابعة عبر جوجل')}</span>
                <span className="flex-1 h-px bg-gray-200" />
              </div>
              <GoogleAuthButton onLoggedIn={redirectAfterSignup} />
            </div>
          )}

          <p className="text-center text-charcoal-light text-sm">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-gold hover:underline font-semibold">
              {t('common.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
