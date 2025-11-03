import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "N/A";

  return (
    <div className="min-h-screen bg-sand py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-charcoal mb-4">{t('orderSuccess.title')}</h1>
            <p className="text-xl text-taupe mb-2">{t('orderSuccess.subtitle')}</p>
            <p className="text-lg text-charcoal font-semibold">
              {t('orderSuccess.orderNumber')}: <span className="text-gold">{orderId}</span>
            </p>
          </div>

          <div className="bg-ivory rounded-luxury p-8 mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-charcoal mb-4">{t('orderSuccess.whatNext')}</h2>
            <ul className="text-start space-y-3 text-charcoal">
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('orderSuccess.step1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('orderSuccess.step2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-6 h-6 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{t('orderSuccess.step3')}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/orders"
              className="inline-block bg-gold text-charcoal px-8 py-4 rounded-luxury hover:bg-gold-hover transition font-semibold"
            >
              {t('orderSuccess.viewOrders')}
            </Link>
            <Link
              to="/"
              className="inline-block bg-charcoal text-ivory px-8 py-4 rounded-luxury hover:bg-charcoal-light transition font-semibold"
            >
              {t('orderSuccess.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
