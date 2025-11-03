import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWishlistStore } from "../store/wishlistStore";
import { useCartStore } from "../store/cartStore";
import SARIcon from "../components/common/SARIcon";

export default function WishlistPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as "ar" | "en";
  const locale = lang === "ar" ? "ar-SA" : "en-US";

  const { items, remove } = useWishlistStore();
  const { add: addToCart } = useCartStore();

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const getQty = (id: string) => qtyById[id] ?? 1;
  const setQty = (id: string, v: number) =>
    setQtyById((s) => ({ ...s, [id]: v }));

  const formatNumber = (v: number) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v);

  const handleAddToCart = (item: typeof items[0]) => {
    const qty = getQty(item.id);
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        brand: item.brand,
      },
      qty
    );
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-sand py-12">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <svg className="w-20 h-20 mx-auto text-taupe mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5 5 0 0 0-7.1 0L12 6.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 22l8.8-10.3a5 5 0 0 0 0-7.1z"/>
          </svg>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t("wishlist.empty")}</h1>
          <p className="text-taupe mb-6">{t("wishlist.emptyDesc")}</p>
          <Link to="/new" className="inline-block bg-gold text-charcoal px-6 py-3 rounded-luxury hover:bg-gold-hover transition font-semibold">
            {t("wishlist.continueShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand py-6 sm:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-charcoal">{t("wishlist.title")}</h1>
          <p className="text-taupe text-sm sm:text-base">
            {items.length} {t("wishlist.items")}
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-ivory rounded-xl shadow-sm px-3 py-3 sm:px-4 sm:py-4">
              {/* Mobile-first: صورة + تفاصيل */}
              <div className="grid grid-cols-[84px_1fr] gap-3 sm:gap-4 md:grid-cols-[minmax(96px,112px)_1fr_minmax(260px,300px)] md:items-start">

                {/* الصورة */}
                <div className="col-span-1">
                  <div className="aspect-square rounded-lg overflow-hidden bg-sand/60">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-taupe">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* التفاصيل + السعر (جوال) */}
                <div className="col-span-1 md:col-auto min-w-0">
                  <div className="flex justify-between md:block">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-charcoal leading-snug line-clamp-2">{item.name}</h3>
                      {item.brand && <p className="text-xs sm:text-sm text-taupe mt-1">{item.brand}</p>}
                    </div>

                    {/* السعر يظهر بجانب العنوان على الجوال */}
                    <div className="md:hidden ms-3 shrink-0 text-gold font-extrabold text-base inline-flex items-center gap-1">
                      {formatNumber(item.price)} <SARIcon size={16} />
                    </div>
                  </div>

                  {/* أدوات الجوال: الكمية + إزالة + زر الإضافة */}
                  <div className="mt-3 md:hidden space-y-2 min-w-0">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-taupe">{t("common.quantity", "الكمية")}</label>
                      <select
                        value={getQty(item.id)}
                        onChange={(e) => setQty(item.id, Number(e.target.value))}
                        className="h-10 min-w-[72px] rounded-lg border border-sand bg-white px-2 pr-6 text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/60"
                      >
                        {Array.from({ length: 10 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>

                      {/* إزالة (نص قصير ولا يخرج خارج الكرت) */}
                      <button
                        onClick={() => remove(item.id)}
                        className="ms-auto inline-flex items-center gap-1 text-sm text-taupe hover:text-red-600 whitespace-nowrap"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{t("wishlist.remove", "إزالة")}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="w-full h-11 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition inline-flex items-center justify-center gap-2"
                    >
                      {t("common.addToCart")}
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* عمود السعر/الإجراءات على md وفوق */}
                <div className="hidden md:block md:text-end">
                  <div className="text-gold font-extrabold text-xl inline-flex items-center gap-1">
                    {formatNumber(item.price)} <SARIcon size={18} />
                  </div>

                  <div className="mt-3 flex justify-end items-center gap-3">
                    <div className="inline-flex items-center">
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>{t("common.quantity", "الكمية")}</label>
                      <select
                        id={`qty-${item.id}`}
                        value={getQty(item.id)}
                        onChange={(e) => setQty(item.id, Number(e.target.value))}
                        className="h-10 min-w-[72px] rounded-lg border border-sand bg-white px-2 pr-6 text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/60"
                      >
                        {Array.from({ length: 10 }).map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="h-11 px-5 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition inline-flex items-center gap-2"
                    >
                      {t("common.addToCart")}
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6h15l-1.5 9H7.5L6 6zM7 6V4a3 3 0 016 0v2" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() => remove(item.id)}
                      className="inline-flex items-center gap-2 text-sm text-taupe hover:text-red-600"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{t("wishlist.remove", "إزالة")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* متابعة التسوق */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
          >
            {t("wishlist.continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
