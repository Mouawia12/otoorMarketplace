import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function SellerProfileStatus() {
  const { t } = useTranslation();
  const { user, fetchUser } = useAuthStore();
  const [status, setStatus] = useState<string>(user?.seller_status ?? "pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/seller/profile/me");
        const st = res.data?.profile?.status ?? user?.seller_status ?? "pending";
        setStatus(st);
        await fetchUser();
      } catch (_error) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchUser, user?.seller_status]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-luxury p-6 sm:p-10 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-full bg-gold/20 text-gold flex items-center justify-center text-2xl">
            {status === "approved" ? "✅" : status === "rejected" ? "⚠️" : "⏳"}
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-charcoal">
          {t("seller.completeProfile", "أكمل ملف البائع")}
        </h1>
        <p className="text-taupe">
          {t("seller.profileHint", "أكمل البيانات للمراجعة والموافقة.")}
        </p>

        <div className="bg-sand/60 rounded-xl p-4 sm:p-5 flex flex-col gap-1 items-center">
          <p className="text-sm text-charcoal-light">{t("seller.status", "الحالة الحالية")}</p>
          <p className="text-xl font-semibold text-charcoal flex items-center gap-2">
            {status === "approved" ? "✅" : status === "rejected" ? "⚠️" : "⏳"}
            {status === "approved"
              ? t("seller.statusApproved", "مقبول")
              : status === "rejected"
              ? t("seller.statusRejected", "مرفوض")
              : t("seller.statusPending", "قيد المراجعة")}
          </p>
        </div>

        {status === "approved" ? (
          <Link
            to="/seller/dashboard"
            className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition gap-2"
          >
            <span>🚀</span>
            <span>{t("seller.goToDashboard", "انتقل للوحة البائع")}</span>
          </Link>
        ) : status === "rejected" ? (
          <div className="space-y-3">
            <p className="text-sm text-alert">{t("seller.rejectedHint", "تم رفض ملفك، يمكنك إعادة الإرسال بعد التعديل.")}</p>
            <Link
              to="/seller/profile-complete"
              className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition gap-2"
            >
              <span>📝</span>
              <span>{t("seller.resubmitProfile", "إعادة إرسال الملف")}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-charcoal">{t("seller.pendingHint", "طلبك قيد المراجعة من قبل الإدارة.")}</p>
            <Link
              to="/seller/profile-complete"
              className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-sand text-charcoal font-semibold hover:bg-sand/80 transition gap-2"
            >
              <span>✏️</span>
              <span>{t("seller.editProfile", "تعديل الملف")}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
