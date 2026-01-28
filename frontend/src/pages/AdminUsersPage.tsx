import { useEffect, useMemo, useState } from "react";
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

const PROTECTED_ADMIN_EMAIL =
  (import.meta.env.VITE_PROTECTED_ADMIN_EMAIL as string | undefined)?.toLowerCase?.() ??
  "fragreworld@gmail.com";

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<(User & { created_at?: string })[]>([]);
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sellerDecisionUserId, setSellerDecisionUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<(User & { created_at?: string }) | null>(null);
  const [editStatus, setEditStatus] = useState<User["status"]>("ACTIVE");
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page,
        page_size: 20,
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await api.get("/admin/users", { params });
      const payload = response.data;
      setUsers(payload.users ?? []);
      setTotalPages(payload.total_pages ?? 1);
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
  }, [page, statusFilter, debouncedSearchTerm]);

  useEffect(() => {
    loadSellerRequests();
  }, []);

  const handleSellerDecision = async (userId: number, status: "approved" | "rejected") => {
    if (sellerDecisionUserId === userId) return;
    setSellerDecisionUserId(userId);
    setNotice(null);
    try {
      await api.patch(`/seller/profile/${userId}/status`, { status });
      await Promise.all([loadSellerRequests(), loadUsers()]);
      setNotice({
        tone: "success",
        message: t("admin.updateSuccess", "تم تحديث الحالة بنجاح"),
      });
    } catch (err: any) {
      console.error("Failed to update seller request", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("common.error"),
      });
    } finally {
      setSellerDecisionUserId(null);
    }
  };

  const openEditModal = (user: User & { created_at?: string }) => {
    setSelectedUser(user);
    setEditStatus(user.status);
  };

  const closeEditModal = () => {
    setSelectedUser(null);
    setSavingUser(false);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setSavingUser(true);
      await api.patch(`/admin/users/${selectedUser.id}`, {
        status: editStatus,
      });
      await loadUsers();
      closeEditModal();
      setNotice({
        tone: "success",
        message: t("admin.updateSuccess", "تم تحديث المستخدم بنجاح"),
      });
    } catch (err: any) {
      console.error("Failed to update user", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("admin.updateUserFailed"),
      });
      setSavingUser(false);
    }
  };

  const isProtectedEmail = (email?: string | null) =>
    email?.toLowerCase() === PROTECTED_ADMIN_EMAIL;

  const handleDeleteUser = async (user: User) => {
    if (isProtectedEmail(user.email)) {
      setNotice({
        tone: "error",
        message: t("admin.protectedAdminWarning", "لا يمكنك حذف هذا الحساب المحمي."),
      });
      return;
    }
    if (!window.confirm(t("admin.confirmDeleteUser", "هل أنت متأكد من حذف هذا المستخدم؟"))) {
      return;
    }
    try {
      setDeletingUserId(user.id);
      setNotice(null);
      await api.delete(`/admin/users/${user.id}`);
      await loadUsers();
      setNotice({
        tone: "success",
        message: t("admin.deleteSuccess", "تم حذف المستخدم بنجاح"),
      });
    } catch (err: any) {
      console.error("Failed to delete user", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("admin.deleteUserFailed", "فشل حذف المستخدم"),
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const usersWithProtection = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        isProtected: isProtectedEmail(user.email),
      })),
    [users]
  );

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
      {notice && (
        <div
          className={`rounded-luxury border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}
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
                {sellerRequests.map((req, index) => (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-sand">
                    <td className="px-4 py-3 text-charcoal-light">#{index + 1}</td>
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
                          disabled={sellerDecisionUserId === req.user_id}
                          className="px-3 py-1 rounded-luxury bg-success text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sellerDecisionUserId === req.user_id ? t("common.loading") : t("common.approve", "قبول")}
                        </button>
                        <button
                          onClick={() => handleSellerDecision(req.user_id, "rejected")}
                          disabled={sellerDecisionUserId === req.user_id}
                          className="px-3 py-1 rounded-luxury bg-alert text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sellerDecisionUserId === req.user_id ? t("common.loading") : t("common.reject", "رفض")}
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

        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={t("admin.searchUsers", "ابحث بالاسم أو البريد")}
              className="w-full px-4 py-2 rounded-luxury border border-sand focus:outline-none focus:ring-2 focus:ring-gold min-h-[44px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-luxury border border-sand min-h-[44px]"
          >
            <option value="all">{t("admin.allStatuses", "كل الحالات")}</option>
            <option value="active">{t("admin.activate", "تفعيل")}</option>
            <option value="suspended">{t("admin.suspend", "تعليق")}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.id")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.name")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.email")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.role")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.status")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.joined")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
                {usersWithProtection.map((user, index) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">#{(page - 1) * 20 + index + 1}</td>
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
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-gold hover:text-gold-dark"
                        aria-label={t("common.edit")}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.isProtected || deletingUserId === user.id}
                        className={`${
                          user.isProtected || deletingUserId === user.id
                            ? "text-charcoal/40 cursor-not-allowed"
                            : "text-red-500 hover:text-red-600"
                        }`}
                        aria-label={t("common.delete")}
                        title={
                          user.isProtected
                            ? t("admin.protectedAdminWarning", "لا يمكنك حذف هذا الحساب المحمي.")
                            : undefined
                        }
                      >
                        {deletingUserId === user.id ? t("common.loading") : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-charcoal-light">
            {t("admin.pageIndicator", { page, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-luxury border border-sand text-charcoal disabled:opacity-50"
            >
              {t("common.previous", "Previous")}
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-luxury border border-sand text-charcoal disabled:opacity-50"
            >
              {t("common.next", "Next")}
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-h3 text-charcoal">
                {t("admin.editUser", "تعديل المستخدم")}
              </h3>
              <button onClick={closeEditModal} className="text-charcoal-light hover:text-charcoal">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-charcoal font-semibold">{t("admin.name")}: </span>
                <span className="text-charcoal-light">{selectedUser.full_name}</span>
              </div>
              <div>
                <span className="text-charcoal font-semibold">{t("admin.email")}: </span>
                <span className="text-charcoal-light break-all">{selectedUser.email}</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t("admin.status")}</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as User["status"])}
                  className="w-full border border-sand rounded-lg px-3 py-2"
                >
                  <option value="ACTIVE">{t("admin.activate", "تفعيل")}</option>
                  <option value="SUSPENDED">{t("admin.suspend", "تعليق")}</option>
                </select>
              </div>
            </div>


            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 rounded-luxury border border-sand text-charcoal"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSaveUser}
                disabled={savingUser}
                className="px-5 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover disabled:opacity-60"
              >
                {savingUser ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
