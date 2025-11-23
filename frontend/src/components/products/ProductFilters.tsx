// src/components/products/ProductFilters.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ProductFiltersMeta } from "../../services/productService";

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

  const metaMin =
    meta?.min_price ??
    (meta as any)?.minPrice ??
    (meta as any)?.price_range?.min ??
    undefined;
  const metaMax =
    meta?.max_price ??
    (meta as any)?.maxPrice ??
    (meta as any)?.price_range?.max ??
    undefined;

  const baseMin = typeof metaMin === "number" && metaMin >= 0 ? metaMin : PRICE_MIN;
  const baseMax =
    typeof metaMax === "number" && metaMax > 0
      ? metaMax
      : Math.max(PRICE_MAX_DEFAULT, baseMin + PRICE_GAP);

  const [priceCeiling, setPriceCeiling] = useState(baseMax);
  const [sort, setSort] = useState(filters?.sort ?? "newest");
  const [brand, setBrand] = useState(filters?.brand ?? "");
  const [category, setCategory] = useState(filters?.category ?? "");
  const [condition, setCondition] = useState<Condition>(
    (filters?.condition as Condition) ?? lockedCondition ?? "all"
  );
  const [minPrice, setMinPrice] = useState<number>(filters?.min_price ?? baseMin);
  const [maxPrice, setMaxPrice] = useState<number>(filters?.max_price ?? baseMax);

  useEffect(() => {
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
      setMinPrice(minFromFilter ?? baseMin);
      setMaxPrice(maxFromFilter ?? (minFromFilter ? Math.max(minFromFilter + PRICE_GAP, baseMax) : nextCeiling));
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
    setMinPrice(isNaN(minNum) ? baseMin : minNum);
    setMaxPrice(isNaN(maxNum) ? nextCeiling : maxNum);
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

    onFilterChange?.({
      sort: "newest",
      brand: "",
      category: "",
      condition: lockedCondition ?? "all",
      min_price: undefined,
      max_price: undefined,
    });
  }

  function apply() {
    const effectiveCondition = lockedCondition ?? condition;
    const hasMin = minPrice > baseMin;
    const hasMax = maxPrice < priceCeiling;
    const nextFilters: FilterState = {
      sort,
      brand,
      category,
      condition: effectiveCondition && effectiveCondition !== "all" ? effectiveCondition : undefined,
      min_price: hasMin ? Number(minPrice) : undefined,
      max_price: hasMax ? Number(maxPrice) : undefined,
    };

    if (onFilterChange) {
      onFilterChange(nextFilters);
    } else {
      const params = new URLSearchParams();
      if (nextFilters.sort) params.set("sort", nextFilters.sort);
      if (nextFilters.brand) params.set("brand", nextFilters.brand);
      if (nextFilters.category) params.set("category", nextFilters.category);
      if (nextFilters.condition) params.set("condition", nextFilters.condition);
      if (nextFilters.min_price !== undefined) params.set("min", String(nextFilters.min_price));
      if (nextFilters.max_price !== undefined) params.set("max", String(nextFilters.max_price));

      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  }

  const conditionBadge =
    lockedCondition === "new"
      ? t("catalog.new")
      : lockedCondition === "used"
      ? t("catalog.used")
      : null;

  const trackBackground = useMemo(() => {
    const range = priceCeiling - baseMin || 1;
    const startPercent = ((minPrice - baseMin) / range) * 100;
    const endPercent = ((maxPrice - baseMin) / range) * 100;
    return `linear-gradient(to right, #e5dcc5 0%, #e5dcc5 ${startPercent}%, #d4b56c ${startPercent}%, #d4b56c ${endPercent}%, #e5dcc5 ${endPercent}%, #e5dcc5 100%)`;
  }, [minPrice, maxPrice, priceCeiling, baseMin]);

  return (
    <div
      dir={dir}
      className={`rounded-2xl border border-sand/60 bg-white shadow-sm p-3 sm:p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-charcoal">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/60 text-charcoal">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
            </svg>
          </span>
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
        <button
          onClick={clearAll}
          className="text-xs font-semibold text-charcoal/80 hover:text-charcoal underline underline-offset-2"
        >
          {t("catalog.clearFilters")}
        </button>
      </div>

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
            {(meta?.brands ?? []).map((b) => (
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
            {(meta?.categories ?? []).map((c) => (
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
              <span>
                {t("catalog.minLabel")}: {minPrice} {t("catalog.currency")}
              </span>
              <span>
                {t("catalog.maxLabel")}: {maxPrice} {t("catalog.currency")}
              </span>
            </div>
            <div className="relative h-10 flex items-center">
              <div
                className="absolute inset-x-1 h-1.5 rounded-full"
                style={{ background: trackBackground }}
              />
              <input
                type="range"
                min={baseMin}
                max={priceCeiling}
                value={minPrice}
                step={1}
                onChange={(e) => {
                  const val = Math.min(Number(e.target.value), maxPrice - PRICE_GAP);
                  setMinPrice(val);
                }}
                className="range-thumb w-full h-1 appearance-none bg-transparent absolute"
                aria-label={`${t("catalog.minLabel")} ${t("catalog.range")}`}
                style={{ zIndex: minPrice > priceCeiling - PRICE_GAP * 2 ? 6 : 4 }}
              />
              <input
                type="range"
                min={baseMin}
                max={priceCeiling}
                value={maxPrice}
                step={1}
                onChange={(e) => {
                  const val = Math.max(Number(e.target.value), minPrice + PRICE_GAP);
                  setMaxPrice(val);
                }}
                className="range-thumb w-full h-1 appearance-none bg-transparent absolute"
                aria-label={`${t("catalog.maxLabel")} ${t("catalog.range")}`}
                style={{ zIndex: 5 }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>{t("catalog.min")}</label>
                <input
                  type="number"
                  min={baseMin}
                  max={maxPrice - PRICE_GAP}
                  className={inputCls}
                  value={minPrice}
                  onChange={(e) => {
                    const val = Math.max(baseMin, Math.min(Number(e.target.value) || baseMin, maxPrice - PRICE_GAP));
                    setMinPrice(val);
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
                  value={maxPrice}
                  onChange={(e) => {
                    const val = Math.min(priceCeiling, Math.max(Number(e.target.value) || maxPrice, minPrice + PRICE_GAP));
                    setMaxPrice(val);
                  }}
                />
              </div>
            </div>
            <style>
              {`
                .range-thumb::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  height: 16px;
                  width: 16px;
                  border-radius: 999px;
                  background: #2c2c2c;
                  border: 2px solid #fff;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.35);
                  cursor: pointer;
                  margin-top: -6px;
                }
                .range-thumb::-moz-range-thumb {
                  height: 16px;
                  width: 16px;
                  border-radius: 999px;
                  background: #2c2c2c;
                  border: 2px solid #fff;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.35);
                  cursor: pointer;
                }
                .range-thumb::-webkit-slider-runnable-track {
                  height: 1.5px;
                  background: transparent;
                }
                .range-thumb::-moz-range-track {
                  height: 1.5px;
                  background: transparent;
                }
              `}
            </style>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={apply}
          className="h-10 px-4 rounded-xl bg-charcoal text-ivory text-sm font-semibold hover:bg-charcoal-light transition"
        >
          {t("catalog.applyFilters")}
        </button>
        <button
          onClick={clearAll}
          className="h-10 px-4 rounded-xl bg-white border border-sand/60 text-sm font-semibold hover:bg-sand/60 transition"
        >
          {t("catalog.resetFilters")}
        </button>
      </div>
    </div>
  );
}
