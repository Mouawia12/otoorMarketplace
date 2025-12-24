import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Order } from "../types";
import { useUIStore } from "../store/uiStore";
import { formatPrice } from "../utils/currency";

type OrderFilter =
  | "all"
  | "pending"
  | "seller_confirmed"
  | "processing"
  | "shipped"
  | "completed"
  | "canceled"
  | "cancelled"
  | "refunded";

const uniqueFilters: OrderFilter[] = [
  "all",
  "pending",
  "seller_confirmed",
  "shipped",
  "completed",
  "canceled",
  "refunded",
];

const statusOptions: Array<{ value: string; labelKey: string }> = [
  { value: "pending", labelKey: "orders.statuses.pending" },
  { value: "seller_confirmed", labelKey: "orders.statuses.seller_confirmed" },
  { value: "shipped", labelKey: "orders.statuses.shipped" },
  { value: "completed", labelKey: "orders.statuses.completed" },
  { value: "canceled", labelKey: "orders.statuses.canceled" },
  { value: "refunded", labelKey: "orders.statuses.refunded" },
];

const statusBadgeTone = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "seller_confirmed":
      return "bg-blue-100 text-blue-700";
    case "shipped":
      return "bg-purple-100 text-purple-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "refunded":
      return "bg-gray-200 text-gray-700";
    case "canceled":
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function AdminOrdersPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printingLabelId, setPrintingLabelId] = useState<number | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== "all" ? { status: filter } : undefined;
      const response = await api.get<Order[]>("/orders", { params });
      setOrders(response.data);
    } catch (err: any) {
      console.error("Failed to load admin orders", err);
      setError(err?.response?.data?.detail ?? t("common.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const grouped = useMemo(() => {
    return orders.reduce<Record<string, Order[]>>((acc, order) => {
      const key = order.status;
      acc[key] = acc[key] ? [...acc[key], order] : [order];
      return acc;
    }, {});
  }, [orders]);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      await loadOrders();
    } catch (err: any) {
      console.error("Failed to update order status", err);
      alert(err?.response?.data?.detail ?? t("orders.updateFailed", "Failed to update order"));
    }
  };

  const handlePrintLabel = async (orderId: number) => {
    try {
      setPrintingLabelId(orderId);
      const response = await api.get(`/orders/${orderId}/label`);
      const labelUrl = response.data?.label_url;
      if (!labelUrl) {
        alert(t("orders.labelUnavailable", "تعذر الحصول على بوليصة الشحن"));
        return;
      }
      window.open(labelUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      alert(
        err?.response?.data?.message ??
          err?.response?.data?.detail ??
          t("orders.labelUnavailable", "تعذر الحصول على بوليصة الشحن")
      );
    } finally {
      setPrintingLabelId(null);
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
          onClick={() => loadOrders()}
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t("admin.orders")}</h1>
          <div className="flex gap-2 flex-wrap">
            {uniqueFilters.map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-luxury text-sm font-semibold ${
                  filter === status ? "bg-gold text-charcoal" : "bg-sand text-charcoal-light"
                }`}
              >
                {t(
                  status === "all"
                    ? "orders.allOrders"
                    : `orders.statuses.${status === "cancelled" ? "canceled" : status}`
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.orderId")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.buyer")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.product")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.amount")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.status")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.date")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const product = order.product;
                const productName = product
                  ? i18n.language === "ar"
                    ? product.name_ar
                    : product.name_en
                  : t("products.unknownProduct");
                const buyerLabel = t("admin.buyerId", {
                  id: order.buyer_id,
                  defaultValue: `Buyer #${order.buyer_id}`,
                });
                const isRedbox =
                  typeof order.shipping_method === "string" &&
                  order.shipping_method.toLowerCase().includes("redbox");
                return (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-sand">
                    <td className="px-4 py-4 text-charcoal-light">#{order.id}</td>
                    <td className="px-4 py-4 text-charcoal font-medium">{buyerLabel}</td>
                    <td className="px-4 py-4 text-charcoal">{productName}</td>
                    <td className="px-4 py-4 text-charcoal font-semibold">
                      {formatPrice(order.total_amount, language)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadgeTone(order.status)}`}>
                        {t(`orders.statuses.${order.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-charcoal-light">
                      {new Date(order.created_at).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="px-3 py-1 rounded-full text-sm font-semibold bg-white border border-sand/60"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </option>
                          ))}
                        </select>
                        {isRedbox && (
                          <button
                            type="button"
                            onClick={() => handlePrintLabel(order.id)}
                            className="text-sm text-charcoal underline hover:text-gold transition disabled:opacity-60"
                            disabled={printingLabelId === order.id}
                          >
                            {printingLabelId === order.id
                              ? t("orders.labelLoading", "جاري تحميل البوليصة...")
                              : t("orders.printLabel", "طباعة بوليصة الشحن")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t("orders.noOrders")}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h2 className="text-h3 text-charcoal mb-4">{t("admin.orderSummary", "ملخص الطلبات")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(grouped).map(([status, items]) => (
            <div key={status} className="bg-sand/50 rounded-luxury p-4">
              <p className="text-sm text-taupe mb-1">{t(`orders.statuses.${status}`)}</p>
              <p className="text-2xl font-bold text-charcoal">{items.length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
