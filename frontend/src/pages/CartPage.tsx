import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import SARIcon from "../components/common/SARIcon";

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "ar" | "en";
  const locale = lang === "ar" ? "ar-SA" : "en-US";

  const { items, remove, setQty, totals } = useCartStore();
  const { sub, total } = totals();

  const fmt = (v: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  const isEmpty = !items || items.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-sand py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <svg className="w-20 h-20 mx-auto text-taupe mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2" />
          </svg>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal mb-2">{t("cart.empty")}</h1>
          <p className="text-taupe mb-6">{t("cart.emptyDesc")}</p>
          <Link
            to="/new"
            className="inline-flex items-center justify-center px-6 py-3 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
          >
            {t("cart.continueShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <h1 className="text-xl sm:text-2xl font-extrabold text-charcoal mb-4 sm:mb-6">
          {t("cart.title")}
        </h1>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
          {/* قائمة المنتجات — Mobile first صف أفقي يتكيّف */}
          <div className="space-y-4">
            {items.map((item) => {
              const qty = item.qty ?? 1;
              const lineTotal = (item.price ?? 0) * qty;

              const dec = () => {
                if (qty > 1) setQty(item.id, qty - 1, item.variantId);
              };
              const inc = () => setQty(item.id, qty + 1, item.variantId);

              return (
                <div
                  key={`${item.id}-${item.variantId || "default"}`}
                  className="bg-ivory rounded-xl shadow-sm px-3 py-3 sm:px-4 sm:py-4"
                >
                  {/* شبكة الجوال: صورة + تفاصيل — تتحول على md إلى (صورة / تفاصيل / إجراءات) */}
                  <div className="grid grid-cols-[84px_1fr] gap-3 sm:gap-4 md:grid-cols-[minmax(96px,112px)_1fr_minmax(280px,340px)] md:items-start">
                    {/* الصورة */}
                    <div className="col-span-1">
                      <div className="aspect-square rounded-lg overflow-hidden bg-sand/60">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-taupe">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* التفاصيل + السعر (للجوال) */}
                    <div className="min-w-0">
                      <div className="flex justify-between md:block">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-charcoal leading-snug line-clamp-2">
                            {item.name}
                          </h3>
                          {item.brand && <p className="text-xs sm:text-sm text-taupe mt-1">{item.brand}</p>}
                          {item.variantLabel && (
                            <p className="text-[13px] text-gold font-semibold mt-1">{item.variantLabel}</p>
                          )}
                        </div>

                        {/* السعر في الجوال */}
                        <div className="md:hidden ms-3 shrink-0 text-gold font-extrabold text-base inline-flex items-center gap-1">
                          {fmt(item.price ?? 0)} <SARIcon size={16} />
                        </div>
                      </div>

                      {/* أدوات الجوال: كمية / حذف / إجمالي فرعي / زر شراء سريع */}
                      <div className="mt-3 md:hidden space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center border border-sand rounded-full">
                            <button
                              onClick={dec}
                              className="w-10 h-10 grid place-items-center rounded-s-full hover:bg-gold/15 text-charcoal"
                              aria-label={t("common.decrease", "إنقاص")}
                              disabled={qty <= 1}
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-semibold">{qty}</span>
                            <button
                              onClick={inc}
                              className="w-10 h-10 grid place-items-center rounded-e-full hover:bg-gold/15 text-charcoal"
                              aria-label={t("common.increase", "زيادة")}
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => remove(item.id, item.variantId)}
                            className="ms-auto inline-flex items-center gap-1 text-sm text-taupe hover:text-red-600"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path
                                d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {t("wishlist.remove")}
                          </button>
                        </div>

                        {/* الإجمالي الفرعي للسطر */}
                        <div className="text-sm text-taupe">
                          {t("cart.lineTotal", "الإجمالي الفرعي")}:{" "}
                          <span className="text-charcoal font-semibold inline-flex items-center gap-1">
                            {fmt(lineTotal)} <SARIcon size={14} />
                          </span>
                        </div>

                        <Link
                          to="/checkout"
                          className="block w-full h-11 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition text-center leading-[44px]"
                        >
                          {t("cart.checkout")}
                        </Link>
                      </div>
                    </div>

                    {/* عمود الإجراءات (تابلت/ديسكتوب) */}
                    <div className="hidden md:flex md:flex-col md:items-end md:gap-3">
                      <div className="text-gold font-extrabold text-xl inline-flex items-center gap-1">
                        {fmt(item.price ?? 0)} <SARIcon size={18} />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center border border-sand rounded-full">
                          <button
                            onClick={dec}
                            className="w-10 h-10 grid place-items-center rounded-s-full hover:bg-gold/15 text-charcoal"
                            aria-label={t("common.decrease", "إنقاص")}
                            disabled={qty <= 1}
                          >
                            −
                          </button>
                          <span className="w-10 text-center font-semibold">{qty}</span>
                          <button
                            onClick={inc}
                            className="w-10 h-10 grid place-items-center rounded-e-full hover:bg-gold/15 text-charcoal"
                            aria-label={t("common.increase", "زيادة")}
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => remove(item.id, item.variantId)}
                          className="inline-flex items-center gap-2 text-sm text-taupe hover:text-red-600"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                              d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {t("common.delete")}
                        </button>
                      </div>

                      <div className="text-sm text-taupe">
                        {t("cart.lineTotal", "الإجمالي الفرعي")}:{" "}
                        <span className="text-charcoal font-semibold inline-flex items-center gap-1">
                          {fmt(lineTotal)} <SARIcon size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ملخص السلة */}
          <aside className="bg-ivory rounded-xl shadow-sm p-4 sm:p-5 h-fit">
            <h2 className="text-lg font-bold text-charcoal mb-4">{t("cart.summary")}</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-taupe">{t("cart.subtotal")}</span>
                <span className="text-charcoal font-semibold inline-flex items-center gap-1">
                  {fmt(sub)} <SARIcon size={14} />
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-taupe">{t("cart.shipping")}</span>
                <span className="text-emerald-600 font-semibold">
                  {t("cart.calculatedAtCheckout")}
                </span>
              </div>

              <div className="border-t border-sand my-2" />

              <div className="flex justify-between text-base">
                <span className="font-bold text-charcoal">{t("cart.total")}</span>
                <span className="font-extrabold text-gold inline-flex items-center gap-1">
                  {fmt(total)} <SARIcon size={16} />
                </span>
              </div>
            </div>

            <Link
              to="/checkout"
              className="mt-4 block w-full h-11 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition text-center leading-[44px]"
            >
              {t("cart.checkout")}
            </Link>

            <Link
              to="/new"
              className="mt-3 block w-full text-center text-sm text-taupe hover:text-charcoal"
            >
              {t("cart.continueShopping")}
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
