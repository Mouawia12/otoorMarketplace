import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Product, User } from '../types';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice } from '../utils/currency';

interface DashboardStats {
  total_products: number;
  pending_products: number;
  total_orders: number;
  pending_orders: number;
  running_auctions: number;
}

export default function Admin() {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'users'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [activeTab, isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        const statsRes = await api.get('/admin/dashboard');
        setStats(statsRes.data);
      } else if (activeTab === 'products') {
        const productsRes = await api.get('/admin/products/pending');
        setPendingProducts(productsRes.data);
      } else if (activeTab === 'users') {
        const usersRes = await api.get('/admin/users');
        setUsers(usersRes.data);
      }
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 401) {
        alert(t('admin.accessRequired'));
        navigate('/login');
      } else {
        console.error('Failed to fetch admin data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const moderateProduct = async (productId: number, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/admin/products/${productId}/moderate`, { 
        action
      });
      fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.detail || t('admin.moderateFailed'));
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { status });
      fetchDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.detail || t('admin.updateUserFailed'));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-charcoal mb-6">{t('admin.title')}</h1>

      <div className="bg-white rounded-luxury shadow-luxury p-4 mb-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'dashboard'
                ? 'text-gold border-b-2 border-gold'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            {t('admin.dashboard')}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'products'
                ? 'text-gold border-b-2 border-gold'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            {t('admin.productModeration')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'users'
                ? 'text-gold border-b-2 border-gold'
                : 'text-charcoal-light hover:text-charcoal'
            }`}
          >
            {t('admin.userManagement')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-charcoal-light">{t('common.loading')}</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && stats && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-luxury shadow-luxury">
                <h3 className="text-sm font-medium text-charcoal-light mb-2">{t('admin.totalProducts')}</h3>
                <p className="text-3xl font-bold text-charcoal">{stats.total_products}</p>
                <p className="text-sm text-gold mt-2">{stats.pending_products} {t('admin.pendingProducts')}</p>
              </div>

              <div className="bg-white p-6 rounded-luxury shadow-luxury">
                <h3 className="text-sm font-medium text-charcoal-light mb-2">{t('admin.totalOrders')}</h3>
                <p className="text-3xl font-bold text-charcoal">{stats.total_orders}</p>
                <p className="text-sm text-gold mt-2">{stats.pending_orders} {t('admin.pendingOrders')}</p>
              </div>

              <div className="bg-white p-6 rounded-luxury shadow-luxury">
                <h3 className="text-sm font-medium text-charcoal-light mb-2">{t('admin.runningAuctions')}</h3>
                <p className="text-3xl font-bold text-charcoal">{stats.running_auctions}</p>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              {pendingProducts.length === 0 ? (
                <div className="bg-white p-12 rounded-luxury shadow-luxury text-center">
                  <p className="text-charcoal-light">{t('admin.noPendingProducts')}</p>
                </div>
              ) : (
                pendingProducts.map(product => {
                  const name = language === 'ar' ? product.name_ar : product.name_en;
                  const description = language === 'ar' ? product.description_ar : product.description_en;
                  const imageUrl = product.image_urls?.[0] || '/placeholder-perfume.jpg';

                  return (
                    <div key={product.id} className="bg-white rounded-luxury shadow-luxury p-6">
                      <div className="flex items-start gap-4">
                        <img
                          src={imageUrl}
                          alt={name}
                          className="w-24 h-24 object-cover rounded-luxury"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-perfume.jpg';
                          }}
                        />
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-charcoal mb-1">{name}</h3>
                          <p className="text-sm text-charcoal-light mb-3 line-clamp-2">{description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-charcoal-light">{t('common.brand')}</p>
                              <p className="font-semibold text-charcoal">{product.brand}</p>
                            </div>
                            <div>
                              <p className="text-xs text-charcoal-light">{t('common.price')}</p>
                              <p className="font-semibold text-gold">{formatPrice(product.base_price, language)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-charcoal-light">{t('products.type')}</p>
                              <p className="font-semibold text-charcoal">{product.product_type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-charcoal-light">{t('admin.stock')}</p>
                              <p className="font-semibold text-charcoal">{product.stock_quantity}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => moderateProduct(product.id, 'approve')}
                              className="bg-green-500 text-white px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-green-600 transition"
                            >
                              {t('admin.approve')}
                            </button>
                            <button
                              onClick={() => moderateProduct(product.id, 'reject')}
                              className="bg-red-500 text-white px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-red-600 transition"
                            >
                              {t('admin.reject')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-luxury shadow-luxury overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-light uppercase tracking-wider">
                        {t('admin.user')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-light uppercase tracking-wider">
                        {t('auth.email')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-light uppercase tracking-wider">
                        {t('admin.roles')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-light uppercase tracking-wider">
                        {t('orders.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-charcoal-light uppercase tracking-wider">
                        {t('admin.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-charcoal">{user.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-charcoal-light">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-1">
                            {user.roles.map(role => (
                              <span key={role} className="px-2 py-1 text-xs bg-gold-light text-charcoal rounded">
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.status === 'active' ? (
                            <button
                              onClick={() => updateUserStatus(user.id, 'suspended')}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t('admin.suspend')}
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserStatus(user.id, 'active')}
                              className="text-green-600 hover:text-green-900"
                            >
                              {t('admin.activate')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
