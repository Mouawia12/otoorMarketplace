import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

export default function SellerProfileStatus() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      } catch (e) {
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
    <div className="max-w-3xl mx-auto bg-white rounded-luxury shadow-luxury p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-charcoal mb-2">
        {t("seller.completeProfile", "أكمل ملف البائع")}
      </h1>
      <p className="text-taupe mb-6">{t("seller.profileHint", "أكمل البيانات للمراجعة والموافقة.")}</p>

      <div className="border border-sand/70 rounded-xl p-4 mb-6">
        <p className="text-sm text-charcoal-light mb-1">{t("seller.status", "الحالة الحالية")}</p>
        <p className="text-lg font-semibold text-charcoal">
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
          className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
        >
          {t("seller.goToDashboard", "انتقل للوحة البائع")}
        </Link>
      ) : status === "rejected" ? (
        <div className="space-y-3">
          <p className="text-sm text-alert">{t("seller.rejectedHint", "تم رفض ملفك، يمكنك إعادة الإرسال بعد التعديل.")}</p>
          <Link
            to="/seller/profile-complete"
            className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
          >
            {t("seller.resubmitProfile", "إعادة إرسال الملف")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-charcoal">{t("seller.pendingHint", "طلبك قيد المراجعة من قبل الإدارة.")}</p>
          <Link
            to="/seller/profile-complete"
            className="inline-flex items-center justify-center px-5 py-3 rounded-luxury bg-sand text-charcoal font-semibold hover:bg-sand/80 transition"
          >
            {t("seller.editProfile", "تعديل الملف")}
          </Link>
        </div>
      )}
    </div>
  );
}
