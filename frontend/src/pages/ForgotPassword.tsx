import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import api from '../lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  const onSubmit = async (values: ForgotPasswordForm) => {
    try {
      setStatus(null);
      setMessage('');
      await api.post('/auth/forgot-password', values);
      setStatus('success');
      setMessage(t('auth.resetLinkSent'));
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
          {t('auth.forgotPasswordTitle')}
        </h2>
        <p className="text-sm text-charcoal-light text-center mb-6">
          {t('auth.forgotPasswordDescription')}
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
            <label className="block text-charcoal font-medium mb-2">{t('auth.email')}</label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold text-charcoal font-semibold py-3 rounded-luxury hover:bg-gold-light transition disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('auth.sendResetLink')}
          </button>
        </form>

        <p className="text-center mt-6 text-charcoal-light">
          {t('auth.rememberPassword', 'تذكرت كلمة المرور؟')}{' '}
          <Link to="/login" className="text-gold hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
