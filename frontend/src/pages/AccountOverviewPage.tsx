import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

interface AccountStats {
  totalOrders: number;
  activeBids: number;
  favoritesCount: number;
}

interface UserProfile {
  name: string;
  email: string;
  joinDate: string;
}

export default function AccountOverviewPage() {
  const { t, i18n } = useTranslation();
  const { user, fetchUser } = useAuthStore();
  const [stats, setStats] = useState<AccountStats>({ totalOrders: 0, activeBids: 0, favoritesCount: 0 });
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const load = async () => {
      await fetchUser();
      const enableCounts = import.meta.env.VITE_ENABLE_ACCOUNT_COUNTS === 'true';
      if (!enableCounts) return;
      try {
        const [ordersRes, bidsRes, favoritesRes] = await Promise.allSettled([
          api.get('/orders/count'),
          api.get('/auctions/active/count'),
          api.get('/wishlist/count'),
        ]);

        setStats({
          totalOrders: ordersRes.status === 'fulfilled' ? ordersRes.value.data.count ?? 0 : 0,
          activeBids: bidsRes.status === 'fulfilled' ? bidsRes.value.data.count ?? 0 : 0,
          favoritesCount: favoritesRes.status === 'fulfilled' ? favoritesRes.value.data.count ?? 0 : 0,
        });
      } catch {
        // ignore, defaults to 0
      }
    };

    load();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.full_name,
      email: user.email,
      joinDate: user.created_at ?? new Date().toISOString(),
    });
  }, [user]);

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-h2 text-charcoal mb-2">{t('account.overview')}</h1>
            <p className="text-taupe">{t('account.welcomeBack')}, {profile.name}</p>
          </div>
          <Link
            to="/account/profile"
            className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            {t('account.editProfile')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          <div>
            <p className="text-taupe text-sm mb-1">{t('account.fullName')}</p>
            <p className="text-charcoal font-semibold">{profile.name}</p>
          </div>
          <div>
            <p className="text-taupe text-sm mb-1">{t('account.email')}</p>
            <p className="text-charcoal font-semibold">{profile.email}</p>
          </div>
          <div>
            <p className="text-taupe text-sm mb-1">{t('account.memberSince')}</p>
            <p className="text-charcoal font-semibold">
              {new Date(profile.joinDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/account/orders"
          className="bg-white rounded-luxury p-6 shadow-luxury hover:shadow-luxury-hover transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold bg-opacity-20 rounded-luxury flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-charcoal">{stats.totalOrders}</p>
              <p className="text-taupe">{t('account.totalOrders')}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/account/bids"
          className="bg-white rounded-luxury p-6 shadow-luxury hover:shadow-luxury-hover transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold bg-opacity-20 rounded-luxury flex items-center justify-center">
              <span className="text-2xl">🔨</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-charcoal">{stats.activeBids}</p>
              <p className="text-taupe">{t('account.activeBids')}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/account/favorites"
          className="bg-white rounded-luxury p-6 shadow-luxury hover:shadow-luxury-hover transition"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold bg-opacity-20 rounded-luxury flex items-center justify-center">
              <span className="text-2xl">❤️</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-charcoal">{stats.favoritesCount}</p>
              <p className="text-taupe">{t('account.favorites')}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Removed placeholder modal */}
    </div>
  );
}
