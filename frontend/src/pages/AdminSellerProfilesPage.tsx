import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

type Profile = {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  city: string;
  address: string;
  national_id: string;
  iban: string;
  bank_name: string;
  status: string;
  user?: { full_name: string; email?: string };
  created_at?: string;
};

const STATUS_OPTIONS = ["pending", "approved", "rejected"] as const;

export default function AdminSellerProfilesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter !== "all") params.status = filter;
      const res = await api.get("/seller/profile", { params });
      setProfiles(res.data.profiles ?? []);
    } catch (err) {
      console.error("Failed to load profiles", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userId: number, status: string) => {
    try {
      setUpdatingId(userId);
      const res = await api.patch(`/seller/profile/${userId}/status`, { status });
      setProfiles((prev) => prev.map((p) => (p.user_id === userId ? { ...p, status: res.data.status } : p)));
    } catch (err: any) {
      alert(err?.response?.data?.detail || t("common.error"));
    } finally {
      setUpdatingId(null);
    }
  };

  const canView = user?.roles?.some((r) => ["admin", "super_admin"].includes(r.toLowerCase()));
  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("orders.authRequired")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h1 className="text-h2 text-charcoal">{t("admin.sellerProfiles", "طلبات البائعين")}</h1>
          <div className="flex gap-2 flex-wrap">
            {(["all", ...STATUS_OPTIONS] as string[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-luxury text-sm font-semibold ${
                  filter === s ? "bg-gold text-charcoal" : "bg-sand/70 text-charcoal-light hover:bg-sand"
                }`}
              >
                {s === "all" ? t("common.all") : t(`seller.status${s.charAt(0).toUpperCase() + s.slice(1)}`, s)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">#</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("account.fullName")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("account.email")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("account.phone")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.city")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.status", "الحالة")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-charcoal-light">{p.id}</td>
                  <td className="px-4 py-3 text-charcoal font-semibold">{p.full_name}</td>
                  <td className="px-4 py-3 text-charcoal-light">{p.user?.email}</td>
                  <td className="px-4 py-3 text-charcoal-light">{p.phone}</td>
                  <td className="px-4 py-3 text-charcoal-light">{p.city}</td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border border-sand/70">
                      {p.status === "approved"
                        ? t("seller.statusApproved", "مقبول")
                        : p.status === "rejected"
                        ? t("seller.statusRejected", "مرفوض")
                        : t("seller.statusPending", "قيد المراجعة")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(p.user_id, "approved")}
                        disabled={updatingId === p.user_id}
                        className="px-3 py-1 rounded-luxury bg-success text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {t("common.approve", "قبول")}
                      </button>
                      <button
                        onClick={() => updateStatus(p.user_id, "rejected")}
                        disabled={updatingId === p.user_id}
                        className="px-3 py-1 rounded-luxury bg-alert text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {t("common.reject", "رفض")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
