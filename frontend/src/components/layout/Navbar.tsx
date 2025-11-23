import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import BrandLogo from '../brand/BrandLogo';
import { useState } from 'react';
import CartIconButton from '../cart/CartIconButton';
import WishlistIconButton from '../wishlist/WishlistIconButton';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { language, setLanguage } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', newLang);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
    }
    setMobileSearchOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const closeMobileSearch = () => setMobileSearchOpen(false);

  return (
    <nav dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="sticky top-0 z-50 bg-charcoal text-ivory shadow-lg">

      {/* ===== Mobile + Tablet (<lg) ===== */}
      <div className="lg:hidden h-14">
        <div className="grid grid-cols-3 items-center h-full px-3">
          {/* Left: hamburger */}
          <div className="flex">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg hover:bg-charcoal-light transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Center: logo */}
          <div className="flex justify-center">
            <Link to="/" aria-label="Home" className="block">
              <BrandLogo size={45} />
            </Link>
          </div>

          {/* Right: wishlist + cart + search (بدون زر اللغة على الجوال) */}
          <div className="flex justify-end items-center gap-1">
            <WishlistIconButton />
            <CartIconButton />
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="p-2.5 rounded-lg hover:bg-charcoal-light transition min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Desktop (≥lg) ===== */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link to="/" className="flex-shrink-0">
              <BrandLogo size={60} />
            </Link>

            <div className="flex items-center gap-4 lg:gap-6 flex-1 justify-end">
              <form onSubmit={handleSearch} className="flex-1 max-w-md" style={{ marginInline: '1rem' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.search')}
                  className="w-full px-4 py-2 rounded-luxury bg-charcoal-light text-ivory placeholder-taupe focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]"
                />
              </form>

              <Link to="/" className="hover:text-gold transition whitespace-nowrap">{t('nav.home')}</Link>
              <Link to="/new" className="hover:text-gold transition whitespace-nowrap">{t('nav.new')}</Link>
              <Link to="/used" className="hover:text-gold transition whitespace-nowrap">{t('nav.used')}</Link>
              <Link to="/auctions" className="hover:text-gold transition whitespace-nowrap">{t('nav.auctions')}</Link>
              <Link to="/blog" className="hover:text-gold transition whitespace-nowrap">{t('nav.blog')}</Link>

              <WishlistIconButton />
              <CartIconButton />

              {isAuthenticated ? (
                <>
              {user?.roles?.includes('seller') ? (
                <Link to="/seller/dashboard" className="hover:text-gold transition whitespace-nowrap">{t('nav.sellerDashboard')}</Link>
              ) : (
                <Link to="/account" className="hover:text-gold transition whitespace-nowrap">{t('nav.dashboard')}</Link>
              )}
                  {(user?.roles?.includes('admin') || user?.roles?.includes('super_admin')) && (
                    <Link to="/admin/dashboard" className="hover:text-gold transition whitespace-nowrap">{t('nav.adminDashboard')}</Link>
                  )}
                  <button onClick={logout} className="hover:text-gold transition whitespace-nowrap min-h-[44px]">
                    {t('common.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="hover:text-gold transition whitespace-nowrap">
                    {t('common.login')}
                  </Link>
                  {/* تم حذف زر التسجيل من الهيدر */}
                </>
              )}

              {/* زر اللغة في الديسكتوب فقط */}
              <button
                onClick={toggleLanguage}
                className="bg-charcoal-light px-3 py-2 rounded-luxury hover:bg-gold hover:text-charcoal transition font-semibold min-w-[44px] min-h-[44px]"
                aria-label={t('common.toggleLanguage')}
              >
                {language === 'ar' ? 'EN' : 'AR'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Mobile Search Overlay ===== */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 bg-charcoal z-[60] lg:hidden">
          <div className="h-14 flex items-center px-3 border-b border-charcoal-light">
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                className="flex-1 px-4 py-2.5 rounded-lg bg-charcoal-light text-ivory placeholder-taupe focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]"
                autoFocus
              />
              <button
                type="button"
                onClick={closeMobileSearch}
                className="p-2.5 rounded-lg hover:bg-charcoal-light min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== Mobile/Tablet Drawer (<lg) ===== */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60] lg:hidden" onClick={closeMobileMenu} />
          <div
            className="fixed top-0 h-full w-72 bg-charcoal z-[60] lg:hidden shadow-luxury overflow-y-auto"
            style={{ insetInlineStart: 0 }}
          >
            {/* شريط علوي: زر اللغة + زر الإغلاق على نفس الصف
                - بالعربية: اللغة يمين والإغلاق يسار
                - بالإنجليزية: اللغة يسار والإغلاق يمين */}
            <div className="p-3 border-b border-charcoal-light">
              {i18n.language === 'ar' ? (
                <div className="flex items-center justify-between">
                  {/* زر اللغة يمين */}
                  <button
                    onClick={toggleLanguage}
                    className="w-9 h-9 rounded-md bg-charcoal-light hover:bg-gold hover:text-charcoal font-bold text-sm flex items-center justify-center"
                    aria-label={t('common.toggleLanguage')}
                  >
                    {/* عندما اللغة عربية نعرض E (التبديل للإنجليزية) */}
                    E
                  </button>

                  {/* زر الإغلاق يسار */}
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 rounded-lg hover:bg-charcoal-light min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {/* زر الإغلاق يمين */}
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 rounded-lg hover:bg-charcoal-light min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Close menu"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* زر اللغة يسار */}
                  <button
                    onClick={toggleLanguage}
                    className="w-9 h-9 rounded-md bg-charcoal-light hover:bg-gold hover:text-charcoal font-bold text-sm flex items-center justify-center"
                    aria-label={t('common.toggleLanguage')}
                  >
                    {/* عندما اللغة إنجليزية نعرض ع (التبديل للعربية) */}
                    ع
                  </button>
                </div>
              )}
            </div>

            {/* روابط القائمة */}
            <nav className="p-4 space-y-1">
              <Link to="/" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                {t('nav.home')}
              </Link>
              <Link to="/new" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                {t('nav.new')}
              </Link>
              <Link to="/used" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                {t('nav.used')}
              </Link>
              <Link to="/auctions" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                {t('nav.auctions')}
              </Link>
              <Link to="/blog" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                {t('nav.blog')}
              </Link>

              {isAuthenticated ? (
                <>
                  <div className="border-t border-charcoal-light my-2 pt-2">
                    {user?.roles?.includes('seller') ? (
                      <Link to="/seller/dashboard" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                        {t('nav.sellerDashboard')}
                      </Link>
                    ) : (
                      <Link to="/account" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                        {t('nav.dashboard')}
                      </Link>
                    )}
                    <Link to="/account" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                      {t('nav.account')}
                    </Link>
                    {(user?.roles?.includes('admin') || user?.roles?.includes('super_admin')) && (
                      <Link to="/admin/dashboard" onClick={closeMobileMenu} className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center">
                        {t('nav.adminDashboard')}
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => { logout(); closeMobileMenu(); }}
                    className="w-full text-left py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px]"
                  >
                    {t('common.logout')}
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-charcoal-light my-2 pt-2">
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className="block py-3 px-4 hover:bg-charcoal-light rounded-lg transition min-h-[44px] flex items-center"
                    >
                      {t('common.login')}
                    </Link>
                    {/* لا زر تسجيل في الجوال */}
                  </div>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </nav>
  );
}
