import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

const extractValue = (payload: any, fallback: number | null = null) => {
  if (payload == null) return fallback;
  if (typeof payload === 'number') return payload;
  if (typeof payload === 'string' && payload.trim().length > 0) {
    const asNumber = Number(payload);
    return Number.isFinite(asNumber) ? asNumber : fallback;
  }
  if (typeof payload === 'object') {
    const record = payload as Record<string, any>;
    const direct = record.wallet_balance ?? record.walletBalance ?? record.balance ?? record.amount;
    return extractValue(direct, fallback);
  }
  return fallback;
};

const extractLink = (payload: any) => {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    const record = payload as Record<string, any>;
    return (
      record.payment_link ??
      record.paymentLink ??
      record.link ??
      record.url ??
      record.payment_url ??
      null
    );
  }
  return null;
};

export default function AdminWalletSettingsPage() {
  const { t } = useTranslation();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setBalanceLoading(true);
      setBalanceError(null);
      const response = await api.get('/torod/wallet-balance');
      const value = extractValue(response.data, null);
      if (value === null) {
        setBalanceError(t('admin.walletBalanceReadError', 'Unable to read wallet balance'));
        return;
      }
      setWalletBalance(value);
    } catch (error: any) {
      setBalanceError(error?.response?.data?.message || error?.message || t('admin.walletBalanceFetchError', 'Unable to fetch wallet balance'));
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleCreateLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLinkError(null);
    setLinkSuccess(null);
    setLink(null);

    const normalized = Number(amount);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      setLinkError(t('admin.walletAmountInvalid', 'Please enter a valid amount'));
      return;
    }
    if (normalized % 10 !== 0) {
      setLinkError(t('admin.walletAmountMultiple', 'Amount must be a multiple of 10'));
      return;
    }

    try {
      setLinkLoading(true);
      const response = await api.post('/torod/wallet-payment-link', { amount: normalized });
      const paymentLink = extractLink(response.data);
      if (!paymentLink) {
        setLinkError(t('admin.walletPaymentLinkError', 'Unable to create payment link'));
        return;
      }
      setLink(paymentLink);
      setLinkSuccess(t('admin.walletPaymentLinkSuccess', 'Payment link created successfully'));
    } catch (error: any) {
      setLinkError(error?.response?.data?.message || error?.message || t('admin.walletPaymentLinkError', 'Unable to create payment link'));
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkSuccess(t('admin.walletLinkCopied', 'Link copied'));
    } catch (_error) {
      setLinkError(t('admin.walletLinkCopyError', 'Unable to copy link'));
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {t('admin.walletSettingsTitle', 'Wallet Settings')}
            </h1>
            <p className="text-taupe mt-2">
              {t('admin.walletSettingsSubtitle', 'Monitor the Torod wallet balance and create a recharge link when needed.')}
            </p>
          </div>
          <button
            onClick={fetchBalance}
            className="px-4 py-2 rounded-luxury border border-sand/70 text-charcoal text-sm font-semibold"
            disabled={balanceLoading}
          >
            {balanceLoading ? t('admin.walletBalanceRefreshing', 'Refreshing...') : t('admin.walletBalanceRefresh', 'Refresh Balance')}
          </button>
        </div>

        <div className="mt-6 p-4 rounded-luxury bg-sand/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-taupe">{t('admin.walletBalanceLabel', 'Current wallet balance')}</div>
          <div className="text-2xl font-bold text-charcoal">
            {walletBalance === null ? '--' : `${walletBalance} SAR`}
          </div>
        </div>

        {walletBalance === 0 && (
          <p className="mt-3 text-sm text-amber-700">
            {t('admin.walletBalanceZero', 'Wallet balance is zero. Please recharge before creating shipments.')}
          </p>
        )}

        {balanceError && <p className="mt-3 text-sm text-alert font-semibold">{balanceError}</p>}
      </div>

      <div className="bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-charcoal">{t('admin.walletTopupTitle', 'Recharge Wallet')}</h2>
        <p className="text-taupe mt-2">
          {t('admin.walletTopupSubtitle', 'Enter a top-up amount (multiples of 10) and generate a payment link.')}
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleCreateLink}>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">{t('admin.walletAmountLabel', 'Amount')}</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 focus:ring-2 focus:ring-gold focus:border-gold outline-none"
              placeholder={t('admin.walletAmountPlaceholder', 'Example: 100')}
              min={10}
              step={10}
              required
            />
          </div>

          <button
            type="submit"
            className="bg-gold text-charcoal font-semibold px-6 py-3 rounded-luxury hover:bg-gold/90 transition disabled:opacity-60"
            disabled={linkLoading}
          >
            {linkLoading ? t('admin.walletPaymentLinkCreating', 'Creating link...') : t('admin.walletPaymentLinkButton', 'Get Payment Link')}
          </button>
        </form>

        {linkError && <p className="mt-3 text-sm text-alert font-semibold">{linkError}</p>}
        {linkSuccess && <p className="mt-3 text-sm text-emerald-600 font-semibold">{linkSuccess}</p>}

        {link && (
          <div className="mt-4 p-4 rounded-luxury border border-sand/70 space-y-3">
            <div className="text-sm text-taupe">{t('admin.walletPaymentLinkLabel', 'Payment link')}</div>
            <input
              value={link}
              readOnly
              className="w-full border border-sand/60 rounded-luxury px-3 py-3 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-luxury border border-sand/70 text-charcoal text-sm font-semibold"
              >
                {t('admin.walletCopyLink', 'Copy link')}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-luxury bg-charcoal text-ivory text-sm font-semibold"
              >
                {t('admin.walletOpenLink', 'Open link')}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
