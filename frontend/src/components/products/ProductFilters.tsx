// src/components/products/ProductFilters.tsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductFiltersMeta, fetchProductFiltersMeta } from "../../services/productService";
import SARIcon from "../common/SARIcon";

type Condition = "all" | "new" | "used";
const PRICE_MIN = 0;
const PRICE_MAX_DEFAULT = 5000;
const PRICE_GAP = 10;

type FilterState = {
  sort?: string;
  brand?: string;
  category?: string;
  condition?: string;
  min_price?: number;
  max_price?: number;
};

type ProductFiltersProps = {
  className?: string;
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  meta?: ProductFiltersMeta;
  lockedCondition?: "new" | "used";
};

export default function ProductFilters({
  className = "",
  filters,
  onFilterChange,
  meta,
  lockedCondition,
}: ProductFiltersProps) {
  const { i18n, t } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const navigate = useNavigate();
  const location = useLocation();

  const syncingRef = useRef(true);
  const [internalMeta, setInternalMeta] = useState<ProductFiltersMeta | null>(null);
  const resolvedMeta = meta ?? internalMeta ?? undefined;

  const metaMin =
    resolvedMeta?.min_price ??
    (resolvedMeta as any)?.minPrice ??
    (resolvedMeta as any)?.price_range?.min ??
    undefined;
  const metaMax =
    resolvedMeta?.max_price ??
    (resolvedMeta as any)?.maxPrice ??
    (resolvedMeta as any)?.price_range?.max ??
    undefined;

  const baseMin = typeof metaMin === "number" && metaMin >= 0 ? metaMin : PRICE_MIN;
  const baseMax =
    typeof metaMax === "number" && metaMax > 0
      ? metaMax
      : Math.max(PRICE_MAX_DEFAULT, baseMin + PRICE_GAP);

  const [priceCeiling, setPriceCeiling] = useState(baseMax);
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState(filters?.sort ?? "newest");
  const [brand, setBrand] = useState(filters?.brand ?? "");
  const [category, setCategory] = useState(filters?.category ?? "");
  const [condition, setCondition] = useState<Condition>(
    (filters?.condition as Condition) ?? lockedCondition ?? "all"
  );
  const [minPrice, setMinPrice] = useState<number>(filters?.min_price ?? baseMin);
  const [maxPrice, setMaxPrice] = useState<number>(filters?.max_price ?? baseMax);
  const [minPriceInput, setMinPriceInput] = useState<string>(String(filters?.min_price ?? baseMin));
  const [maxPriceInput, setMaxPriceInput] = useState<string>(String(filters?.max_price ?? baseMax));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (meta) {
      setInternalMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchProductFiltersMeta();
        if (!cancelled) {
          setInternalMeta(fetched);
        }
      } catch (err) {
        console.error("failed to load filters metadata", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  useEffect(() => {
    syncingRef.current = true;
    const minFromFilter =
      typeof filters?.min_price === "number" ? filters?.min_price : undefined;
    const maxFromFilter =
      typeof filters?.max_price === "number" ? filters?.max_price : undefined;

    const nextCeiling = Math.max(
      baseMax,
      maxFromFilter ?? baseMax,
      (minFromFilter ?? baseMin) + PRICE_GAP
    );
    setPriceCeiling(nextCeiling || baseMax);

    if (filters) {
      setSort(filters.sort ?? "newest");
      setBrand(filters.brand ?? "");
      setCategory(filters.category ?? "");
      setCondition((filters.condition as Condition) ?? lockedCondition ?? "all");
      const nextMin = minFromFilter ?? baseMin;
      const nextMax =
        maxFromFilter ?? (minFromFilter ? Math.max(minFromFilter + PRICE_GAP, baseMax) : nextCeiling);
      setMinPrice(nextMin);
      setMaxPrice(nextMax);
      setMinPriceInput(String(Math.round(nextMin)));
      setMaxPriceInput(String(Math.round(nextMax)));
      return;
    }

    const qs = new URLSearchParams(location.search);
    setSort(qs.get("sort") || "newest");
    setBrand(qs.get("brand") || "");
    setCategory(qs.get("category") || "");
    setCondition((qs.get("condition") as Condition) || "all");
    const minQ = qs.get("min");
    const maxQ = qs.get("max");
    const minNum = minQ ? Number(minQ) : baseMin;
    const maxNum = maxQ ? Number(maxQ) : nextCeiling;
    const parsedMin = isNaN(minNum) ? baseMin : minNum;
    const parsedMax = isNaN(maxNum) ? nextCeiling : maxNum;
    setMinPrice(parsedMin);
    setMaxPrice(parsedMax);
    setMinPriceInput(String(Math.round(parsedMin)));
    setMaxPriceInput(String(Math.round(parsedMax)));
  }, [filters, location.search, lockedCondition, baseMin, baseMax]);

  const activeCount = useMemo(() => {
    let c = 0;
    if (sort && sort !== "newest") c++;
    if (brand) c++;
    if (category) c++;
    if (minPrice > baseMin) c++;
    if (maxPrice < priceCeiling) c++;
    return c;
  }, [sort, brand, category, minPrice, maxPrice, priceCeiling, baseMin]);

  const inputCls =
    "w-full h-10 rounded-xl border border-sand/60 bg-white text-charcoal placeholder-taupe px-3 outline-none focus:ring-2 focus:ring-gold focus:border-gold transition text-sm";
  const labelCls = "text-[11px] font-semibold text-charcoal/90";

  function clearAll() {
    setSort("newest");
    setBrand("");
    setCategory("");
    setCondition(lockedCondition ?? "all");
    setMinPrice(baseMin);
    setMaxPrice(baseMax);
    setMinPriceInput(String(Math.round(baseMin)));
    setMaxPriceInput(String(Math.round(baseMax)));
  }

  const computedFilters = useMemo(() => {
    const effectiveCondition = lockedCondition ?? condition;
    const hasMin = minPrice > baseMin;
    const hasMax = maxPrice < priceCeiling;
    const payload: FilterState = {
      sort,
      brand,
      category,
      condition: effectiveCondition && effectiveCondition !== "all" ? effectiveCondition : undefined,
      min_price: hasMin ? Number(minPrice) : undefined,
      max_price: hasMax ? Number(maxPrice) : undefined,
    };
    return payload;
  }, [brand, category, condition, lockedCondition, maxPrice, minPrice, priceCeiling, sort, baseMin]);

  useEffect(() => {
    if (!ready) {
      setReady(true);
      syncingRef.current = false;
      return;
    }
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const payload = computedFilters;
    if (onFilterChange) {
      onFilterChange(payload);
    } else {
      const params = new URLSearchParams();
      if (payload.sort) params.set("sort", payload.sort);
      if (payload.brand) params.set("brand", payload.brand);
      if (payload.category) params.set("category", payload.category);
      if (payload.condition) params.set("condition", payload.condition);
      if (payload.min_price !== undefined) params.set("min", String(payload.min_price));
      if (payload.max_price !== undefined) params.set("max", String(payload.max_price));
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }, [computedFilters, onFilterChange, ready, navigate, location.pathname]);

  useEffect(() => {
    if (activeCount > 0) {
      setExpanded(true);
    }
  }, [activeCount]);

  const conditionBadge =
    lockedCondition === "new"
      ? t("catalog.new")
      : lockedCondition === "used"
      ? t("catalog.used")
      : null;

  /* Price slider gradient retained for potential future restoration.
  const trackBackground = useMemo(() => {
    const range = priceCeiling - baseMin || 1;
    const startPercent = ((minPrice - baseMin) / range) * 100;
    const endPercent = ((maxPrice - baseMin) / range) * 100;
    return `linear-gradient(to right, #e5dcc5 0%, #e5dcc5 ${startPercent}%, #d4b56c ${startPercent}%, #d4b56c ${endPercent}%, #e5dcc5 ${endPercent}%, #e5dcc5 100%)`;
  }, [minPrice, maxPrice, priceCeiling, baseMin]);
  */

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-sand/60 bg-white shadow-sm p-3 sm:p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-charcoal">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-pressed={expanded}
            aria-label={
              expanded ? t("catalog.hideFilters", "إخفاء الفلاتر") : t("catalog.showFilters", "إظهار الفلاتر")
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/60 text-charcoal hover:bg-sand focus:outline-none focus:ring-2 focus:ring-gold transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
            </svg>
          </button>
          <div className="leading-tight">
            <p className="text-sm font-extrabold">{t("catalog.filterTitle")}</p>
            <p className="text-[11px] text-taupe">
              {activeCount > 0
                ? t("catalog.filterActive", { count: activeCount })
                : t("catalog.filterHint")}
            </p>
          </div>
          {conditionBadge && (
            <span className="inline-flex items-center h-7 px-3 rounded-full bg-sand/60 text-[11px] font-semibold">
              {conditionBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-charcoal/80 hover:text-charcoal underline underline-offset-2"
          >
            {t("catalog.resetFilters")}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className={labelCls}>{t("catalog.sort")}</label>
            <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">{t("catalog.sortNewest")}</option>
              <option value="oldest">{t("catalog.sortOldest")}</option>
              <option value="price_asc">{t("catalog.sortPriceLow")}</option>
              <option value="price_desc">{t("catalog.sortPriceHigh")}</option>
              <option value="stock">{t("catalog.sortStock")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>{t("catalog.brand")}</label>
            <select className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">{t("catalog.allBrands")}</option>
              {(resolvedMeta?.brands ?? []).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>{t("catalog.category")}</label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t("catalog.allCategories")}</option>
              {(resolvedMeta?.categories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className={labelCls}>{t("catalog.range")}</label>
            <div className="rounded-xl border border-sand/60 bg-sand/30 px-3 py-3" dir="ltr">
              <div className="flex items-center justify-between text-[11px] font-semibold text-charcoal mb-2">
                <span className="inline-flex items-center gap-1">
                  {t("catalog.minLabel")}: {minPrice} <SARIcon size={12} />
                </span>
                <span className="inline-flex items-center gap-1">
                  {t("catalog.maxLabel")}: {maxPrice} <SARIcon size={12} />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className={labelCls}>{t("catalog.min")}</label>
                  <input
                    type="number"
                    min={baseMin}
                    max={maxPrice - PRICE_GAP}
                    className={inputCls}
                    value={minPriceInput}
                    placeholder="0"
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    onBlur={() => {
                      const val = Number(minPriceInput);
                      if (isNaN(val)) {
                        setMinPriceInput(String(Math.round(minPrice)));
                        return;
                      }
                      const clamped = Math.max(baseMin, Math.min(val, maxPrice - PRICE_GAP));
                      setMinPrice(clamped);
                      setMinPriceInput(String(Math.round(clamped)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>{t("catalog.max")}</label>
                  <input
                    type="number"
                    min={minPrice + PRICE_GAP}
                    max={priceCeiling}
                    className={inputCls}
                    value={maxPriceInput}
                    placeholder={t("catalog.max", "الحد الأقصى")}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    onBlur={() => {
                      const val = Number(maxPriceInput);
                      if (isNaN(val)) {
                        setMaxPriceInput(String(Math.round(maxPrice)));
                        return;
                      }
                      const clamped = Math.min(priceCeiling, Math.max(val, minPrice + PRICE_GAP));
                      setMaxPrice(clamped);
                      setMaxPriceInput(String(Math.round(clamped)));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
