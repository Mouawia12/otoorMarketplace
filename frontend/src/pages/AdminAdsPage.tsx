import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Ad {
  id: number;
  title: string;
  titleAr: string;
  type: 'hero' | 'sidebar' | 'strip';
  url: string;
  active: boolean;
  created: string;
}

export default function AdminAdsPage() {
  const { t, i18n } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({ title: '', titleAr: '', type: 'hero' as Ad['type'], url: '', active: true });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setAds([
      { id: 1, title: 'Summer Sale', titleAr: 'تخفيضات الصيف', type: 'hero', url: '/sale', active: true, created: '2024-09-15' },
      { id: 2, title: 'New Arrivals', titleAr: 'وصل حديثاً', type: 'sidebar', url: '/new', active: true, created: '2024-09-20' },
      { id: 3, title: 'Premium Brands', titleAr: 'علامات تجارية فاخرة', type: 'strip', url: '/brands', active: false, created: '2024-08-10' },
    ]);
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingAd(null);
    setFormData({ title: '', titleAr: '', type: 'hero', url: '', active: true });
    setShowModal(true);
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({ title: ad.title, titleAr: ad.titleAr, type: ad.type, url: ad.url, active: ad.active });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('admin.confirmDelete'))) {
      setAds(ads.filter(a => a.id !== id));
    }
  };

  const handleSubmit = () => {
    if (editingAd) {
      setAds(ads.map(a => a.id === editingAd.id ? { ...a, ...formData } : a));
    } else {
      const newAd: Ad = { id: Math.max(...ads.map(a => a.id)) + 1, ...formData, created: new Date().toISOString().split('T')[0] };
      setAds([newAd, ...ads]);
    }
    setShowModal(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hero': return 'text-purple-600 bg-purple-100';
      case 'sidebar': return 'text-blue-600 bg-blue-100';
      case 'strip': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('admin.ads')}</h1>
          <button onClick={handleCreate} className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover">
            + {t('admin.createAd')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.title')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.type')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.url')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.active')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.created')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{ad.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{i18n.language === 'ar' ? ad.titleAr : ad.title}</td>
                  <td className="px-4 py-4"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeColor(ad.type)}`}>{t(`admin.${ad.type}`)}</span></td>
                  <td className="px-4 py-4 text-charcoal-light">{ad.url}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ad.active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-200'}`}>
                      {ad.active ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(ad.created).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(ad)} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">{t('admin.edit')}</button>
                      <button onClick={() => handleDelete(ad.id)} className="text-red-600 hover:text-red-700 text-sm font-semibold">{t('admin.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-luxury p-6 max-w-md w-full">
            <h3 className="text-h3 text-charcoal mb-4">{editingAd ? t('admin.editAd') : t('admin.createAd')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.titleEn')}</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.titleAr')}</label>
                <input type="text" value={formData.titleAr} onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.type')}</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Ad['type'] })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none">
                  <option value="hero">{t('admin.hero')}</option>
                  <option value="sidebar">{t('admin.sidebar')}</option>
                  <option value="strip">{t('admin.strip')}</option>
                </select>
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.url')}</label>
                <input type="text" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} />
                <label className="text-charcoal font-semibold">{t('admin.active')}</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover">{t('admin.save')}</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
