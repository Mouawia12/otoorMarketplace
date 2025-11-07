import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { User } from "../types";

const statusTone = (status: string) => {
  return status === "ACTIVE"
    ? "bg-green-100 text-green-700"
    : "bg-red-100 text-red-700";
};

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<(User & { created_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadUsers();
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
