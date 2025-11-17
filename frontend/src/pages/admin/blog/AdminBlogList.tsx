import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../../lib/api";

type AdminBlogPost = {
  id: number;
  slug: string;
  title: string;
  lang: "ar" | "en";
  status: "draft" | "published";
  date: string;
  author?: string;
  description?: string;
  cover?: string;
};

export default function AdminBlogList() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminBlogPost[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/blog");
        setRows(res.data);
      } catch (error) {
        console.error("Failed to load blog posts", error);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t("admin.blogList", "مقالات المدونة")}</h1>
        <Link to="/admin/blog/new" className="bg-gold text-charcoal px-4 py-2 rounded-lg font-semibold hover:bg-gold-hover">
          {t("admin.newPost", "مقال جديد")}
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("common.search", "بحث") as string}
        className="w-full max-w-md bg-white border border-sand rounded-lg px-3 py-2 mb-3"
      />

      <div className="bg-ivory rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-light text-charcoal">
            <tr>
              <th className="p-3 text-start">{t("common.title", "العنوان")}</th>
              <th className="p-3 text-start">{t("common.language", "اللغة")}</th>
              <th className="p-3 text-start">{t("common.status", "الحالة")}</th>
              <th className="p-3 text-start">{t("common.date", "التاريخ")}</th>
              <th className="p-3 text-start">{t("common.actions", "الإجراءات")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4" colSpan={5}>{t("common.loading", "جاري التحميل")}…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4" colSpan={5}>{t("common.noResults", "لا توجد نتائج")}.</td></tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="p-3">{row.title}</td>
                  <td className="p-3">{row.lang.toUpperCase()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      row.status === "published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {row.status === "published" ? t("common.published","منشور") : t("common.draft","مسودة")}
                    </span>
                  </td>
                  <td className="p-3">
                    {new Date(row.date).toLocaleDateString(i18n.language === "ar" ? "ar-SA" : "en-US")}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/blog/${row.id}`} className="text-gold hover:text-gold-dark">
                        {t("common.edit","تعديل")}
                      </Link>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={async () => {
                          const confirmDelete = window.confirm(t("common.confirmDelete", "هل أنت متأكد؟"));
                          if (!confirmDelete) return;
                          try {
                            await api.delete(`/admin/blog/${row.id}`);
                            setRows((prev) => prev.filter((r) => r.id !== row.id));
                          } catch (error) {
                            console.error("Failed to delete post", error);
                            alert(t("common.error", "حدث خطأ"));
                          }
                        }}>
                        {t("common.delete","حذف")}
                      </button>
                      <a href={`/blog/${encodeURIComponent(row.slug)}?preview=1`} target="_blank" rel="noreferrer"
                         className="text-charcoal hover:text-gold">
                        {t("common.preview","معاينة")}
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
