// src/components/products/ProductFilters.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Condition = "all" | "new" | "used";

export default function ProductFilters({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  // قيم الفلاتر
  const [sort, setSort] = useState("newest");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState<Condition>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  // تهيئة القيم من الـ URL
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    setSort(qs.get("sort") || "newest");
    setBrand(qs.get("brand") || "");
    setCategory(qs.get("category") || "");
    setCondition((qs.get("condition") as Condition) || "all");
    setMinPrice(qs.get("min") || "");
    setMaxPrice(qs.get("max") || "");
  }, [location.search]);

  // إغلاق عند الضغط خارج/ESC
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // عداد الفلاتر المفعّلة
  const activeCount = useMemo(() => {
    let c = 0;
    if (sort && sort !== "newest") c++;
    if (brand) c++;
    if (category) c++;
    if (condition !== "all") c++;
    if (minPrice) c++;
    if (maxPrice) c++;
    return c;
  }, [sort, brand, category, condition, minPrice, maxPrice]);

  const inputCls =
    "w-full h-9 rounded-lg border border-sand/60 bg-white text-charcoal placeholder-taupe px-2 outline-none focus:ring-2 focus:ring-gold focus:border-gold transition text-sm";
  const labelCls = "text-[11px] font-semibold text-charcoal/90";
  const chipCls = "h-8 rounded-lg px-2 text-xs font-semibold border transition";

  function clearAll() {
    setSort("newest");
    setBrand("");
    setCategory("");
    setCondition("all");
    setMinPrice("");
    setMaxPrice("");
  }

  function apply() {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    if (condition !== "all") params.set("condition", condition);
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);

    // حدّث الـ URL بدون إعادة تحميل
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    setOpen(false);
  }

  return (
    <div dir={dir} className={`relative ${className}`}>
      {/* زر فتح القائمة */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-10 rounded-xl bg-white border border-sand/60 hover:bg-sand/50 text-charcoal px-3 text-sm font-semibold flex items-center gap-2 shadow-sm"
        style={{ minWidth: 110 }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        تصفية
        {activeCount > 0 && (
          <span className="ms-1 rounded-md bg-gold/90 text-charcoal text-[11px] px-1.5 py-0.5">
            {activeCount}
          </span>
        )}
        <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.25a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
        </svg>
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute z-50 mt-2 w-80 max-w-[92vw] rounded-xl border border-sand/60 bg-white shadow-xl p-3"
          style={{ insetInlineEnd: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-extrabold text-charcoal">تصفية</span>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-charcoal/80 hover:text-charcoal underline underline-offset-2"
            >
              مسح الكل
            </button>
          </div>

          <div className="space-y-3">
            {/* الترتيب */}
            <div className="space-y-1">
              <label className={labelCls}>الترتيب حسب</label>
              <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">الأحدث أولاً</option>
                <option value="price_low">السعر: من الأقل للأعلى</option>
                <option value="price_high">السعر: من الأعلى للأقل</option>
                <option value="popular">الأكثر رواجًا</option>
              </select>
            </div>

            {/* العلامة والفئة */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className={labelCls}>العلامة التجارية</label>
                <select className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">الكل</option>
                  <option value="dior">Dior</option>
                  <option value="chanel">Chanel</option>
                  <option value="ysl">YSL</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>الفئة</label>
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">الكل</option>
                  <option value="men">رجالي</option>
                  <option value="women">نسائي</option>
                  <option value="unisex">يونيسكس</option>
                </select>
              </div>
            </div>

            {/* الحالة */}
            <div className="space-y-1">
              <label className={labelCls}>الحالة</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["all", "new", "used"] as Condition[]).map((k) => {
                  const active = condition === k;
                  const label = k === "all" ? "الكل" : k === "new" ? "جديد" : "مستعمل";
                  return (
                    <button
                      key={k}
                      onClick={() => setCondition(k)}
                      className={`${chipCls} ${
                        active
                          ? "bg-gold border-gold text-charcoal"
                          : "bg-white border-sand/60 text-charcoal hover:bg-sand/50"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* السعر */}
            <div className="space-y-1">
              <label className={labelCls}>السعر (النطاق)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="الحد الأدنى"
                  className={inputCls}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="الحد الأقصى"
                  className={inputCls}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* أزرار */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={apply}
                className="flex-1 h-9 rounded-lg bg-charcoal text-ivory text-sm font-semibold hover:bg-charcoal-light transition"
              >
                تطبيق
              </button>
              <button
                onClick={clearAll}
                className="h-9 px-3 rounded-lg bg-white border border-sand/60 text-sm font-semibold hover:bg-sand/50 transition"
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
