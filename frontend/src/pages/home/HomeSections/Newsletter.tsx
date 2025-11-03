import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Newsletter() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Newsletter subscription:', email);
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3000);
    }
  };

  return (
    <section className="bg-charcoal py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-ivory mb-4">
          {t('home.newsletterTitle')}
        </h2>
        <p className="text-sand mb-8 max-w-2xl mx-auto">
          {t('home.newsletterDescription')}
        </p>

        {subscribed ? (
          <div className="bg-gold/20 text-gold px-6 py-4 rounded-lg inline-block">
            {t('home.newsletterSuccess')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('home.newsletterPlaceholder')}
              className="flex-1 px-4 py-3 rounded-lg bg-charcoal-light text-ivory border border-charcoal-light focus:border-gold focus:outline-none"
              required
              dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
            />
            <button
              type="submit"
              className="bg-gold text-charcoal px-8 py-3 rounded-lg font-semibold hover:bg-gold-light transition-colors shadow-luxury"
            >
              {t('home.newsletterCta')}
            </button>
          </form>
        )}

        <p className="text-xs text-taupe mt-4">
          {t('home.newsletterConsent')}
        </p>
      </div>
    </section>
  );
}
