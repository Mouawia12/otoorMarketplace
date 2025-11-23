import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export default function AccountProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatar, setAvatar] = useState(user?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      setLoading(true);
      await updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        avatar_url: avatar || undefined,
      });
      setMessage(t('common.saved', 'تم الحفظ بنجاح'));
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? t('common.error', 'حدث خطأ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-6">{t('account.editProfile')}</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1">{t('account.fullName', 'الاسم الكامل')}</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
            required
            minLength={2}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1">{t('account.email')}</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full border border-sand/60 rounded-luxury px-3 py-3 bg-sand/30 text-charcoal outline-none cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t('account.phone', 'رقم الهاتف')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="+9665xxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t('account.avatar', 'رابط الصورة')}</label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder="https://..."
            />
          </div>
        </div>

        {message && <p className="text-sm text-success font-semibold">{message}</p>}
        {error && <p className="text-sm text-alert font-semibold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-gold text-charcoal rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-60"
        >
          {loading ? t('common.loading') : t('common.save', 'حفظ')}
        </button>
      </form>
    </div>
  );
}
