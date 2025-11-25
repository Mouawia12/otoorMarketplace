import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore, User } from '../store/authStore';
import { useState } from 'react';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { resolvePostAuthRoute } from '../utils/authNavigation';

// نُبقي فقط البريد وكلمة المرور
const registerSchema = z.object({
  full_name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const [error, setError] = useState('');
  const [accountType, setAccountType] = useState<'buyer' | 'seller'>('buyer');
  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

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
      const user = await registerUser({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        roles: accountType === 'seller' ? ['SELLER'] : ['BUYER'],
      } as any);
      redirectAfterSignup(user);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((e: any) => e.msg).join(', '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError(t('common.error'));
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white p-8 rounded-luxury shadow-luxury-lg">
        <h2 className="text-3xl font-bold text-charcoal mb-6 text-center">
          {t('auth.registerTitle')}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-luxury mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="accountType"
                value="buyer"
                checked={accountType === 'buyer'}
                onChange={() => setAccountType('buyer')}
              />
              {t('auth.accountTypeBuyer', 'حساب مشتري')}
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal">
              <input
                type="radio"
                name="accountType"
                value="seller"
                checked={accountType === 'seller'}
                onChange={() => setAccountType('seller')}
              />
              {t('auth.accountTypeSeller', 'حساب تاجر')}
            </label>
          </div>
          {/* الاسم الكامل */}
          <div>
            <label className="block text-charcoal font-medium mb-2">
              {t('auth.fullName', 'الاسم الكامل')}
            </label>
            <input
              {...register('full_name')}
              type="text"
              autoComplete="name"
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>
          {/* البريد الإلكتروني */}
          <div>
            <label className="block text-charcoal font-medium mb-2">
              {t('auth.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-charcoal font-medium mb-2">
              {t('auth.password')}
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('common.register')}
          </button>
        </form>

        {hasGoogleClient && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-charcoal-light">
              <span className="flex-1 h-px bg-gray-200" />
              <span>{t('auth.loginWithGoogle', 'أو المتابعة عبر جوجل')}</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <GoogleAuthButton
              role={accountType}
              onLoggedIn={redirectAfterSignup}
            />
          </div>
        )}

        <p className="text-center mt-6 text-charcoal-light">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-gold hover:underline">
            {t('common.login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
