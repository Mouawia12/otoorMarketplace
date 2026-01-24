import { useMemo } from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { hasSubmittedSellerProfile } from '../../utils/authNavigation';
import NotificationBell from '../notifications/NotificationBell';

export default function SellerLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const hasSellerAccess = useMemo(() => {
    const roles = user?.roles ?? [];
    return roles.some((role) => {
      const upper = role.toUpperCase();
      return upper === 'SELLER' || upper === 'ADMIN' || upper === 'SUPER_ADMIN';
    });
  }, [user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasSellerAccess) {
    return <Navigate to="/account" replace />;
  }

  const sellerStatus = user?.seller_status ?? 'pending';
  const hasSubmittedProfile = hasSubmittedSellerProfile(user);
  const isProfileCompleteRoute = location.pathname.includes('/seller/profile-complete');
  const isProfileStatusRoute = location.pathname.includes('/seller/profile-status');
  const isWarehousesRoute = location.pathname.includes('/seller/warehouses');

  if (sellerStatus !== 'approved') {
    if (!hasSubmittedProfile) {
      if (!isProfileCompleteRoute && !isWarehousesRoute) {
        return <Navigate to="/seller/profile-complete" replace />;
      }
    } else if (!isProfileStatusRoute && !isProfileCompleteRoute && !isWarehousesRoute) {
      return <Navigate to="/seller/profile-status" replace />;
    }
  }

  const menuItems = [
    { path: '/', label: t('common.home', 'الرئيسية'), icon: '🏠' },
    { path: '/seller/dashboard', label: t('seller.dashboard'), icon: '📊' },
    { path: '/seller/products', label: t('seller.products'), icon: '🛍️' },
    { path: '/seller/auctions', label: t('seller.auctions'), icon: '🔨' },
    { path: '/seller/orders', label: t('seller.customerOrdersNav', 'طلبات العملاء'), icon: '📦' },
    { path: '/seller/my-orders', label: t('seller.myOrdersNav', 'طلباتي'), icon: '🧾' },
    { path: '/seller/manual-shipments', label: t('seller.manualShipmentsNav', 'طلبات خارجية'), icon: '🚚' },
    { path: '/seller/warehouses', label: t('seller.warehouses', 'العناوين'), icon: '🏬' },
    { path: '/seller/warehouse-management', label: t('seller.warehouseManagement', 'إدارة المستودعات'), icon: '📦' },
    { path: '/seller/coupons', label: t('seller.coupons', 'الكوبونات'), icon: '🏷️' },
    { path: '/seller/profile-status', label: t('seller.status', 'حالة الطلب'), icon: '📄' },
    { path: '/seller/earnings', label: t('seller.earnings'), icon: '💰' },
    { path: '/seller/change-password', label: t('account.updatePassword', 'تغيير كلمة السر'), icon: '🔑' },
    { path: '/seller/support', label: t('seller.support'), icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-luxury p-4 sm:p-6 shadow-luxury">
              <h2 className="text-lg sm:text-xl font-semibold text-charcoal mb-4 sm:mb-6">{t('seller.sellerPanel')}</h2>
              <nav className="space-y-1 sm:space-y-2">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 sm:px-4 py-3 rounded-luxury transition min-h-[44px] ${
                        isActive
                          ? 'bg-gold text-charcoal font-semibold'
                          : 'text-charcoal-light hover:bg-sand hover:text-charcoal'
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
          <main className="flex-1 min-w-0 space-y-4">
            <div className="flex justify-end">
              <NotificationBell />
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
