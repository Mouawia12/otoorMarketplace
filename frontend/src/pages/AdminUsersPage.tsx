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
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<(User & { created_at?: string }) | null>(null);
  const [editStatus, setEditStatus] = useState<User["status"]>("ACTIVE");
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);
  const roleOptions = ["buyer", "seller", "admin", "moderator", "support"];

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
  }, []);

  const handleSellerDecision = async (userId: number, status: "approved" | "rejected") => {
    try {
      await api.patch(`/seller/profile/${userId}/status`, { status });
      await Promise.all([loadSellerRequests(), loadUsers()]);
    } catch (err: any) {
      console.error("Failed to update seller request", err);
      alert(err?.response?.data?.detail ?? t("common.error"));
    }
  };

  const openEditModal = (user: User & { created_at?: string }) => {
    setSelectedUser(user);
    setEditStatus(user.status);
    const normalizedRoles =
      user.roles && user.roles.length > 0
        ? Array.from(new Set(user.roles.map((role) => role.toLowerCase())))
        : [];
    if (!normalizedRoles.includes("buyer")) {
      normalizedRoles.push("buyer");
    }
    setEditRoles(normalizedRoles);
  };

  const closeEditModal = () => {
    setSelectedUser(null);
    setSavingUser(false);
  };

  const toggleRole = (role: string) => {
    setEditRoles((prev) => {
      const normalized = role.toLowerCase();
      if (normalized === "buyer") {
        return prev.includes("buyer") ? prev : [...prev, "buyer"];
      }
      return prev.includes(normalized)
        ? prev.filter((r) => r !== normalized)
        : [...prev, normalized];
    });
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    try {
      setSavingUser(true);
      const normalizedRoles = editRoles.includes("buyer") ? editRoles : [...editRoles, "buyer"];
      await api.patch(`/admin/users/${selectedUser.id}`, {
        status: editStatus,
        roles: normalizedRoles,
      });
      await loadUsers();
      closeEditModal();
    } catch (err: any) {
      console.error("Failed to update user", err);
      alert(err?.response?.data?.detail ?? t("admin.updateUserFailed"));
      setSavingUser(false);
    }
  };

  const isProtectedEmail = (email?: string | null) =>
    email?.toLowerCase() === PROTECTED_ADMIN_EMAIL;

  const handleDeleteUser = async (user: User) => {
    if (isProtectedEmail(user.email)) {
      alert(t("admin.protectedAdminWarning", "لا يمكنك حذف هذا الحساب المحمي."));
      return;
    }
    if (!window.confirm(t("admin.confirmDeleteUser", "هل أنت متأكد من حذف هذا المستخدم؟"))) {
      return;
    }
    try {
      await api.delete(`/admin/users/${user.id}`);
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to delete user", err);
      alert(err?.response?.data?.detail ?? t("admin.deleteUserFailed", "فشل حذف المستخدم"));
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
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.status")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.joined")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {usersWithProtection.map((user, index) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">#{index + 1}</td>
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
                        disabled={user.isProtected}
                        className={`${
                          user.isProtected
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
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

            <div>
              <label className="block text-sm font-semibold mb-2">{t("admin.role")}</label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <label
                    key={role}
                    className={`px-3 py-1 rounded-full border cursor-pointer text-sm ${
                      editRoles.includes(role)
                        ? "bg-gold text-charcoal border-gold"
                        : "border-sand text-charcoal-light"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
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
