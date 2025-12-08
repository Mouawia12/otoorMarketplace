import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FooterPageContent, FooterPageKey, LocaleCode } from '../types/staticPages';
import { defaultFooterPages, footerPageKeys, footerPageList, getDefaultFooterPage } from '../content/footerPages';
import {
  listAdminFooterPages,
  publishFooterPage,
  saveFooterPageDraft,
  type FooterPageRecord,
} from '../services/footerPages';

type EditableField = 'heroTitle' | 'heroSubtitle' | 'seoDescription';

interface PageMeta {
  status?: FooterPageRecord['status'];
  updatedAt?: string;
  publishedAt?: string | null;
}

const createMetaState = () =>
  footerPageKeys.reduce<Record<FooterPageKey, PageMeta>>((acc, slug) => {
    acc[slug] = {};
    return acc;
  }, {} as Record<FooterPageKey, PageMeta>);

const createDirtyState = () =>
  footerPageKeys.reduce<Record<FooterPageKey, boolean>>((acc, slug) => {
    acc[slug] = false;
    return acc;
  }, {} as Record<FooterPageKey, boolean>);

export default function AdminSitePagesPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as LocaleCode;

  const [pages, setPages] = useState<Record<FooterPageKey, FooterPageContent>>(defaultFooterPages);
  const [meta, setMeta] = useState<Record<FooterPageKey, PageMeta>>(createMetaState);
  const [dirty, setDirty] = useState<Record<FooterPageKey, boolean>>(createDirtyState);
  const [activeSlug, setActiveSlug] = useState<FooterPageKey>(footerPageList[0]?.slug ?? 'about');
  const [editingLocale, setEditingLocale] = useState<LocaleCode>('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<FooterPageKey | null>(null);
  const [publishingSlug, setPublishingSlug] = useState<FooterPageKey | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const records = await listAdminFooterPages();
        if (!mounted) return;
        setPages((prev) => {
          const next = { ...prev };
          records.forEach((record) => {
            next[record.slug] = record.draftContent ?? prev[record.slug];
          });
          return next;
        });
        const metaState = createMetaState();
        records.forEach((record) => {
          metaState[record.slug] = {
            status: record.status,
            updatedAt: record.updatedAt,
            publishedAt: record.publishedAt,
          };
        });
        setMeta(metaState);
      } catch {
        if (mounted) {
          setError(t('common.errorLoading', 'تعذّر تحميل البيانات'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  const page = pages[activeSlug] ?? getDefaultFooterPage(activeSlug);

  const sidebarPages = useMemo(
    () =>
      footerPageList.map((item) => ({
        slug: item.slug,
        icon: item.icon,
        label: pages[item.slug]?.label ?? item.label,
        lastUpdated: pages[item.slug]?.lastUpdated ?? item.lastUpdated,
        meta: meta[item.slug],
        isDirty: Boolean(dirty[item.slug]),
      })),
    [meta, pages, dirty]
  );

  const markDirty = (slug: FooterPageKey) =>
    setDirty((prev) => ({
      ...prev,
      [slug]: true,
    }));

  const handleHeroFieldChange = (field: EditableField, value: string) => {
    setPages((prev) => {
      const current = prev[activeSlug] ?? getDefaultFooterPage(activeSlug);
      return {
        ...prev,
        [activeSlug]: {
          ...current,
          [field]: {
            ...current[field],
            [editingLocale]: value,
          },
        },
      };
    });
    markDirty(activeSlug);
  };

  const handleHeroImageChange = (value: string) => {
    setPages((prev) => ({
      ...prev,
      [activeSlug]: { ...(prev[activeSlug] ?? getDefaultFooterPage(activeSlug)), heroImage: value },
    }));
    markDirty(activeSlug);
  };

  const updateSections = (updater: (sections: FooterPageContent['sections']) => FooterPageContent['sections']) => {
    setPages((prev) => {
      const current = prev[activeSlug] ?? getDefaultFooterPage(activeSlug);
      return {
        ...prev,
        [activeSlug]: {
          ...current,
          sections: updater(current.sections),
        },
      };
    });
    markDirty(activeSlug);
  };

  const handleSectionFieldChange = (sectionId: string, field: 'title' | 'body', value: string) => {
    updateSections((sections) =>
      sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [field]: {
                ...section[field],
                [editingLocale]: value,
              },
            }
          : section
      )
    );
  };

  const handleSectionImageChange = (sectionId: string, value: string) => {
    updateSections((sections) =>
      sections.map((section) => (section.id === sectionId ? { ...section, image: value } : section))
    );
  };

  const handleHighlightChange = (sectionId: string, index: number, value: string) => {
    updateSections((sections) =>
      sections.map((section) => {
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
      })
    );
  };

  const handleAddHighlight = (sectionId: string) => {
    updateSections((sections) =>
      sections.map((section) => {
        if (section.id !== sectionId) return section;
        const highlights = [
          ...section.highlights,
          { ar: t('admin.newHighlightPlaceholder', 'نقطة رئيسية جديدة'), en: 'New highlight' },
        ];
        return { ...section, highlights };
      })
    );
  };

  const handleRemoveHighlight = (sectionId: string, index: number) => {
    updateSections((sections) =>
      sections.map((section) => {
        if (section.id !== sectionId) return section;
        const highlights = section.highlights.filter((_, idx) => idx !== index);
        return { ...section, highlights };
      })
    );
  };

  const handleAddSection = () => {
    updateSections((sections) => [
      ...sections,
      {
        id: `${activeSlug}-${Date.now()}`,
        title: { ar: t('admin.newSection', 'قسم جديد'), en: 'New Section' },
        body: { ar: '', en: '' },
        image: page.heroImage,
        highlights: [],
      },
    ]);
  };

  const handleRemoveSection = (sectionId: string) => {
    if (page.sections.length === 1) return;
    updateSections((sections) => sections.filter((section) => section.id !== sectionId));
  };

  const handleResetPage = () => {
    setPages((prev) => ({
      ...prev,
      [activeSlug]: getDefaultFooterPage(activeSlug),
    }));
    markDirty(activeSlug);
  };

  const handleSaveDraft = async () => {
    setSavingSlug(activeSlug);
    setSuccessMessage(null);
    try {
      const payload = {
        ...pages[activeSlug],
        lastUpdated: new Date().toISOString(),
      };
      setPages((prev) => ({
        ...prev,
        [activeSlug]: payload,
      }));
      const record = await saveFooterPageDraft(activeSlug, payload);
      setMeta((prev) => ({
        ...prev,
        [activeSlug]: {
          status: record.status,
          updatedAt: record.updatedAt,
          publishedAt: record.publishedAt,
        },
      }));
      setDirty((prev) => ({ ...prev, [activeSlug]: false }));
      setSuccessMessage(t('admin.pagesManager.savedDraft', 'تم حفظ المسودة'));
    } catch {
      setError(t('admin.pagesManager.saveFailed', 'تعذر حفظ المسودة'));
    } finally {
      setSavingSlug(null);
    }
  };

  const handlePublish = async () => {
    setPublishingSlug(activeSlug);
    setSuccessMessage(null);
    try {
      const record = await publishFooterPage(activeSlug);
      setMeta((prev) => ({
        ...prev,
        [activeSlug]: {
          status: record.status,
          updatedAt: record.updatedAt,
          publishedAt: record.publishedAt,
        },
      }));
      setDirty((prev) => ({ ...prev, [activeSlug]: false }));
      setSuccessMessage(t('admin.pagesManager.publishSuccess', 'تم نشر الصفحة'));
    } catch {
      setError(t('admin.pagesManager.publishFailed', 'تعذر نشر الصفحة'));
    } finally {
      setPublishingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gold">{t('admin.pagesManager.breadcrumb')}</p>
          <h1 className="text-3xl font-extrabold text-charcoal mt-2">{t('admin.pagesManager.title')}</h1>
          <p className="text-charcoal-light">{t('admin.pagesManager.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['ar', 'en'] as LocaleCode[]).map((locale) => (
            <button
              key={locale}
              onClick={() => setEditingLocale(locale)}
              className={`px-4 py-2 rounded-full border text-sm font-semibold ${
                editingLocale === locale ? 'bg-gold text-charcoal border-gold' : 'border-sand text-charcoal'
              }`}
            >
              {locale.toUpperCase()}
            </button>
          ))}
          <button
            onClick={handleResetPage}
            className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
          >
            {t('admin.pagesManager.resetPage')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 text-green-700 rounded-2xl px-4 py-3 text-sm">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="bg-white rounded-3xl shadow-soft-lg border border-sand/70 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-charcoal uppercase tracking-[0.3em]">
            {t('admin.pagesManager.sidebarTitle')}
          </h2>
          <div className="space-y-3">
            {sidebarPages.map(({ slug, icon, label, lastUpdated, meta: metaInfo, isDirty }) => (
              <button
                key={slug}
                onClick={() => setActiveSlug(slug)}
                className={`w-full text-left rounded-2xl border px-4 py-3 flex items-center gap-3 transition ${
                  slug === activeSlug ? 'bg-charcoal text-ivory border-charcoal' : 'border-sand hover:bg-sand/50'
                }`}
              >
                <span className="text-2xl" aria-hidden>{icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {label[lang]}
                    {isDirty && <span className="text-[10px] text-gold uppercase tracking-wider">{t('admin.pagesManager.unsaved', 'غير محفوظ')}</span>}
                  </p>
                  <p className="text-xs text-charcoal/60 line-clamp-1">
                    {new Date(lastUpdated).toLocaleDateString(i18n.language)}
                  </p>
                </div>
                {metaInfo?.status && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                      metaInfo.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {metaInfo.status === 'PUBLISHED' ? t('admin.pagesManager.published', 'منشورة') : t('admin.pagesManager.draft', 'مسودة')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={handleSaveDraft}
              disabled={savingSlug === activeSlug || !dirty[activeSlug]}
              className={`px-4 py-2 rounded-full font-semibold ${
                dirty[activeSlug]
                  ? 'bg-charcoal text-ivory hover:bg-charcoal/90'
                  : 'bg-sand text-charcoal cursor-not-allowed'
              }`}
            >
              {savingSlug === activeSlug ? t('common.loading') : t('admin.pagesManager.saveDraft', 'حفظ المسودة')}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishingSlug === activeSlug}
              className="px-4 py-2 rounded-full font-semibold bg-gold text-charcoal hover:bg-gold-hover"
            >
              {publishingSlug === activeSlug ? t('common.loading') : t('admin.pagesManager.publish', 'نشر الصفحة')}
            </button>
          </div>
          <div className="bg-white rounded-3xl shadow-soft-lg border border-sand/70 p-6 space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.4em] text-gold">{t('admin.pagesManager.heroSection')}</p>
              <h2 className="text-2xl font-bold text-charcoal">{page.label[lang]}</h2>
              {meta[activeSlug]?.publishedAt && (
                <p className="text-xs text-charcoal-light">
                  {t('admin.pagesManager.lastPublished', 'آخر نشر')}: {new Date(meta[activeSlug]!.publishedAt!).toLocaleString(i18n.language)}
                </p>
              )}
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
                  <p className="text-xs uppercase tracking-[0.3em] text-gold">
                    {t('admin.pagesManager.sectionLabel')} #{idx + 1}
                  </p>
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
