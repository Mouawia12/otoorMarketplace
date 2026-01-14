import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function OrderSuccessPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "N/A";
  const trackingFromQuery = searchParams.get("tracking") || "";
  const statusFromQuery = searchParams.get("status") || "";

  const state = (location.state || {}) as {
    trackingNumber?: string;
    labelUrl?: string;
    torodStatus?: string;
  };

  const trackingNumber = state.trackingNumber || trackingFromQuery || "";
  const labelUrl = state.labelUrl || "";
  const torodStatus = state.torodStatus || statusFromQuery || "";
  const [liveTracking, setLiveTracking] = useState<{
    trackingNumber?: string;
    status?: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const numericOrderId = Number(orderId);
    if (!Number.isFinite(numericOrderId)) return;

    let active = true;
    const refreshTracking = async () => {
      try {
        const response = await api.get(`/orders/${numericOrderId}/tracking`);
        const payload = response.data ?? {};
        if (!active) return;
        setLiveTracking({
          trackingNumber: payload.tracking_number,
          status: payload.status,
        });
      } catch (error) {
        if (!active) return;
      }
    };

    refreshTracking();
    return () => {
      active = false;
    };
  }, [isAuthenticated, orderId]);

  const resolvedTrackingNumber = liveTracking?.trackingNumber || trackingNumber;
  const resolvedStatus = liveTracking?.status || torodStatus;

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

          {(resolvedTrackingNumber || labelUrl || resolvedStatus) && (
            <div className="bg-white rounded-luxury p-6 shadow-sm border border-gold/50 mb-8 text-left">
              <h3 className="text-xl font-bold text-charcoal mb-3 flex items-center gap-2">
                <span aria-hidden>🚚</span>
                {t("orderSuccess.trackingTitle", "تفاصيل الشحن")}
              </h3>
              <div className="space-y-2 text-charcoal">
                {resolvedTrackingNumber && (
                  <p className="text-sm">
                    {t("orderSuccess.trackingNumber", "رقم التتبع")}:{" "}
                    <span className="font-semibold text-gold break-all">{resolvedTrackingNumber}</span>
                  </p>
                )}
                {resolvedStatus && (
                  <p className="text-sm">
                    {t("orderSuccess.shipmentStatus", "حالة الشحنة")}:{" "}
                    <span className="font-semibold">{resolvedStatus}</span>
                  </p>
                )}
                {labelUrl && (
                  <a
                    className="inline-flex items-center gap-2 text-sm text-charcoal underline hover:text-gold transition"
                    href={labelUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("orderSuccess.downloadLabel", "تحميل ملصق الشحنة")}
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
            </div>
          )}

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
