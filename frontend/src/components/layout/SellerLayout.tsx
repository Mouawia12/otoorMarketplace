import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SellerLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/seller/dashboard', label: t('seller.dashboard'), icon: '📊' },
    { path: '/seller/products', label: t('seller.products'), icon: '🛍️' },
    { path: '/seller/auctions', label: t('seller.auctions'), icon: '🔨' },
    { path: '/seller/orders', label: t('seller.orders'), icon: '📦' },
    { path: '/seller/earnings', label: t('seller.earnings'), icon: '💰' },
    { path: '/seller/support', label: t('seller.support'), icon: '💬' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden bg-gold text-charcoal px-4 py-3 rounded-luxury min-h-[44px] font-semibold flex items-center justify-center gap-2"
          >
            <span>{sidebarOpen ? '✕' : '☰'}</span>
            <span>{t('seller.sellerPanel')}</span>
          </button>

          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block w-full lg:w-64 flex-shrink-0`}
          >
            <div className="bg-white rounded-luxury p-4 sm:p-6 shadow-luxury">
              <h2 className="text-lg sm:text-xl font-semibold text-charcoal mb-4 sm:mb-6">{t('seller.sellerPanel')}</h2>
              <nav className="space-y-1 sm:space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-luxury transition min-h-[44px] ${
                      isActive(item.path)
                        ? 'bg-gold text-charcoal font-semibold'
                        : 'text-charcoal-light hover:bg-sand hover:text-charcoal'
                    }`}
                  >
                    <span className="text-lg sm:text-xl">{item.icon}</span>
                    <span className="text-sm sm:text-base">{item.label}</span>
                  </Link>
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
