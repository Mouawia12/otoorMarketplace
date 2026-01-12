import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Product } from "../types";
import { useUIStore } from "../store/uiStore";
import { formatPrice } from "../utils/currency";

type AdminStatus = "all" | "pending" | "approved" | "rejected" | "hidden";

const STATUS_META: Record<
  Exclude<AdminStatus, "all">,
  { dotClass: string; labelKey: string; apiValue: string; productValues: string[] }
> = {
  pending: {
    dotClass: "bg-amber-500",
    labelKey: "admin.pending",
    apiValue: "pending",
    productValues: ["pending", "pending_review", "draft"],
  },
  approved: {
    dotClass: "bg-emerald-600",
    labelKey: "admin.approved",
    apiValue: "approved",
    productValues: ["published"],
  },
  rejected: {
    dotClass: "bg-rose-500",
    labelKey: "admin.rejected",
    apiValue: "rejected",
    productValues: ["rejected"],
  },
  hidden: {
    dotClass: "bg-slate-400",
    labelKey: "admin.hidden",
    apiValue: "hidden",
    productValues: ["archived"],
  },
};

const productStatusToAdmin = (status: string): Exclude<AdminStatus, "all"> => {
  const match = (Object.keys(STATUS_META) as Exclude<AdminStatus, "all">[]).find((key) =>
    STATUS_META[key].productValues.includes(status)
  );
  return match ?? "pending";
};

const adminStatusToApi = (status: Exclude<AdminStatus, "all">) =>
  STATUS_META[status].apiValue;

const adminStatusToProductStatus = (status: Exclude<AdminStatus, "all">) => {
  switch (status) {
    case "approved":
      return "published";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    case "hidden":
      return "archived";
    default:
      return status;
  }
};

function StatusDot({ s }: { s: Exclude<AdminStatus, "all"> }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${STATUS_META[s].dotClass}`} />;
}

export default function AdminProductsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<AdminStatus>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string | number> = {
          page,
          page_size: 20,
        };
        if (active !== "all") {
          params.status = adminStatusToApi(active);
        }
        if (q.trim()) {
          params.search = q.trim();
        }
        const response = await api.get("/admin/products", { params });
        const payload = response.data;
        setProducts(payload.products ?? []);
        setTotalPages(payload.total_pages ?? 1);
        setStatusCounts(payload.status_counts ?? {});
      } catch (err: any) {
        console.error("Failed to load admin products", err);
        setError(err?.response?.data?.detail ?? t("common.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [t, active, q, page]);

  const counts = useMemo(() => {
    const base = { all: 0, pending: 0, approved: 0, rejected: 0, hidden: 0 };
    const normalizedCounts = Object.entries(statusCounts).reduce<Record<string, number>>(
      (acc, [status, count]) => {
        const adminStatus = productStatusToAdmin(status.toLowerCase());
        acc[adminStatus] = (acc[adminStatus] ?? 0) + count;
        acc.all += count;
        return acc;
      },
      { ...base }
    );
    return normalizedCounts;
  }, [statusCounts]);

  const filtered = useMemo(() => {
    return products;
  }, [products]);

  const handleStatusChange = async (product: Product, status: Exclude<AdminStatus, "all">) => {
    try {
      await api.patch(`/admin/products/${product.id}/status`, { status: adminStatusToApi(status) });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, status: adminStatusToProductStatus(status) } : p
        )
      );
      setNotice({
        tone: "success",
        message: t("admin.updateSuccess", "تم تحديث الحالة بنجاح"),
      });
    } catch (err: any) {
      console.error("Failed to update product status", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("seller.updateFailed", "Failed to update product"),
      });
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
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-extrabold text-charcoal">
          {t("admin.products")}
        </h1>

        <div className="relative w-full sm:w-72">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("seller.searchProducts") || ""}
            className="w-full rounded-md border border-sand/60 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <span className="absolute inset-y-0 end-2 flex items-center text-taupe">⌕</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { id: "all", label: t("admin.all"), count: counts.all },
          { id: "pending", label: t("admin.pending"), count: counts.pending },
          { id: "approved", label: t("admin.approved"), count: counts.approved },
          { id: "rejected", label: t("admin.rejected"), count: counts.rejected },
          { id: "hidden", label: t("admin.hidden"), count: counts.hidden },
        ] as { id: AdminStatus; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActive(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-luxury text-xs sm:text-sm font-semibold transition ${
              active === tab.id ? "bg-gold text-charcoal shadow-sm" : "bg-sand text-charcoal-light hover:bg-sand/80"
            }`}
          >
            {tab.label}
            <span className="ms-2 text-[10px] sm:text-xs opacity-80">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-sand/60 bg-white">
        <table className="w-full table-auto text-xs sm:text-sm">
          <thead className="bg-sand/60 text-charcoal">
            <tr className="h-9 sm:h-10">
              <th className="px-2 py-2 text-start align-top">{t("seller.id")}</th>
              <th className="px-2 py-2 text-start align-top">{t("seller.title")}</th>
              <th className="px-2 py-2 text-start align-top">{t("admin.seller")}</th>
              <th className="px-2 py-2 text-start align-top">{t("seller.price")}</th>
              <th className="px-2 py-2 text-start align-top">{t("seller.status")}</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((product) => {
              const sellerName = product.seller?.full_name ?? t("admin.unknownSeller", "Unknown");
              const adminStatus = productStatusToAdmin(product.status);
              const displayName =
                i18n.language === "ar" ? product.name_ar : product.name_en;
              return (
                <tr key={product.id} className="border-t border-sand/40">
                  <td className="px-2 py-2 align-top whitespace-nowrap text-taupe">#{product.id}</td>
                  <td className="px-2 py-2 align-top whitespace-normal break-words break-keep leading-5">
                    {displayName}
                  </td>
                  <td className="px-2 py-2 align-top whitespace-normal break-words break-keep text-taupe leading-5">
                    {sellerName}
                  </td>
                  <td className="px-2 py-2 align-top whitespace-nowrap font-bold">
                    {formatPrice(product.base_price, language)}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot s={adminStatus} />
                      <span className="text-[11px] sm:text-xs text-taupe">
                        {t(STATUS_META[adminStatus].labelKey)}
                      </span>
                    </span>
                    <div className="mt-2">
                      <select
                        value={adminStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            product,
                            e.target.value as Exclude<AdminStatus, "all">
                          )
                        }
                        className="w-full px-2 py-1 rounded-md border border-sand/60 text-[11px] sm:text-xs"
                      >
                        {(["pending", "approved", "rejected", "hidden"] as Exclude<
                          AdminStatus,
                          "all"
                        >[]).map((option) => (
                          <option key={option} value={option}>
                            {t(STATUS_META[option].labelKey)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-taupe">
                  {t("seller.noProducts")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
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

      <p className="text-[11px] sm:text-xs text-taupe/80">
        {i18n.language === "ar"
          ? "تم تصغير النص والسماح بلفّه كي ترى كل المحتوى بدون تمرير أفقي."
          : "Text is compact and wrapped so you can see everything without horizontal scrolling."}
      </p>
    </div>
  );
}
