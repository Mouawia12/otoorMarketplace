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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8">
        {/* شبكة الروابط */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {/* الشعار + السطر التعريفي */}
          <div className="flex flex-col items-center sm:items-start">
            <BrandLogo variant="default" size={52} className="mb-3" />
            <p className="text-[13px] sm:text-sm text-taupe text-center sm:text-start leading-6">
              {t('footer.tagline')}
            </p>
          </div>

          {/* حول */}
          <div>
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5">
              {t('footer.about')}
            </h3>
            <ul className="space-y-1.5">
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
          <div>
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5">
              {t('footer.help')}
            </h3>
            <ul className="space-y-1.5">
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
          <div>
            <h3 className="text-base font-semibold text-gold mb-2.5 md:mb-3.5">
              {t('footer.policies')}
            </h3>
            <ul className="space-y-1.5">
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
        <div className="border-t border-charcoal-light mt-5 md:mt-6 pt-5 md:pt-6">
          <p className="text-xs sm:text-[13px] text-taupe text-center">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
