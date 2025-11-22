import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../brand/BrandLogo';

export default function Footer() {
  const { t, i18n } = useTranslation();

  return (
    <footer
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      className="bg-charcoal text-ivory mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-8">
        {/* شبكة الروابط */}
        <div className="flex flex-col gap-8 md:grid md:grid-cols-4 md:gap-6">
          {/* الشعار + السطر التعريفي */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <BrandLogo size={56} className="mb-3" />
            <p className="text-[13px] sm:text-sm text-taupe leading-6 max-w-sm">
              {t('footer.tagline')}
            </p>
          </div>

          {/* حول */}
          <div className="pt-4 md:pt-0 border-t border-charcoal-light/40 md:border-none">
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5 text-center md:text-left">
              {t('footer.about')}
            </h3>
            <ul className="space-y-1.5 text-center md:text-left">
              {/* زر المدونة */}
              <li>
                <Link
                  to="/blog"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('nav.blog')}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link
                  to="/authenticity"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.authenticity')}
                </Link>
              </li>
              <li>
                <Link
                  to="/how-it-works"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.howItWorks')}
                </Link>
              </li>
            </ul>
          </div>

          {/* المساعدة */}
          <div className="pt-4 md:pt-0 border-t border-charcoal-light/40 md:border-none">
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5 text-center md:text-left">
              {t('footer.help')}
            </h3>
            <ul className="space-y-1.5 text-center md:text-left">
              <li>
                <Link
                  to="/help"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.shipping')}
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.returns')}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* السياسات */}
          <div className="pt-4 md:pt-0 border-t border-charcoal-light/40 md:border-none">
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5 text-center md:text-left">
              {t('footer.policies')}
            </h3>
            <ul className="space-y-1.5 text-center md:text-left">
              <li>
                <Link
                  to="/privacy"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-[13px] sm:text-sm text-taupe hover:text-gold transition block py-1 focus:outline-none focus:ring-2 focus:ring-gold/40 rounded"
                >
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* سطر الحقوق */}
        <div className="border-t border-charcoal-light mt-6 md:mt-8 pt-5 md:pt-6">
          <p className="text-xs sm:text-[13px] text-taupe text-center">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
