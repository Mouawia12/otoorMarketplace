// src/pages/Products.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import api from "../lib/api";
import { Product } from "../types";
import ProductCard from "../components/products/ProductCard";
import ProductFilters from "../components/products/ProductFilters";

// تحويل QueryString إلى بارامترات API
function buildApiFilters(search: string) {
  const qs = new URLSearchParams(search);
  const params: Record<string, any> = { status: "published" };

  const map: Record<string, string> = {
    search: "search",
    brand: "brand",
    category: "category",
    condition: "condition",
    sort: "sort",
    min: "min_price",
    max: "max_price",
    product_type: "product_type",
  };

  Object.entries(map).forEach(([q, p]) => {
    const v = qs.get(q);
    if (v) params[p] = q === "min" || q === "max" ? Number(v) : v;
  });

  return params;
}

function SkeletonCard() {
  return (
    <article className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col animate-pulse">
      <div className="bg-sand/60 aspect-[4/5] w-full" />
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="h-3 w-20 bg-sand/60 rounded" />
        <div className="h-4 w-3/4 bg-sand/60 rounded" />
        <div className="h-4 w-28 bg-sand/60 rounded mt-1" />
        <div className="mt-auto h-10 bg-sand/60 rounded-xl" />
      </div>
    </article>
  );
}

export default function Products() {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // الجلب عند تغيّر الفلاتر في URL
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const params = buildApiFilters(location.search);
        const res = await api.get("/products", { params });
        if (!active) return;
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.products || res.data?.data || [];
        setProducts(data);
      } catch (e) {
        if (!active) return;
        setError("تعذّر جلب المنتجات.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [location.search]);

  const resultsText = useMemo(() => {
    if (loading) return t("common.loading");
    const n = products.length;
    return n === 0 ? (t("common.noResults") || "لا توجد نتائج") : `${n} ${t("products.countSuffix") || "منتج"}`;
  }, [loading, products, t]);

  return (
    <div dir={dir} className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6">
      {/* العنوان + زر التصفية */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-charcoal">
          {t("products.title") || "المنتجات"}
        </h1>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-sm text-taupe">{resultsText}</span>
          <ProductFilters /> {/* زر التصفية المنسدل */}
        </div>
      </div>

      {/* شبكة المنتجات — بدون aside، تملأ العرض */}
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))] gap-3 md:gap-6">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)}

        {!loading && error && (
          <div className="col-span-full bg-white rounded-xl p-6 text-center text-charcoal">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="col-span-full bg-white rounded-xl p-6 text-center text-charcoal">
            {t("common.noResults") || "لا توجد نتائج مطابقة للفلاتر الحالية."}
          </div>
        )}

        {!loading && !error &&
          products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
