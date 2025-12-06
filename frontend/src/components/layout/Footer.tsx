import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../brand/BrandLogo';
import { usePagesStore } from '../../store/pagesStore';
import { FooterPageKey, LocaleCode } from '../../types/staticPages';

const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com', icon: InstagramIcon },
  { label: 'Twitter', href: 'https://twitter.com', icon: TwitterIcon },
  { label: 'YouTube', href: 'https://youtube.com', icon: YoutubeIcon },
];

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { pages } = usePagesStore();
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as LocaleCode;

  const groups: Array<{ title: string; description: string; pages: FooterPageKey[] }> = [
    {
      title: t('footer.about'),
      description: t('footer.aboutDesc'),
      pages: ['about', 'authenticity', 'how-it-works'],
    },
    {
      title: t('footer.help'),
      description: t('footer.helpDesc'),
      pages: ['help', 'help-buying-preowned', 'help-bidding-guide'],
    },
    {
      title: t('footer.policies'),
      description: t('footer.policiesDesc'),
      pages: ['shipping', 'returns', 'privacy', 'terms', 'contact'],
    },
  ];

  return (
    <footer
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
      className="bg-charcoal text-ivory mt-auto"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-10 space-y-10">
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6 sm:p-8">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
            <BrandLogo size={64} className="mx-auto" />
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80">
              {t('footer.curatedBadge', 'مختارة بعناية')}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold">{t('footer.taglineTitle')}</h2>
            <p className="text-sm text-ivory/80">{t('footer.tagline')}</p>
            <div className="w-full flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.3em] text-gold/80">{t('footer.followUs')}</p>
              <div className="flex gap-3 flex-nowrap overflow-x-auto no-scrollbar justify-center">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition whitespace-nowrap"
                  >
                    <Icon className="w-5 h-5 text-gold" />
                    <span className="text-sm font-semibold">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-1">{t('footer.sectionLabel')}</p>
                <h3 className="text-xl font-bold">{group.title}</h3>
                <p className="text-sm text-ivory/80 mt-1">{group.description}</p>
              </div>
              <ul className="space-y-2">
                {group.pages.map((slug) => {
                  const page = pages[slug];
                  if (!page) return null;
                  return (
                    <li key={slug}>
                      <Link
                        to={`/${slug.replace('help-', 'help/')}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-white/0 hover:bg-white/10 transition"
                      >
                        <span className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg">
                          {page.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{page.label[lang]}</p>
                          <p className="text-xs text-ivory/70 line-clamp-1">
                            {page.heroSubtitle[lang]}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80 mb-2">{t('footer.supportHeadline')}</p>
            <h3 className="text-2xl font-bold mb-3">{t('footer.supportTitle')}</h3>
            <p className="text-sm text-ivory/80 mb-6">{t('footer.supportDesc')}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/contact"
                className="flex-1 text-center bg-gold text-charcoal font-semibold rounded-full py-3 hover:bg-gold-hover transition"
              >
                {t('footer.contact')}
              </Link>
              <Link
                to="/help"
                className="flex-1 text-center border border-white/20 rounded-full py-3 font-semibold hover:bg-white/10 transition"
              >
                {t('footer.helpCenter')}
              </Link>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80">{t('footer.adminCtaLabel')}</p>
            <h3 className="text-xl font-bold">{t('footer.adminCtaTitle')}</h3>
            <p className="text-sm text-ivory/80">{t('footer.adminCtaDesc')}</p>
            <Link
              to="/admin/pages"
              className="inline-flex items-center justify-center gap-2 bg-white text-charcoal font-semibold rounded-full py-3 hover:bg-ivory transition"
            >
              <span>⚙️</span>
              {t('footer.managePages')}
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs text-ivory/70">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M16 11.37A3.37 3.37 0 1 1 12.63 8 3.37 3.37 0 0 1 16 11.37Z" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function TwitterIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 7.5c-.6.3-1.2.4-1.9.5a3.38 3.38 0 0 0 1.5-1.9 6.6 6.6 0 0 1-2.1.8 3.29 3.29 0 0 0-5.7 2.2 3 3 0 0 0 .08.75A9.33 9.33 0 0 1 4 6.2a3.21 3.21 0 0 0 1 4.4 3.35 3.35 0 0 1-1.5-.4 3.3 3.3 0 0 0 2.7 3.2 3.5 3.5 0 0 1-1.5.06 3.3 3.3 0 0 0 3.1 2.3 6.62 6.62 0 0 1-4.1 1.4c-.3 0-.6 0-.9-.05A9.29 9.29 0 0 0 11.1 20c7.2 0 11.3-6 11.3-11.2v-.5a7.78 7.78 0 0 0 1.6-1.8A8 8 0 0 1 20 7.5Z" />
    </svg>
  );
}

function YoutubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M21.6 8.2a2.52 2.52 0 0 0-1.8-1.8c-1.6-.4-8-.4-8-.4s-6.4 0-8 .4A2.52 2.52 0 0 0 2 8.2 26.64 26.64 0 0 0 1.6 12a26.64 26.64 0 0 0 .4 3.8 2.52 2.52 0 0 0 1.8 1.8c1.6.4 8 .4 8 .4s6.4 0 8-.4a2.52 2.52 0 0 0 1.8-1.8 26.64 26.64 0 0 0 .4-3.8 26.64 26.64 0 0 0-.4-3.8ZM9.75 14.5v-5l4.5 2.5Z" />
    </svg>
  );
}
