import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FooterPageContent, FooterPageKey, LocaleCode } from '../types/staticPages';
import { usePagesStore } from '../store/pagesStore';

type EditableField = 'heroTitle' | 'heroSubtitle' | 'seoDescription';

export default function AdminSitePagesPage() {
  const { t, i18n } = useTranslation();
  const { pages, updatePageContent, resetPage } = usePagesStore();
  const orderedPages = useMemo(
    () => Object.values(pages).sort((a, b) => a.label.ar.localeCompare(b.label.ar, 'ar')),
    [pages]
  );

  const [activeSlug, setActiveSlug] = useState<FooterPageKey>(orderedPages[0]?.slug ?? 'about');
  const [editingLocale, setEditingLocale] = useState<LocaleCode>('ar');
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as LocaleCode;
  const page = pages[activeSlug];

  const handleHeroFieldChange = (field: EditableField, value: string) => {
    if (!page) return;
    updatePageContent(activeSlug, {
      [field]: {
        ...page[field],
        [editingLocale]: value,
      },
    } as Partial<FooterPageContent>);
  };

  const handleHeroImageChange = (value: string) => {
    updatePageContent(activeSlug, {
      heroImage: value,
    });
  };

  const handleSectionFieldChange = (
    sectionId: string,
    field: 'title' | 'body',
    value: string
  ) => {
    if (!page) return;
    const sections = page.sections.map((section) =>
      section.id === sectionId
        ? {
            ...section,
            [field]: {
              ...section[field],
              [editingLocale]: value,
            },
          }
        : section
    );
    updatePageContent(activeSlug, { sections });
  };

  const handleSectionImageChange = (sectionId: string, value: string) => {
    if (!page) return;
    const sections = page.sections.map((section) =>
      section.id === sectionId ? { ...section, image: value } : section
    );
    updatePageContent(activeSlug, { sections });
  };

  const handleHighlightChange = (sectionId: string, index: number, value: string) => {
    if (!page) return;
    const sections = page.sections.map((section) => {
      if (section.id !== sectionId) return section;
      const highlights = section.highlights.map((highlight, idx) =>
        idx === index
          ? {
              ...highlight,
              [editingLocale]: value,
            }
          : highlight
      );
      return { ...section, highlights };
    });
    updatePageContent(activeSlug, { sections });
  };

  const handleAddHighlight = (sectionId: string) => {
    if (!page) return;
    const sections = page.sections.map((section) => {
      if (section.id !== sectionId) return section;
      const highlights = [
        ...section.highlights,
        { ar: t('admin.newHighlightPlaceholder', 'نقطة رئيسية جديدة'), en: 'New highlight' },
      ];
      return { ...section, highlights };
    });
    updatePageContent(activeSlug, { sections });
  };

  const handleRemoveHighlight = (sectionId: string, index: number) => {
    if (!page) return;
    const sections = page.sections.map((section) => {
      if (section.id !== sectionId) return section;
      const highlights = section.highlights.filter((_, idx) => idx !== index);
      return { ...section, highlights };
    });
    updatePageContent(activeSlug, { sections });
  };

  const handleAddSection = () => {
    if (!page) return;
    const newSectionId = `${activeSlug}-${Date.now()}`;
    const sections = [
      ...page.sections,
      {
        id: newSectionId,
        title: { ar: t('admin.newSection', 'قسم جديد'), en: 'New Section' },
        body: { ar: '', en: '' },
        image: page.heroImage,
        highlights: [],
      },
    ];
    updatePageContent(activeSlug, { sections });
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!page) return;
    if (page.sections.length === 1) return;
    const sections = page.sections.filter((section) => section.id !== sectionId);
    updatePageContent(activeSlug, { sections });
  };

  if (!page) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gold">{t('admin.pagesManager.breadcrumb')}</p>
          <h1 className="text-3xl font-extrabold text-charcoal mt-2">{t('admin.pagesManager.title')}</h1>
          <p className="text-charcoal-light">{t('admin.pagesManager.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['ar', 'en'] as LocaleCode[]).map((locale) => (
            <button
              key={locale}
              onClick={() => setEditingLocale(locale)}
              className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                editingLocale === locale
                  ? 'bg-gold text-charcoal border-gold'
                  : 'border-sand text-charcoal'
              }`}
            >
              {locale.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => resetPage(activeSlug)}
            className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
          >
            {t('admin.pagesManager.resetPage')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="bg-white rounded-3xl shadow-soft-lg border border-sand/70 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-charcoal uppercase tracking-[0.3em]">
            {t('admin.pagesManager.sidebarTitle')}
          </h2>
          <div className="space-y-3">
            {orderedPages.map((meta) => (
              <button
                key={meta.slug}
                onClick={() => setActiveSlug(meta.slug)}
                className={`w-full text-left rounded-2xl border px-4 py-3 flex items-center gap-3 transition ${
                  meta.slug === activeSlug
                    ? 'bg-charcoal text-ivory border-charcoal'
                    : 'border-sand hover:bg-sand/50'
                }`}
              >
                <span className="text-2xl" aria-hidden>{meta.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{meta.label[lang]}</p>
                  <p className="text-xs text-charcoal/60 line-clamp-1">
                    {new Date(meta.lastUpdated).toLocaleDateString(i18n.language)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="bg-white rounded-3xl shadow-soft-lg border border-sand/70 p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.4em] text-gold">{t('admin.pagesManager.heroSection')}</p>
              <h2 className="text-2xl font-bold text-charcoal">{page.label[lang]}</h2>
            </div>
            <div className="grid gap-4">
              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.heroTitle')}
                <textarea
                  value={page.heroTitle[editingLocale] ?? ''}
                  onChange={(e) => handleHeroFieldChange('heroTitle', e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </label>
              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.heroSubtitle')}
                <textarea
                  value={page.heroSubtitle[editingLocale] ?? ''}
                  onChange={(e) => handleHeroFieldChange('heroSubtitle', e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                  rows={3}
                />
              </label>
              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.seoDescription')}
                <textarea
                  value={page.seoDescription[editingLocale] ?? ''}
                  onChange={(e) => handleHeroFieldChange('seoDescription', e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                  rows={2}
                />
              </label>
              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.heroImage')}
                <input
                  value={page.heroImage}
                  onChange={(e) => handleHeroImageChange(e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                  placeholder="https://"
                />
              </label>
            </div>
          </div>

          {page.sections.map((section, idx) => (
            <div
              key={section.id}
              className="bg-white rounded-3xl shadow-soft border border-sand/70 p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gold">{t('admin.pagesManager.sectionLabel')} #{idx + 1}</p>
                  <h3 className="text-xl font-bold text-charcoal">{section.title[lang]}</h3>
                </div>
                {page.sections.length > 1 && (
                  <button
                    onClick={() => handleRemoveSection(section.id)}
                    className="text-red-600 text-sm font-semibold hover:underline"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>

              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.sectionTitle')}
                <input
                  value={section.title[editingLocale] ?? ''}
                  onChange={(e) => handleSectionFieldChange(section.id, 'title', e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                />
              </label>

              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.sectionBody')}
                <textarea
                  value={section.body[editingLocale] ?? ''}
                  onChange={(e) => handleSectionFieldChange(section.id, 'body', e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                  rows={4}
                />
              </label>

              <label className="text-sm font-semibold text-charcoal">
                {t('admin.pagesManager.sectionImage')}
                <input
                  value={section.image ?? ''}
                  onChange={(e) => handleSectionImageChange(section.id, e.target.value)}
                  className="mt-2 w-full border border-sand rounded-2xl px-4 py-3 focus:outline-none focus:border-gold"
                  placeholder="https://"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-charcoal">
                    {t('admin.pagesManager.highlights')}
                  </p>
                  <button
                    onClick={() => handleAddHighlight(section.id)}
                    className="text-sm text-gold font-semibold hover:underline"
                  >
                    {t('admin.pagesManager.addHighlight')}
                  </button>
                </div>

                {(section.highlights ?? []).map((highlight, highlightIdx) => (
                  <div key={`${section.id}-hl-${highlightIdx}`} className="flex items-center gap-2">
                    <input
                      value={highlight[editingLocale] ?? ''}
                      onChange={(e) =>
                        handleHighlightChange(section.id, highlightIdx, e.target.value)
                      }
                      className="flex-1 border border-sand rounded-2xl px-4 py-2 focus:outline-none focus:border-gold"
                    />
                    <button
                      onClick={() => handleRemoveHighlight(section.id, highlightIdx)}
                      className="text-xs text-red-500 font-semibold"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleAddSection}
            className="w-full border border-dashed border-gold text-gold font-semibold py-4 rounded-3xl hover:bg-gold/5 transition"
          >
            {t('admin.pagesManager.addSection')}
          </button>
        </section>
      </div>
    </div>
  );
}
