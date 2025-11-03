import { useTranslation } from 'react-i18next';

export default function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-h1 text-charcoal mb-8">{t('footer.helpCenter')}</h1>
      <div className="bg-white rounded-luxury p-8 shadow-soft">
        <p className="text-charcoal mb-4">{t('common.comingSoon')}</p>
      </div>
    </div>
  );
}
