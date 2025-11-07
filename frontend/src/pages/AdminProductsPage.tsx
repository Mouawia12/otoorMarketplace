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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Product[]>("/admin/products");
        setProducts(response.data);
      } catch (err: any) {
        console.error("Failed to load admin products", err);
        setError(err?.response?.data?.detail ?? t("common.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [t]);

  const counts = useMemo(() => {
    const base = { all: products.length, pending: 0, approved: 0, rejected: 0, hidden: 0 };
    products.forEach((product) => {
      const status = productStatusToAdmin(product.status);
      (base as any)[status] += 1;
    });
    return base;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (active !== "all") {
      const acceptedStatuses = STATUS_META[active].productValues;
      list = list.filter((product) => acceptedStatuses.includes(product.status));
    }
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter((product) => {
        return (
          product.name_en.toLowerCase().includes(term) ||
          product.name_ar.includes(q.trim()) ||
          product.brand.toLowerCase().includes(term) ||
          String(product.id).includes(term)
        );
      });
    }
    return list;
  }, [products, active, q]);

  const handleStatusChange = async (product: Product, status: Exclude<AdminStatus, "all">) => {
    try {
      await api.patch(`/admin/products/${product.id}/status`, { status: adminStatusToApi(status) });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, status: adminStatusToProductStatus(status) } : p
        )
      );
    } catch (err: any) {
      console.error("Failed to update product status", err);
      alert(err?.response?.data?.detail ?? t("seller.updateFailed", "Failed to update product"));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-extrabold text-charcoal">
          {t("admin.products")}
        </h1>

        <div className="relative w-full sm:w-72">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("seller.searchProducts") || ""}
            className="w-full rounded-md border border-sand/60 bg-white px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <span className="absolute inset-y-0 end-2 flex items-center text-taupe">⌕</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "all", label: t("admin.all"), count: counts.all },
          { id: "pending", label: t("admin.pending"), count: counts.pending },
          { id: "approved", label: t("admin.approved"), count: counts.approved },
          { id: "rejected", label: t("admin.rejected"), count: counts.rejected },
          { id: "hidden", label: t("admin.hidden"), count: counts.hidden },
        ] as { id: AdminStatus; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition
              ${active === tab.id ? "bg-gold text-charcoal" : "bg-sand text-charcoal hover:bg-sand/80"}`}
          >
            {tab.label}
            <span className="ms-1 text-[10px] sm:text-xs opacity-70">({tab.count})</span>
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

      <p className="text-[11px] sm:text-xs text-taupe/80">
        {i18n.language === "ar"
          ? "تم تصغير النص والسماح بلفّه كي ترى كل المحتوى بدون تمرير أفقي."
          : "Text is compact and wrapped so you can see everything without horizontal scrolling."}
      </p>
    </div>
  );
}
