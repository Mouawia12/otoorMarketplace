import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Order } from "../types";

type PaymentState = "loading" | "paid" | "failed" | "pending" | "error";

export default function PaymentStatusPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentState>("loading");
  const [order, setOrder] = useState<Order | null>(null);

  const paymentId =
    searchParams.get("paymentId") ||
    searchParams.get("payment_id") ||
    searchParams.get("PaymentId") ||
    searchParams.get("Id") ||
    searchParams.get("id") ||
    "";
  const invoiceId =
    searchParams.get("invoiceId") ||
    searchParams.get("invoice_id") ||
    searchParams.get("InvoiceId") ||
    "";

  const isSuccessRoute = useMemo(
    () => location.pathname.includes("/payment/success"),
    [location.pathname]
  );

  useEffect(() => {
    let active = true;
    const confirmPayment = async () => {
      if (!paymentId && !invoiceId) {
        setStatus("error");
        return;
      }
      try {
        const response = await api.post("/payments/myfatoorah/confirm", {
          paymentId: paymentId || undefined,
          invoiceId: invoiceId || undefined,
        });
        if (!active) return;
        const payload = response.data ?? {};
        const paymentStatus = payload.payment_status as PaymentState | undefined;
        const returnedOrder = payload.order as Order | undefined;
        if (returnedOrder) {
          setOrder(returnedOrder);
        }
        if (paymentStatus === "paid" && returnedOrder?.id) {
          const params = new URLSearchParams({
            orderId: String(returnedOrder.id),
          });
          if (returnedOrder.torod_tracking_number) {
            params.set("tracking", returnedOrder.torod_tracking_number);
          }
          if (returnedOrder.torod_status) {
            params.set("status", returnedOrder.torod_status);
          }
          navigate(`/order/success?${params.toString()}`, { replace: true });
          return;
        }
        setStatus(paymentStatus ?? "pending");
      } catch (error) {
        if (!active) return;
        setStatus("error");
      }
    };

    confirmPayment();
    return () => {
      active = false;
    };
  }, [paymentId, invoiceId, navigate]);

  const title = (() => {
    if (status === "loading") return t("paymentStatus.verifying", "جارٍ التحقق من الدفع...");
    if (status === "paid") return t("paymentStatus.successTitle", "تم الدفع بنجاح");
    if (status === "failed") return t("paymentStatus.failedTitle", "فشل الدفع");
    if (status === "pending") return t("paymentStatus.pendingTitle", "الدفع قيد المراجعة");
    return t("paymentStatus.errorTitle", "تعذر التحقق من الدفع");
  })();

  const subtitle = (() => {
    if (status === "loading") return t("paymentStatus.wait", "يرجى الانتظار لحظات...");
    if (status === "paid") return t("paymentStatus.redirecting", "يتم تحويلك إلى تفاصيل الطلب.");
    if (status === "failed") return t("paymentStatus.failedDesc", "لم تكتمل عملية الدفع. يمكنك المحاولة مجدداً.");
    if (status === "pending") return t("paymentStatus.pendingDesc", "سنتحقق من حالة الدفع خلال دقائق.");
    return t("paymentStatus.errorDesc", "تأكد من رابط العودة أو تواصل مع الدعم.");
  })();

  return (
    <div className="min-h-screen bg-sand py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-ivory rounded-luxury p-8 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-3">{title}</h1>
            <p className="text-taupe mb-6">{subtitle}</p>
            {order?.id && (
              <p className="text-sm text-charcoal">
                {t("paymentStatus.orderRef", "رقم الطلب")}:{" "}
                <span className="font-semibold text-gold">{order.id}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              {status !== "paid" && (
                <button
                  onClick={() => navigate("/checkout")}
                  className="bg-gold text-charcoal px-6 py-3 rounded-luxury hover:bg-gold-hover transition font-semibold"
                >
                  {t("paymentStatus.backToCheckout", "العودة لإتمام الدفع")}
                </button>
              )}
              <button
                onClick={() => navigate("/orders")}
                className="bg-charcoal text-ivory px-6 py-3 rounded-luxury hover:bg-charcoal-light transition font-semibold"
              >
                {t("paymentStatus.viewOrders", "عرض الطلبات")}
              </button>
            </div>
            {!isSuccessRoute && status === "paid" && (
              <p className="text-sm text-taupe mt-4">
                {t("paymentStatus.redirectHint", "إذا لم يتم تحويلك تلقائياً، انتقل إلى صفحة الطلبات.")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
