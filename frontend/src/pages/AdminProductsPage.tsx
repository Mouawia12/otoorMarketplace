import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type AdminStatus = "all" | "pending" | "approved" | "rejected" | "hidden";

interface ProductRow {
  id: number;
  title: string;
  seller: string;
  price: number;
  status: Exclude<AdminStatus, "all">;
}

const STATUS_META: Record<
  Exclude<AdminStatus, "all">,
  { dotClass: string; labelKey: string }
> = {
  pending:  { dotClass: "bg-amber-500",  labelKey: "admin.pending"  },
  approved: { dotClass: "bg-emerald-600",labelKey: "admin.approved" },
  rejected: { dotClass: "bg-rose-500",   labelKey: "admin.rejected" },
  hidden:   { dotClass: "bg-slate-400",  labelKey: "admin.hidden"   },
};

function StatusDot({ s }: { s: Exclude<AdminStatus, "all"> }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${STATUS_META[s].dotClass}`} />;
}

const MOCK_ROWS: ProductRow[] = [
  { id: 1, title: "توم فورد عود وود", seller: "Ahmed Store",        price: 1280, status: "approved" },
  { id: 2, title: "بلو دي شانيل أو دو تواليت 100 مل", seller: "Luxury Perfumes", price: 980,  status: "pending"  },
  { id: 3, title: "ديور سوفاج", seller: "Dior Outlet",              price: 1150, status: "hidden"   },
  { id: 4, title: "Ex Nihilo Fleur Narcotique EDP", seller: "Paris Hub",        price: 1490, status: "rejected" },
];

export default function AdminProductsPage() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<AdminStatus>("all");
  const [q, setQ] = useState("");

  const rows = MOCK_ROWS;

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0, hidden: 0 };
    rows.forEach(r => { (c as any)[r.status] += 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (active !== "all") list = list.filter(r => r.status === active);
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(k) ||
          r.seller.toLowerCase().includes(k) ||
          String(r.id).includes(k)
      );
    }
    return list;
  }, [rows, active, q]);

  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const nf = new Intl.NumberFormat(locale);

  return (
    <div className="space-y-3">
      {/* العنوان + البحث */}
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

      {/* تبويبات الحالة */}
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

      {/* جدول مضغوط بدون تمرير أفقي */}
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
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-sand/40">
                {/* رقم: يبقى في سطر واحد لسهولة القراءة */}
                <td className="px-2 py-2 align-top whitespace-nowrap text-taupe">#{r.id}</td>

                {/* العنوان: يسمح باللفّ ويكسر الكلمات الطويلة */}
                <td className="px-2 py-2 align-top whitespace-normal break-words break-keep leading-5">
                  {r.title}
                </td>

                {/* البائع: أيضًا يسمح باللفّ */}
                <td className="px-2 py-2 align-top whitespace-normal break-words break-keep text-taupe leading-5">
                  {r.seller}
                </td>

                {/* السعر: بسطر واحد */}
                <td className="px-2 py-2 align-top whitespace-nowrap font-bold">
                  {nf.format(r.price)}
                </td>

                {/* الحالة: نقطة + نص صغير */}
                <td className="px-2 py-2 align-top whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot s={r.status} />
                    <span className="text-[11px] sm:text-xs text-taupe">
                      {t(STATUS_META[r.status].labelKey)}
                    </span>
                  </span>
                </td>
              </tr>
            ))}

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

      {/* تلميح صغير لتحسين القراءة على الشاشات الصغيرة */}
      <p className="text-[11px] sm:text-xs text-taupe/80">
        {i18n.language === "ar"
          ? "تم تصغير النص والسماح بلفّه كي ترى كل المحتوى بدون تمرير أفقي."
          : "Text is compact and wrapped so you can see everything without horizontal scrolling."}
      </p>
    </div>
  );
}
