import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { User } from "../types";

type SellerRequest = {
  id: number;
  user_id: number;
  full_name: string;
  phone?: string;
  city?: string;
  status: string;
  created_at?: string;
  user?: { full_name?: string; email?: string };
};

const statusTone = (status: string) => {
  return status === "ACTIVE"
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";
};

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<(User & { created_at?: string })[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<(User & { created_at?: string })[]>("/admin/users");
      setUsers(response.data);
    } catch (err: any) {
      console.error("Failed to load admin users", err);
      setError(err?.response?.data?.detail ?? t("common.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const loadSellerRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get<{ profiles: SellerRequest[] }>("/seller/profile", {
        params: { status: "pending" },
      });
      setSellerRequests(res.data?.profiles ?? []);
    } catch (err) {
      console.error("Failed to load seller requests", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadSellerRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusToggle = async (user: User) => {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await api.patch(`/admin/users/${user.id}`, { status: nextStatus });
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to update user status", err);
      alert(err?.response?.data?.detail ?? t("admin.updateUserFailed"));
    }
  };

  const handleSellerDecision = async (userId: number, status: "approved" | "rejected") => {
    try {
      await api.patch(`/seller/profile/${userId}/status`, { status });
      await Promise.all([loadSellerRequests(), loadUsers()]);
    } catch (err: any) {
      console.error("Failed to update seller request", err);
      alert(err?.response?.data?.detail ?? t("common.error"));
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-luxury p-8 shadow-luxury text-center">
        <p className="text-red-600 font-semibold mb-3">{error}</p>
        <button
          onClick={() => loadUsers()}
          className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-h3 text-charcoal">{t("admin.sellerRequests", "طلبات التحويل إلى تاجر")}</h2>
          <span className="text-sm text-charcoal-light">
            {loadingRequests
              ? t("common.loading")
              : t("admin.totalCount", { count: sellerRequests.length, defaultValue: `إجمالي: ${sellerRequests.length}` })}
          </span>
        </div>

        {loadingRequests ? (
          <p className="text-taupe">{t("common.loading")}</p>
        ) : sellerRequests.length === 0 ? (
          <p className="text-taupe">{t("admin.noSellerRequests", "لا توجد طلبات حالية")}</p>
        ) : (
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
                {sellerRequests.map((req) => (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-sand">
                    <td className="px-4 py-3 text-charcoal-light">#{req.id}</td>
                    <td className="px-4 py-3 text-charcoal font-semibold">
                      {req.full_name || req.user?.full_name || t("common.unknown")}
                    </td>
                    <td className="px-4 py-3 text-charcoal-light">{req.user?.email || "—"}</td>
                    <td className="px-4 py-3 text-charcoal-light">{req.phone || "—"}</td>
                    <td className="px-4 py-3 text-charcoal-light">{req.city || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold border border-sand/70">
                        {req.status === "approved"
                          ? t("seller.statusApproved", "مقبول")
                          : req.status === "rejected"
                          ? t("seller.statusRejected", "مرفوض")
                          : t("seller.statusPending", "قيد المراجعة")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleSellerDecision(req.user_id, "approved")}
                          className="px-3 py-1 rounded-luxury bg-success text-white text-xs font-semibold"
                        >
                          {t("common.approve", "قبول")}
                        </button>
                        <button
                          onClick={() => handleSellerDecision(req.user_id, "rejected")}
                          className="px-3 py-1 rounded-luxury bg-alert text-white text-xs font-semibold"
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
        )}
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t("admin.users")}</h1>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.id")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.name")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.email")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.role")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.status", "حالة التاجر")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.status")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.joined")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">#{user.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{user.full_name}</td>
                  <td className="px-4 py-4 text-charcoal-light">{user.email}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1 flex-wrap justify-end">
                      {user.roles.map((role) => (
                        <span
                          key={role}
                          className="px-3 py-1 rounded-full text-xs bg-gold-light text-charcoal"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border border-sand/70">
                      {user.seller_status
                        ? user.seller_status === "approved"
                          ? t("seller.statusApproved", "مقبول")
                          : user.seller_status === "rejected"
                          ? t("seller.statusRejected", "مرفوض")
                          : t("seller.statusPending", "قيد المراجعة")
                        : t("seller.statusPending", "قيد المراجعة")}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusTone(user.status)}`}>
                      {user.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => handleStatusToggle(user)}
                      className={`text-sm font-semibold ${
                        user.status === "ACTIVE"
                          ? "text-red-600 hover:text-red-700"
                          : "text-green-600 hover:text-green-700"
                      }`}
                    >
                      {user.status === "ACTIVE" ? t("admin.suspend") : t("admin.activate")}
                    </button>
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
