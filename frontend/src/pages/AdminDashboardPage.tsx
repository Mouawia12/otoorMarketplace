import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useUIStore } from "../store/uiStore";
import type { ModerationQueueItem } from "../types";

interface DashboardStats {
  total_users: number;
  total_products: number;
  pending_products: number;
  total_orders: number;
  pending_orders: number;
  running_auctions: number;
}

const priorityBadge = (priority: ModerationQueueItem["priority"]) => {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-100";
    case "medium":
      return "text-gold bg-gold bg-opacity-10";
    case "low":
      return "text-gray-600 bg-gray-200";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [statsRes, queueRes] = await Promise.all([
          api.get<DashboardStats>("/admin/dashboard"),
          api.get<ModerationQueueItem[]>("/admin/dashboard/moderation"),
        ]);
        setStats(statsRes.data);
        setQueue(queueRes.data);
      } catch (err: any) {
        console.error("Failed to load admin dashboard", err);
        setError(err?.response?.data?.detail ?? t("common.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white rounded-luxury p-8 shadow-luxury text-center">
        <p className="text-red-600 font-semibold mb-3">{error ?? t("common.errorLoading")}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const metricCards = [
    { icon: "👥", label: t("admin.totalUsers"), value: stats.total_users },
    { icon: "🛍️", label: t("admin.totalProducts"), value: stats.total_products },
    { icon: "⏳", label: t("admin.pendingProducts"), value: stats.pending_products, highlighted: true },
    { icon: "🧾", label: t("admin.totalOrders"), value: stats.total_orders },
    { icon: "📦", label: t("admin.pendingOrders"), value: stats.pending_orders, highlighted: true },
    { icon: "🔨", label: t("admin.runningAuctions"), value: stats.running_auctions },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-2">{t("admin.dashboard")}</h1>
        <p className="text-taupe">{t("admin.systemOverview")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-luxury p-6 shadow-luxury ${
              card.highlighted ? "bg-gold bg-opacity-10" : "bg-white"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-sm text-taupe">{card.label}</h3>
            </div>
            <p className={`text-3xl font-bold ${card.highlighted ? "text-gold" : "text-charcoal"}`}>
              {card.value.toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 text-charcoal">{t("admin.moderationQueue")}</h2>
          <span className="text-sm text-taupe">
            {t("admin.totalItems", { count: queue.length, defaultValue: `Total: ${queue.length}` })}
          </span>
        </div>

        {queue.length === 0 ? (
          <p className="text-center text-taupe py-8">
            {t("admin.noPendingItems", "No pending items right now")}
          </p>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-luxury hover:border-gold transition"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${priorityBadge(
                      item.priority
                    )}`}
                  >
                    {t(`admin.${item.priority}`)}
                  </span>
                  <div>
                    <p className="text-charcoal font-medium">
                      {i18n.language === "ar" ? item.title_ar : item.title_en}
                    </p>
                    <p className="text-sm text-taupe">
                      {new Date(item.created_at).toLocaleString(
                        i18n.language === "ar" ? "ar-EG" : "en-US"
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/admin/${item.type === "order" ? "orders" : item.type === "product" ? "products" : "auctions"}`}
                  className="text-gold hover:text-gold-hover font-semibold"
                >
                  {t("admin.review")} →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
