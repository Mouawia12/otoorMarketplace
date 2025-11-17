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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const [processingPending, setProcessingPending] = useState(false);
  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const tryCompletePendingOrder = async () => {
    const pending = loadPendingOrder();
    if (!pending) return false;

    try {
      setProcessingPending(true);
      const response = await api.post('/orders', pending);
      clearPendingOrder();
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
    const upperRoles = (user.roles ?? []).map((role) => role.toUpperCase());
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');

    let target = redirectParam || '/account';
    if (upperRoles.includes('SUPER_ADMIN') || upperRoles.includes('ADMIN')) {
      target = redirectParam || '/admin/dashboard';
    } else if (upperRoles.includes('SELLER')) {
      target = redirectParam || '/seller/dashboard';
    }

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
      const detail = err.response?.data?.detail;
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
          {t('auth.loginTitle')}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-luxury mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-charcoal font-medium mb-2">
              {t('auth.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-charcoal font-medium mb-2">
              {t('auth.password')}
            </label>
            <input
              {...register('password')}
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || processingPending}
            className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50"
          >
            {isSubmitting || processingPending ? t('common.loading') : t('common.login')}
          </button>
        </form>

        {hasGoogleClient && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-charcoal-light">
              <span className="flex-1 h-px bg-gray-200" />
              <span>{t('auth.loginWithGoogle', 'أو المتابعة عبر جوجل')}</span>
              <span className="flex-1 h-px bg-gray-200" />
            </div>
            <GoogleAuthButton onLoggedIn={postLoginNavigation} />
          </div>
        )}

        <p className="text-center mt-6 text-charcoal-light">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-gold hover:underline">
            {t('common.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
