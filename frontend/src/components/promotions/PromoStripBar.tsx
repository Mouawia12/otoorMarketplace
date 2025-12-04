import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Promotion, fetchActivePromotions } from '../../services/promotionService';

const STORAGE_KEY = 'promo_strip_dismissed';

const loadDismissed = (): number[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDismissed = (ids: number[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};

export default function PromoStripBar() {
  const { i18n } = useTranslation();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadDismissed();
  });

  const activePromotions = useMemo(() => {
    return promotions.filter((promo) => !dismissed.includes(promo.id));
  }, [promotions, dismissed]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchActivePromotions(['STRIP']);
        setPromotions(data);
      } catch (error) {
        console.error('Failed to load strips', error);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!activePromotions.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromotions.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [activePromotions.length]);

  if (!activePromotions.length) {
    return null;
  }

  const current = activePromotions[Math.min(currentIndex, activePromotions.length - 1)];
  if (!current) return null;

  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const title = lang === 'ar' ? current.title_ar : current.title_en;
  const subtitle = lang === 'ar' ? current.subtitle_ar : current.subtitle_en;
  const badge = lang === 'ar' ? current.badge_text_ar : current.badge_text_en;
  const button = lang === 'ar' ? current.button_text_ar : current.button_text_en;

  const background = current.background_color || '#0f172a';
  const color = current.text_color || '#ffffff';

  const dismiss = () => {
    const nextDismissed = [...dismissed, current.id];
    setDismissed(nextDismissed);
    saveDismissed(nextDismissed);
  };

  return (
    <div
      className="w-full"
      style={{ backgroundColor: background, color }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          {badge && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/25 backdrop-blur">
              {badge}
            </span>
          )}
          <div className="text-sm sm:text-base font-semibold whitespace-pre-line flex flex-wrap items-center gap-2">
            <span>{title}</span>
            {subtitle && <span className="font-normal opacity-80">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {current.link_url && button && (
            <a
              href={current.link_url}
              className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-white text-charcoal hover:opacity-90 transition"
            >
              {button}
            </a>
          )}
          <button
            onClick={dismiss}
            className="text-white/80 hover:text-white text-lg leading-none"
            aria-label="Dismiss promotion"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
