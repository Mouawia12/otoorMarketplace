import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SARIcon from '../components/common/SARIcon';
import api from '../lib/api';
import type { BankTransferSettings, PlatformSettings, SocialLinks } from '../types';
import { DEFAULT_SOCIAL_LINKS } from '../services/settingsService';

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [platformSaved, setPlatformSaved] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);

  const [bankSettings, setBankSettings] = useState<BankTransferSettings | null>(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSaved, setBankSaved] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [socialLinks, setSocialLinks] = useState<SocialLinks>(DEFAULT_SOCIAL_LINKS);
  const [socialLoading, setSocialLoading] = useState(true);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialSaved, setSocialSaved] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);

  useEffect(() => {
    fetchPlatformSettings();
    fetchBankSettings();
    fetchSocialLinks();
  }, []);

  const fetchPlatformSettings = async () => {
    try {
      setPlatformLoading(true);
      const response = await api.get<PlatformSettings>('/admin/settings/platform');
      setPlatformSettings(response.data);
      setPlatformError(null);
    } catch (error: any) {
      console.error('Failed to load platform settings', error);
      setPlatformError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setPlatformLoading(false);
    }
  };

  const fetchBankSettings = async () => {
    try {
      setBankLoading(true);
      const response = await api.get<BankTransferSettings>('/admin/settings/bank-transfer');
      setBankSettings(response.data);
      setBankError(null);
    } catch (error: any) {
      console.error('Failed to load bank settings', error);
      setBankError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setBankLoading(false);
    }
  };

  const fetchSocialLinks = async () => {
    try {
      setSocialLoading(true);
      const response = await api.get<SocialLinks>('/admin/settings/social-links');
      setSocialLinks({ ...DEFAULT_SOCIAL_LINKS, ...(response.data ?? {}) });
      setSocialError(null);
    } catch (error: any) {
      console.error('Failed to load social links', error);
      setSocialError(error?.response?.data?.detail || t('common.error'));
      setSocialLinks(DEFAULT_SOCIAL_LINKS);
    } finally {
      setSocialLoading(false);
    }
  };

  const updatePlatformField = <K extends keyof PlatformSettings>(field: K, value: PlatformSettings[K]) => {
    setPlatformSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSavePlatform = async () => {
    if (!platformSettings) return;
    try {
      setSavingPlatform(true);
      setPlatformError(null);
      await api.put('/admin/settings/platform', platformSettings);
      setPlatformSaved(true);
      setTimeout(() => setPlatformSaved(false), 2500);
    } catch (error: any) {
      console.error('Failed to save platform settings', error);
      setPlatformError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setSavingPlatform(false);
    }
  };

  const handleSaveBank = async () => {
    if (!bankSettings) return;
    try {
      setSavingBank(true);
      setBankError(null);
      await api.put('/admin/settings/bank-transfer', bankSettings);
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 2500);
    } catch (error: any) {
      console.error('Failed to save bank settings', error);
      setBankError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setSavingBank(false);
    }
  };

  const socialFields = [
    {
      key: 'instagram' as const,
      icon: '📸',
      label: t('admin.social.instagram', 'Instagram'),
      placeholder: 'https://instagram.com/username',
    },
    {
      key: 'tiktok' as const,
      icon: '🎵',
      label: t('admin.social.tiktok', 'TikTok'),
      placeholder: 'https://www.tiktok.com/@username',
    },
    {
      key: 'facebook' as const,
      icon: '📘',
      label: t('admin.social.facebook', 'Facebook'),
      placeholder: 'https://facebook.com/page',
    },
    {
      key: 'twitter' as const,
      icon: '🐦',
      label: t('admin.social.twitter', 'Twitter / X'),
      placeholder: 'https://twitter.com/username',
    },
    {
      key: 'youtube' as const,
      icon: '▶️',
      label: t('admin.social.youtube', 'YouTube'),
      placeholder: 'https://youtube.com/@channel',
    },
    {
      key: 'snapchat' as const,
      icon: '👻',
      label: t('admin.social.snapchat', 'Snapchat'),
      placeholder: 'https://www.snapchat.com/add/username',
    },
    {
      key: 'linkedin' as const,
      icon: '💼',
      label: t('admin.social.linkedin', 'LinkedIn'),
      placeholder: 'https://www.linkedin.com/company/slug',
    },
    {
      key: 'whatsapp' as const,
      icon: '💬',
      label: t('admin.social.whatsapp', 'WhatsApp'),
      placeholder: 'https://wa.me/966XXXXXXXXX',
    },
  ];

  const handleSocialFieldChange = (field: keyof SocialLinks, value: string) => {
    setSocialLinks((prev) => ({
      ...(prev ?? DEFAULT_SOCIAL_LINKS),
      [field]: value,
    }));
  };

  const handleSaveSocialLinks = async () => {
    try {
      setSavingSocial(true);
      setSocialError(null);
      const payload: Record<string, string> = {};
      (Object.keys(DEFAULT_SOCIAL_LINKS) as Array<keyof SocialLinks>).forEach((field) => {
        const value = socialLinks?.[field];
        const trimmed = value?.trim();
        if (trimmed) {
          payload[field] = trimmed;
        }
      });
      const response = await api.put<SocialLinks>('/admin/settings/social-links', payload);
      setSocialLinks({ ...DEFAULT_SOCIAL_LINKS, ...(response.data ?? {}) });
      setSocialSaved(true);
      setTimeout(() => setSocialSaved(false), 2500);
    } catch (error: any) {
      console.error('Failed to save social links', error);
      setSocialError(error?.response?.data?.detail || t('common.error'));
    } finally {
      setSavingSocial(false);
    }
  };

  if (platformLoading && !platformSettings) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-h3 text-charcoal">
              {t('admin.walletSettingsTitle', 'Wallet Settings')}
            </h2>
            <p className="text-taupe mt-2">
              {t('admin.walletSettingsSubtitle', 'Monitor the Torod wallet balance and create a recharge link when needed.')}
            </p>
          </div>
        <a
          href="/admin/settings/wallet"
          className="bg-charcoal text-ivory px-5 py-2 rounded-luxury font-semibold hover:opacity-90 transition"
        >
          {t('admin.walletOpenSettingsButton', 'Open Wallet Settings')}
        </a>
      </div>
    </div>
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('admin.settings')}</h1>
          {platformSaved && <span className="text-green-600 font-semibold">✓ {t('admin.saved')}</span>}
        </div>

        {platformError && <p className="text-sm text-alert mb-4">{platformError}</p>}

        {platformSettings && (
          <div className="space-y-6">
            <div>
              <h3 className="text-h3 text-charcoal mb-4">{t('admin.commissionRates')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('admin.newProducts')} (%)</label>
                  <input
                    type="number"
                    value={platformSettings.commissionNew}
                    onChange={(e) => updatePlatformField('commissionNew', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('admin.usedProducts')} (%)</label>
                  <input
                    type="number"
                    value={platformSettings.commissionUsed}
                    onChange={(e) => updatePlatformField('commissionUsed', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('admin.auctionProducts')} (%)</label>
                  <input
                    type="number"
                    value={platformSettings.commissionAuction}
                    onChange={(e) => updatePlatformField('commissionAuction', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
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
                <input
                  type="number"
                  value={platformSettings.authenticityFee}
                  onChange={(e) => updatePlatformField('authenticityFee', parseFloat(e.target.value) || 0)}
                  className="w-full md:w-1/3 px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <h3 className="text-h3 text-charcoal mb-4">{t('admin.systemSettings')}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={platformSettings.notificationsEnabled}
                    onChange={(e) => updatePlatformField('notificationsEnabled', e.target.checked)}
                  />
                  <label className="text-charcoal font-semibold">{t('admin.enableNotifications')}</label>
                </div>

                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('admin.defaultLanguage')}</label>
                  <select
                    value={platformSettings.language}
                    onChange={(e) => updatePlatformField('language', e.target.value as 'ar' | 'en')}
                    className="px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  >
                    <option value="ar">{t('admin.arabic')}</option>
                    <option value="en">{t('admin.english')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t('admin.theme')}</label>
                  <select
                    value={platformSettings.theme}
                    onChange={(e) => updatePlatformField('theme', e.target.value as 'light' | 'dark')}
                    className="px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  >
                    <option value="light">{t('admin.light')}</option>
                    <option value="dark">{t('admin.dark')}</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePlatform}
              disabled={savingPlatform}
              className="bg-gold text-charcoal px-8 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-60"
            >
              {savingPlatform ? t('common.loading') : t('admin.saveSettings')}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-h3 text-charcoal">{t('admin.socialLinks')}</h2>
            <p className="text-sm text-taupe">{t('admin.socialLinksSubtitle', 'Keep customer-facing social profiles up to date.')}</p>
          </div>
          {socialSaved && <span className="text-green-600 font-semibold">✓ {t('admin.saved')}</span>}
        </div>

        {socialError && <p className="text-sm text-alert mb-4">{socialError}</p>}

        {socialLoading ? (
          <p className="text-sm text-taupe">{t('common.loading')}</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-charcoal font-semibold mb-2 flex items-center gap-2">
                    <span>{field.icon}</span>
                    <span>{field.label}</span>
                  </label>
                  <input
                    type="url"
                    value={socialLinks?.[field.key] ?? ''}
                    onChange={(e) => handleSocialFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveSocialLinks}
              disabled={savingSocial}
              className="bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-60"
            >
              {savingSocial ? t('common.loading') : t('admin.saveSocialLinks', 'Save social media links')}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-h3 text-charcoal">{t('admin.bankSettings')}</h2>
          {bankSaved && <span className="text-green-600 font-semibold">✓ {t('admin.saved')}</span>}
        </div>

        {bankError && <p className="text-sm text-alert mb-4">{bankError}</p>}

        {bankLoading || !bankSettings ? (
          <p className="text-sm text-taupe">{t('common.loading')}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.bankNameLabel')}</label>
                <input
                  type="text"
                  value={bankSettings.bankName}
                  onChange={(e) => setBankSettings({ ...bankSettings, bankName: e.target.value })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.bankAccountName')}</label>
                <input
                  type="text"
                  value={bankSettings.accountName}
                  onChange={(e) => setBankSettings({ ...bankSettings, accountName: e.target.value })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.bankIban')}</label>
                <input
                  type="text"
                  value={bankSettings.iban}
                  onChange={(e) => setBankSettings({ ...bankSettings, iban: e.target.value })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none uppercase tracking-wide"
                />
              </div>
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('admin.bankSwift')}</label>
                <input
                  type="text"
                  value={bankSettings.swift}
                  onChange={(e) => setBankSettings({ ...bankSettings, swift: e.target.value })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t('admin.bankInstructions')}</label>
              <textarea
                value={bankSettings.instructions}
                onChange={(e) => setBankSettings({ ...bankSettings, instructions: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveBank}
                disabled={savingBank}
                className="bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover transition disabled:opacity-60"
              >
                {savingBank ? t('common.loading') : t('admin.saveBankSettings')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
