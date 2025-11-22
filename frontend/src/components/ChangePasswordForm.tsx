import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

type Props = {
  onSuccess?: () => void;
};

export function ChangePasswordForm({ onSuccess }: Props) {
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('account.passwordsDontMatch', 'Passwords do not match'));
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      setSuccess(t('account.passwordChanged', 'Password updated successfully'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-luxury">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-luxury">
          {success}
        </div>
      )}

      <div>
        <label className="block text-charcoal font-medium mb-1">
          {t('account.currentPassword', 'Current password')}
        </label>
        <input
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
          required
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="block text-charcoal font-medium mb-1">
          {t('account.newPassword', 'New password')}
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-charcoal font-medium mb-1">
          {t('account.confirmPassword', 'Confirm password')}
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-luxury focus:ring-2 focus:ring-gold focus:border-transparent"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-gold text-charcoal font-semibold px-6 py-3 rounded-luxury hover:bg-gold-hover transition disabled:opacity-60"
      >
        {loading ? t('common.loading') : t('account.updatePassword', 'Update password')}
      </button>
    </form>
  );
}
