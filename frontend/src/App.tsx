import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

import Layout from './components/layout/Layout';
import AccountLayout from './components/layout/AccountLayout';
import SellerLayout from './components/layout/SellerLayout';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductDetailPage from './pages/ProductDetailPage';
import NewPerfumes from './pages/NewPerfumes';
import UsedPerfumes from './pages/UsedPerfumes';
import AuctionsPerfumes from './pages/AuctionsPerfumes';
import AuctionDetail from './pages/AuctionDetail';
import AuctionDetailPage from './pages/AuctionDetailPage';
import Orders from './pages/Orders';

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
import SellerEarningsPage from './pages/SellerEarningsPage';
import SellerSupportPage from './pages/SellerSupportPage';

import AdminLayout from './pages/admin/layout/AdminLayout';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminAuctionsPage from './pages/AdminAuctionsPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAuthRequestsPage from './pages/AdminAuthRequestsPage';
import AdminAdsPage from './pages/AdminAdsPage';
import AdminSupportPage from './pages/AdminSupportPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminAuditPage from './pages/AdminAuditPage';
import AdminSellerProfilesPage from './pages/AdminSellerProfilesPage';
import AdminProductLibraryPage from './pages/AdminProductLibraryPage';
import AdminChangePassword from './pages/admin/AdminChangePassword';

// ✅ صفحات الفوتر الثابتة (صفحة واحدة تُستخدم لكل المسارات)
import InfoPage from './pages/static/InfoPage';

import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';

import BlogIndex from './pages/blog/BlogIndex';
import BlogPost from './pages/blog/BlogPost';
import CategoryPage from './pages/blog/CategoryPage';
import TagPage from './pages/blog/TagPage';
import AuthorPage from './pages/blog/AuthorPage';

// ✅ إدارة المدونة داخل لوحة الإدارة
import AdminBlogList from './pages/admin/blog/AdminBlogList';
import AdminBlogEdit from './pages/admin/blog/AdminBlogEdit';

import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import i18n from './i18n/config';
import { ScrollToTop } from './components/ScrollToTop';

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
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          <Route path="new" element={<NewPerfumes />} />
          <Route path="used" element={<UsedPerfumes />} />
          <Route path="auctions" element={<AuctionsPerfumes />} />

          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="p/:id" element={<ProductDetailPage />} />

          <Route path="auctions/:id" element={<AuctionDetail />} />
          <Route path="auction/:id" element={<AuctionDetailPage />} />

          <Route path="orders" element={<Orders />} />

          <Route path="cart" element={<CartPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order/success" element={<OrderSuccessPage />} />

          {/* Blog (public) */}
          <Route path="blog" element={<BlogIndex />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="blog/category/:category" element={<CategoryPage />} />
          <Route path="blog/tag/:tag" element={<TagPage />} />
          <Route path="blog/author/:name" element={<AuthorPage />} />

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
            <Route path="earnings" element={<SellerEarningsPage />} />
            <Route path="support" element={<SellerSupportPage />} />
            <Route path="change-password" element={<SellerChangePassword />} />
          </Route>

          {/* Admin */}
          <Route path="admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="library" element={<AdminProductLibraryPage />} />
            <Route path="auctions" element={<AdminAuctionsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="auth-requests" element={<AdminAuthRequestsPage />} />
            <Route path="seller-profiles" element={<AdminSellerProfilesPage />} />

            {/* Blog (Admin) */}
            <Route path="blog" element={<AdminBlogList />} />
            <Route path="blog/new" element={<AdminBlogEdit mode="create" />} />
            <Route path="blog/:id" element={<AdminBlogEdit mode="edit" />} />

            <Route path="change-password" element={<AdminChangePassword />} />
            <Route path="ads" element={<AdminAdsPage />} />
            <Route path="support" element={<AdminSupportPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
