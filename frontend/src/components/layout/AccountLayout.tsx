import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';

export default function AccountLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/account', label: t('account.overview'), icon: '👤' },
    { path: '/account/profile', label: t('account.editProfile'), icon: '✏️' },
    { path: '/account/orders', label: t('account.orders'), icon: '📦' },
    { path: '/account/bids', label: t('account.bids'), icon: '🔨' },
    { path: '/account/favorites', label: t('account.favorites'), icon: '❤️' },
    { path: '/account/change-password', label: t('account.updatePassword', 'تغيير كلمة السر'), icon: '🔑' },
    { path: '/account/support', label: t('account.support'), icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-ivory">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden bg-charcoal text-ivory px-4 py-3 rounded-luxury min-h-[44px] font-semibold"
          >
            {sidebarOpen ? t('common.close') : t('account.menu')}
          </button>

          {/* Sidebar Navigation */}
          <aside
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block w-full lg:w-64 flex-shrink-0`}
          >
            <div className="bg-white rounded-luxury p-4 sm:p-6 shadow-luxury">
              <h2 className="text-lg sm:text-xl font-semibold text-charcoal mb-4 sm:mb-6">{t('account.myAccount')}</h2>
              <nav className="space-y-1 sm:space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/account'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 sm:px-4 py-3 rounded-luxury transition min-h-[44px] ${
                        isActive
                          ? 'bg-gold text-charcoal font-semibold'
                          : 'text-charcoal-light hover:bg-sand'
                      }`
                    }
                  >
                    <span className="text-lg sm:text-xl">{item.icon}</span>
                    <span className="text-sm sm:text-base">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
