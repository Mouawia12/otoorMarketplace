import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../../store/cartStore";
import { useAuthStore } from "../../store/authStore";
import { formatPrice } from "../../utils/currency";
import SARIcon from "../common/SARIcon";

interface MiniCartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MiniCartDrawer({ open, onClose }: MiniCartDrawerProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { items, remove, totals } = useCartStore();
  const { sub, total } = totals();
  const lang = i18n.language as 'ar' | 'en';
  const renderPrice = (value: number | undefined, size = 14, colorClass = "") => {
    const formatted = formatPrice(value, lang).replace(/\s?(SAR|﷼)$/i, "");
    return (
      <span className={`inline-flex items-center gap-1 ${colorClass}`.trim()}>
        {formatted}
        <SARIcon size={size} />
      </span>
    );
  };

  const handleCheckout = () => {
    onClose();
    const target = "/checkout";
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[70]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-0 h-full w-full max-w-md bg-charcoal z-[70] shadow-luxury overflow-y-auto"
        style={{ insetInlineEnd: 0 }}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="sticky top-0 bg-charcoal border-b border-charcoal-light p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-ivory">{t('cart.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-charcoal-light min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5 text-ivory" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <svg className="w-20 h-20 text-taupe mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2"
              />
            </svg>
            <p className="text-taupe text-center mb-6">{t('cart.empty')}</p>
            <Link
              to="/new"
              onClick={onClose}
              className="bg-gold text-charcoal px-6 py-3 rounded-luxury hover:bg-gold-hover transition font-semibold"
            >
              {t('cart.continueShopping')}
            </Link>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.variantId || 'default'}`}
                  className="flex gap-4 bg-charcoal-light rounded-luxury p-3"
                >
                  <div className="w-20 h-20 flex-shrink-0 bg-sand rounded-lg overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-taupe" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-ivory font-semibold text-sm truncate">{item.name}</h3>
                    {item.brand && <p className="text-taupe text-xs">{item.brand}</p>}
                    {item.variantLabel && <p className="text-gold text-xs">{item.variantLabel}</p>}
                    <p className="text-gold font-bold mt-1">{renderPrice(item.price, 14, "text-gold")}</p>
                    <p className="text-taupe text-xs mt-1">{t('cart.qty')}: {item.qty}</p>
                  </div>
                  <button
                    onClick={() => remove(item.id, item.variantId)}
                    className="self-start p-2 hover:bg-charcoal rounded-lg transition"
                    aria-label={t('common.delete')}
                  >
                    <svg className="w-4 h-4 text-taupe hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-charcoal border-t border-charcoal-light p-4 space-y-3">
              <div className="flex justify-between text-ivory">
                <span>{t('cart.subtotal')}:</span>
                <span className="font-bold">{renderPrice(sub)}</span>
              </div>
              <div className="flex justify-between text-ivory text-lg font-bold">
                <span>{t('cart.total')}:</span>
                <span className="text-gold">{renderPrice(total, 16, "text-gold")}</span>
              </div>
              <Link
                to="/cart"
                onClick={onClose}
                className="block w-full bg-gold text-charcoal py-3 rounded-luxury hover:bg-gold-hover transition font-semibold text-center"
              >
                {t('cart.viewCart')}
              </Link>
              <button
                type="button"
                onClick={handleCheckout}
                className="block w-full bg-charcoal-light text-ivory py-3 rounded-luxury hover:bg-charcoal-lighter transition font-semibold text-center"
              >
                {t('cart.checkout')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
