import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SARIcon from '../components/common/SARIcon';

interface Settings {
  commissionNew: number;
  commissionUsed: number;
  commissionAuction: number;
  authenticityFee: number;
  notificationsEnabled: boolean;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({
    commissionNew: 10,
    commissionUsed: 5,
    commissionAuction: 5,
    authenticityFee: 25,
    notificationsEnabled: true,
    language: 'ar',
    theme: 'light',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  };

  const handleSave = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('admin.settings')}</h1>
          {saved && <span className="text-green-600 font-semibold">✓ {t('admin.saved')}</span>}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.commissionRates')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.newProducts')} (%)</label>
                <input type="number" value={settings.commissionNew} onChange={(e) => setSettings({ ...settings, commissionNew: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.usedProducts')} (%)</label>
                <input type="number" value={settings.commissionUsed} onChange={(e) => setSettings({ ...settings, commissionUsed: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.auctionProducts')} (%)</label>
                <input type="number" value={settings.commissionAuction} onChange={(e) => setSettings({ ...settings, commissionAuction: parseFloat(e.target.value) })} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.fees')}</h3>
            <div>
              <label className="block text-charcoal font-semibold mb-2">
                {t('admin.authenticityFee')} (
                <SARIcon size={14} className="text-charcoal align-text-bottom" />
                )
              </label>
              <input type="number" value={settings.authenticityFee} onChange={(e) => setSettings({ ...settings, authenticityFee: parseFloat(e.target.value) })} className="w-full md:w-1/3 px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
            </div>
          </div>

          <div>
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.systemSettings')}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })} />
                <label className="text-charcoal font-semibold">{t('admin.enableNotifications')}</label>
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.defaultLanguage')}</label>
                <select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value as 'ar' | 'en' })} className="px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none">
                  <option value="ar">{t('admin.arabic')}</option>
                  <option value="en">{t('admin.english')}</option>
                </select>
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.theme')}</label>
                <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as 'light' | 'dark' })} className="px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none">
                  <option value="light">{t('admin.light')}</option>
                  <option value="dark">{t('admin.dark')}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.rbacMatrix')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead>
                  <tr className="bg-sand">
                    <th className="text-right px-4 py-3 text-charcoal font-semibold border-b">{t('admin.permission')}</th>
                    <th className="text-center px-4 py-3 text-charcoal font-semibold border-b">{t('admin.admin')}</th>
                    <th className="text-center px-4 py-3 text-charcoal font-semibold border-b">{t('admin.moderator')}</th>
                    <th className="text-center px-4 py-3 text-charcoal font-semibold border-b">{t('admin.seller')}</th>
                    <th className="text-center px-4 py-3 text-charcoal font-semibold border-b">{t('admin.buyer')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-charcoal">{t('admin.manageUsers')}</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-charcoal">{t('admin.moderateProducts')}</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-charcoal">{t('admin.manageOrders')}</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">-</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-charcoal">{t('admin.placeOrders')}</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">✓</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-charcoal">{t('admin.viewReports')}</td>
                    <td className="text-center px-4 py-3">✓</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                    <td className="text-center px-4 py-3">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleSave} className="bg-gold text-charcoal px-8 py-3 rounded-luxury font-semibold hover:bg-gold-hover">
            {t('admin.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
}
