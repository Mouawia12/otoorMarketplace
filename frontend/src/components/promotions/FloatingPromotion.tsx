import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Promotion, fetchActivePromotions } from '../../services/promotionService';
import { resolveImageUrl } from '../../utils/image';

export default function FloatingPromotion() {
  const { i18n } = useTranslation();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchActivePromotions(['FLOATING']);
        if (data.length) {
          setPromotion(data[0]);
        }
      } catch (error) {
        console.error('Failed to load floating promotion', error);
      }
    };
    load();
  }, []);

  if (!promotion || hidden) return null;

  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const isRTL = lang === 'ar';
  const background = promotion.background_color || '#0f172a';
  const color = promotion.text_color || '#ffffff';

  const title = lang === 'ar' ? promotion.title_ar : promotion.title_en;
  const description = lang === 'ar' ? promotion.description_ar : promotion.description_en;
  const button = lang === 'ar' ? promotion.button_text_ar : promotion.button_text_en;
  const badge = lang === 'ar' ? promotion.badge_text_ar : promotion.badge_text_en;
  const image = promotion.image_url ? resolveImageUrl(promotion.image_url) : null;
  const alignRight = promotion.floating_position !== 'bottom-left';

  const dismiss = () => {
    setHidden(true);
  };

  return (
    <div
      className={`fixed z-40 bottom-6 ${alignRight ? 'right-6' : 'left-6'}`}
      style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}
    >
      <div
        className="relative max-w-xs sm:max-w-sm rounded-3xl shadow-2xl border border-black/10 overflow-hidden backdrop-blur-lg"
        style={{ backgroundColor: background, color }}
      >
        <button
          onClick={dismiss}
          className="absolute text-white/80 hover:text-white text-lg leading-none"
          style={{
            top: '12px',
            insetInlineEnd: isRTL ? undefined : '12px',
            insetInlineStart: isRTL ? '12px' : undefined,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
        <div className="p-4 flex gap-3">
          {image && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg bg-black/10 flex-shrink-0">
              <img src={image} alt={title ?? ''} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-2">
            {badge && (
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <span className="inline-flex px-2 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur whitespace-nowrap">
                  {badge}
                </span>
              </div>
            )}
            <h4 className={`text-lg font-bold ${isRTL ? 'text-right' : 'text-left'}`}>{title}</h4>
            {description && <p className="text-sm opacity-90 line-clamp-3">{description}</p>}
            {button && promotion.link_url && (
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <a
                  href={promotion.link_url}
                  className="inline-flex mt-1 bg-white text-charcoal font-semibold text-xs px-3 py-1.5 rounded-full hover:opacity-90 transition"
                >
                  {button}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
