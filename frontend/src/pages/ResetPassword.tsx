import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white p-8 rounded-luxury shadow-luxury-lg text-center space-y-4">
          <h2 className="text-2xl font-bold text-charcoal">{t('auth.resetPasswordTitle')}</h2>
          <p className="text-charcoal-light">{t('auth.resetPasswordMissingToken')}</p>
          <Link to="/forgot-password" className="text-gold hover:underline">
            {t('auth.requestAnotherLink')}
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: ResetPasswordForm) => {
    try {
      setStatus(null);
      setMessage('');
      await api.post('/auth/reset-password', {
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setStatus('success');
      setMessage(t('auth.resetPasswordSuccess'));
      reset();
      redirectTimeout.current = setTimeout(() => {
        navigate('/login?reset=success', { replace: true });
      }, 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.message || t('common.error');
      setStatus('error');
      setMessage(detail);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white p-8 rounded-luxury shadow-luxury-lg">
        <h2 className="text-3xl font-bold text-charcoal mb-4 text-center">
          {t('auth.resetPasswordTitle')}
        </h2>
        <p className="text-sm text-charcoal-light text-center mb-6">
          {t('auth.resetPasswordDescription')}
        </p>

        {status && (
          <div
            className={`px-4 py-3 rounded-luxury mb-4 ${
              status === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-charcoal font-medium mb-2">{t('auth.newPassword')}</label>
            <input
              type="password"
              {...register('password')}
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-charcoal font-medium mb-2">{t('auth.confirmNewPassword')}</label>
            <input
              type="password"
              {...register('confirmPassword')}
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword.type === 'custom'
                  ? t('auth.passwordMismatch', 'كلمتا المرور غير متطابقتين')
                  : errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('auth.resetPasswordButton')}
          </button>
        </form>

        <p className="text-center mt-6 text-charcoal-light">
          <Link to="/login" className="text-gold hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
