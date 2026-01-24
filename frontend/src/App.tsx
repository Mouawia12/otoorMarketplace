import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense, ReactNode } from 'react';

import Layout from './components/layout/Layout';
import AccountLayout from './components/layout/AccountLayout';
import SellerLayout from './components/layout/SellerLayout';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductDetailPage from './pages/ProductDetailPage';
import NewPerfumes from './pages/NewPerfumes';
import UsedPerfumes from './pages/UsedPerfumes';
import AuctionsPerfumes from './pages/AuctionsPerfumes';
import AuctionDetailPage from './pages/AuctionDetailPage';
import Orders from './pages/Orders';
import SellerStorePage from './pages/SellerStorePage';

import AccountOverviewPage from './pages/AccountOverviewPage';
import OrdersPage from './pages/OrdersPage';
import BidsPage from './pages/BidsPage';
import FavoritesPage from './pages/FavoritesPage';
import SupportPage from './pages/SupportPage';
import AccountChangePassword from './pages/AccountChangePassword';
import AccountProfilePage from './pages/AccountProfilePage';
import SellerProfileComplete from './pages/SellerProfileComplete';
import SellerProfileStatus from './pages/SellerProfileStatus';
import SellerChangePassword from './pages/SellerChangePassword';

import SellerDashboardPage from './pages/SellerDashboardPage';
import SellerProductsPage from './pages/SellerProductsPage';
import SellerAuctionsPage from './pages/SellerAuctionsPage';
import SellerOrdersPage from './pages/SellerOrdersPage';
import SellerMyOrdersPage from './pages/SellerMyOrdersPage';
import SellerEarningsPage from './pages/SellerEarningsPage';
import SellerSupportPage from './pages/SellerSupportPage';
import SellerManualShipmentPage from './pages/SellerManualShipmentPage';
import SellerWarehouseManagementPage from './pages/SellerWarehouseManagementPage';
import SellerWarehousesPage from './pages/SellerWarehousesPage';
import LabelPrintView from './pages/LabelPrintView';

const AdminLayout = lazy(() => import('./pages/admin/layout/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminAuctionsPage = lazy(() => import('./pages/AdminAuctionsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminAuthRequestsPage = lazy(() => import('./pages/AdminAuthRequestsPage'));
const AdminAdsPage = lazy(() => import('./pages/AdminAdsPage'));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'));
const AdminSellerProfilesPage = lazy(() => import('./pages/AdminSellerProfilesPage'));
const AdminProductLibraryPage = lazy(() => import('./pages/AdminProductLibraryPage'));
const AdminChangePassword = lazy(() => import('./pages/admin/AdminChangePassword'));
const AdminCouponsPage = lazy(() => import('./pages/AdminCouponsPage'));
const AdminSitePagesPage = lazy(() => import('./pages/AdminSitePagesPage'));
const AdminWalletSettingsPage = lazy(() => import('./pages/AdminWalletSettingsPage'));
const AdminBlogList = lazy(() => import('./pages/admin/blog/AdminBlogList'));
const AdminBlogEdit = lazy(() => import('./pages/admin/blog/AdminBlogEdit'));

const BlogIndex = lazy(() => import('./pages/blog/BlogIndex'));
const BlogPost = lazy(() => import('./pages/blog/BlogPost'));
const CategoryPage = lazy(() => import('./pages/blog/CategoryPage'));
const TagPage = lazy(() => import('./pages/blog/TagPage'));
const AuthorPage = lazy(() => import('./pages/blog/AuthorPage'));

// ✅ صفحات الفوتر الثابتة (صفحة واحدة تُستخدم لكل المسارات)
import InfoPage from './pages/static/InfoPage';

import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import PaymentStatusPage from './pages/PaymentStatusPage';

import SellerCouponsPage from './pages/SellerCouponsPage';

import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import i18n from './i18n/config';
import { ScrollToTop } from './components/ScrollToTop';

const suspenseFallback = (
  <div className="py-20 text-center text-taupe font-semibold">Loading...</div>
);

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={suspenseFallback}>{node}</Suspense>
);

function App() {
  const { isAuthenticated, fetchUser, user } = useAuthStore();
  const { language } = useUIStore();

  useEffect(() => {
    if (isAuthenticated && !user) fetchUser();
  }, [isAuthenticated, user, fetchUser]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <Routes>
        <Route path="orders/:id/label/print-view" element={<LabelPrintView />} />
        <Route path="/" element={<Layout />}>
          {/* Public */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />

          <Route path="new" element={<NewPerfumes />} />
          <Route path="used" element={<UsedPerfumes />} />
          <Route path="auctions" element={<AuctionsPerfumes />} />

          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="p/:id" element={<ProductDetailPage />} />
          <Route path="store/:sellerId" element={<SellerStorePage />} />

          <Route path="auctions/:id" element={<AuctionDetailPage />} />
          <Route path="auction/:id" element={<AuctionDetailPage />} />

          <Route path="orders" element={<Orders />} />

          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order/success" element={<OrderSuccessPage />} />
          <Route path="payment/success" element={<PaymentStatusPage />} />
          <Route path="payment/error" element={<PaymentStatusPage />} />

          {/* Blog (public) */}
          <Route path="blog" element={withSuspense(<BlogIndex />)} />
          <Route path="blog/:slug" element={withSuspense(<BlogPost />)} />
          <Route path="blog/category/:category" element={withSuspense(<CategoryPage />)} />
          <Route path="blog/tag/:tag" element={withSuspense(<TagPage />)} />
          <Route path="blog/author/:name" element={withSuspense(<AuthorPage />)} />

          {/* Static pages used by footer links */}
          <Route path="about" element={<InfoPage />} />
          <Route path="authenticity" element={<InfoPage />} />
          <Route path="how-it-works" element={<InfoPage />} />
          <Route path="help" element={<InfoPage />} />
          <Route path="shipping" element={<InfoPage />} />
          <Route path="returns" element={<InfoPage />} />
          <Route path="privacy" element={<InfoPage />} />
          <Route path="terms" element={<InfoPage />} />
          <Route path="contact" element={<InfoPage />} />
          <Route path="help/buying-preowned" element={<InfoPage />} />
          <Route path="help/bidding-guide" element={<InfoPage />} />

          {/* Account */}
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<AccountOverviewPage />} />
            <Route path="profile" element={<AccountProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="bids" element={<BidsPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="change-password" element={<AccountChangePassword />} />
          </Route>

          {/* Seller profile completion */}
          <Route path="seller/profile-complete" element={<SellerProfileComplete />} />
          <Route path="seller/profile-status" element={<SellerProfileStatus />} />

          {/* Seller */}
          <Route path="seller" element={<SellerLayout />}>
            <Route path="dashboard" element={<SellerDashboardPage />} />
            <Route path="products" element={<SellerProductsPage />} />
            <Route path="auctions" element={<SellerAuctionsPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="my-orders" element={<SellerMyOrdersPage />} />
            <Route path="manual-shipments" element={<SellerManualShipmentPage />} />
            <Route path="warehouse-management" element={<SellerWarehouseManagementPage />} />
            <Route path="warehouses" element={<SellerWarehousesPage />} />
            <Route path="coupons" element={<SellerCouponsPage />} />
            <Route path="earnings" element={<SellerEarningsPage />} />
            <Route path="support" element={<SellerSupportPage />} />
            <Route path="change-password" element={<SellerChangePassword />} />
          </Route>

          {/* Admin */}
          <Route path="admin" element={withSuspense(<AdminLayout />)}>
            <Route path="dashboard" element={withSuspense(<AdminDashboardPage />)} />
            <Route path="products" element={withSuspense(<AdminProductsPage />)} />
            <Route path="library" element={withSuspense(<AdminProductLibraryPage />)} />
            <Route path="auctions" element={withSuspense(<AdminAuctionsPage />)} />
            <Route path="orders" element={withSuspense(<AdminOrdersPage />)} />
            <Route path="manual-shipments" element={<SellerManualShipmentPage />} />
            <Route path="users" element={withSuspense(<AdminUsersPage />)} />
            <Route path="auth-requests" element={withSuspense(<AdminAuthRequestsPage />)} />
            <Route path="seller-profiles" element={withSuspense(<AdminSellerProfilesPage />)} />
            <Route path="coupons" element={withSuspense(<AdminCouponsPage />)} />

            {/* Blog (Admin) */}
            <Route path="blog" element={withSuspense(<AdminBlogList />)} />
            <Route path="blog/new" element={withSuspense(<AdminBlogEdit mode="create" />)} />
            <Route path="blog/:id" element={withSuspense(<AdminBlogEdit mode="edit" />)} />

            <Route path="change-password" element={withSuspense(<AdminChangePassword />)} />
            <Route path="ads" element={withSuspense(<AdminAdsPage />)} />
            <Route path="support" element={withSuspense(<AdminSupportPage />)} />
            <Route path="reports" element={withSuspense(<AdminReportsPage />)} />
            <Route path="settings" element={withSuspense(<AdminSettingsPage />)} />
            <Route path="settings/wallet" element={withSuspense(<AdminWalletSettingsPage />)} />
            <Route path="pages" element={withSuspense(<AdminSitePagesPage />)} />
            <Route path="audit" element={withSuspense(<AdminAuditPage />)} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
