import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../store/authStore';

export default function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();

  const hasAdminAccess = useMemo(() => {
    const roles = user?.roles ?? [];
    return roles.some((role) => {
      const upper = role.toUpperCase();
      return upper === 'ADMIN' || upper === 'SUPER_ADMIN';
    });
  }, [user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/account" replace />;
  }

  // ملاحظة: استخدم startsWith بدل مساواة كاملة ليشمل المسارات الفرعية
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // إن احتجت تقييد عنصر "المدونة" على أدوار معيّنة، فعّل السطرين التاليين وفلتر العناصر بناءً على الدور:
  // const { user } = useAuthStore();
  // const canManageBlog = user?.roles?.includes('admin') || user?.roles?.includes('super_admin');

  const menuItems = [
    { path: '/admin/dashboard', label: t('admin.dashboard'), icon: '📊' },
    { path: '/admin/products',  label: t('admin.products'),  icon: '🛍️' },
    { path: '/admin/library',   label: t('admin.productLibrary', 'مكتبة المنتجات'), icon: '📚' },
    { path: '/admin/auctions',  label: t('admin.auctions'),  icon: '🔨' },
    { path: '/admin/orders',    label: t('admin.orders'),    icon: '📦' },
    { path: '/admin/coupons',   label: t('admin.coupons', 'الكوبونات'), icon: '🏷️' },
    { path: '/admin/users',     label: t('admin.users'),     icon: '👥' },
    { path: '/admin/auth-requests', label: t('admin.authRequests'), icon: '✅' },

    // ✅ العنصر الجديد: المدونة
    // إن أردت تقييده على أدوار: أضِف شرط canManageBlog هنا
    { path: '/admin/blog',      label: t('admin.blog', 'المدونة'), icon: '📝' },

    { path: '/admin/ads',       label: t('admin.ads'),       icon: '📢' },
    { path: '/admin/support',   label: t('admin.support'),   icon: '💬' },
    { path: '/admin/reports',   label: t('admin.reports'),   icon: '📈' },
    { path: '/admin/change-password', label: t('account.updatePassword', 'تغيير كلمة السر'), icon: '🔑' },
    { path: '/admin/settings',  label: t('admin.settings'),  icon: '⚙️' },
    { path: '/admin/audit',     label: t('admin.audit'),     icon: '🔍' },
  ];

  return (
    <div className="min-h-screen bg-sand">
      <div className="flex flex-col md:flex-row">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-charcoal text-ivory transform transition-transform duration-300 overflow-y-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gold mb-2">
              {t('admin.adminPanel')}
            </h2>
            <p className="text-xs sm:text-sm text-ivory opacity-70">
              {t('admin.manageSystem')}
            </p>
          </div>

          <nav className="px-2 sm:px-3 pb-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 mb-1 rounded-luxury transition min-h-[44px] text-sm sm:text-base ${
                  isActive(item.path)
                    ? 'bg-gold text-charcoal font-semibold'
                    : 'text-ivory hover:bg-charcoal-light'
                }`}
              >
                <span className="text-lg sm:text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden mb-4 bg-charcoal text-ivory px-4 py-3 rounded-luxury min-h-[44px] font-semibold flex items-center gap-2"
          >
            <span>☰</span>
            <span>{t('admin.menu')}</span>
          </button>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
