import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import slugify from "slugify";
import { marked } from "marked";

type Mode = "create" | "edit";
type Form = {
  title: string; slug: string; description: string; cover?: string;
  author?: string; category?: string; tags: string;
  lang: "ar"|"en"; date: string; status: "draft"|"published";
  content: string;
};

export default function AdminBlogEdit({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    title:"", slug:"", description:"", cover:"", author:"", category:"",
    tags:"", lang:"ar", date:new Date().toISOString().slice(0,10),
    status:"draft", content:""
  });

  useEffect(() => {
    if (mode === "edit" && id) {
      (async () => {
        // TODO: GET /api/admin/blog/:id
        setForm({
          title:"Example title", slug:"example-title", description:"Short desc",
          cover:"", author:"AO", category:"guides", tags:"perfume, niche",
          lang:"ar", date:"2025-01-10", status:"draft", content:"## Heading\n\nContent…"
        });
      })();
    }
  }, [mode, id]);

  const on = (k: keyof Form, v:any)=> setForm(s=>({...s,[k]:v}));
  const html = useMemo(
    () => marked.parse(form.content || "") as string,
    [form.content]
  );
  const autoSlug = ()=> form.title && on("slug", slugify(form.title,{lower:true,strict:true}));

  const save = async ()=>{
    setSaving(true);
    try{
      // TODO: POST /api/admin/blog  أو  PUT /api/admin/blog/:id
      navigate("/admin/blog");
    }catch(e){ console.error(e); alert(t("common.error","حدث خطأ")); }
    finally{ setSaving(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          {mode==="create" ? t("admin.newPost","مقال جديد") : t("common.edit","تعديل")}
        </h1>
        <button
          onClick={save}
          disabled={saving}
          className="bg-gold text-charcoal px-4 py-2 rounded-lg font-semibold hover:bg-gold-hover disabled:opacity-60"
        >
          {saving ? t("common.loading","جاري الحفظ") : t("common.save","حفظ")}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-ivory rounded-xl shadow-sm p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">{t("common.title","العنوان")}</label>
              <input value={form.title} onChange={e=>on("title",e.target.value)} onBlur={autoSlug}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1">Slug</label>
              <input value={form.slug} onChange={e=>on("slug",e.target.value)}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block mb-1">{t("common.description","الوصف")}</label>
            <textarea value={form.description} onChange={e=>on("description",e.target.value)}
                      className="w-full bg-white border border-sand rounded-lg px-3 py-2 min-h-[80px]" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">{t("common.cover","صورة الغلاف")}</label>
              <input value={form.cover} onChange={e=>on("cover",e.target.value)}
                     placeholder="/images/blog/cover.webp"
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1">{t("common.author","المؤلف")}</label>
              <input value={form.author} onChange={e=>on("author",e.target.value)}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block mb-1">{t("common.category","التصنيف")}</label>
              <input value={form.category} onChange={e=>on("category",e.target.value)}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1">{t("common.tags","الوسوم")}</label>
              <input value={form.tags} onChange={e=>on("tags",e.target.value)} placeholder="tag1, tag2"
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1">{t("common.language","اللغة")}</label>
                <select value={form.lang} onChange={e=>on("lang",e.target.value as "ar"|"en")}
                        className="w-full bg-white border border-sand rounded-lg px-3 py-2">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block mb-1">{t("common.status","الحالة")}</label>
                <select value={form.status} onChange={e=>on("status",e.target.value as "draft"|"published")}
                        className="w-full bg-white border border-sand rounded-lg px-3 py-2">
                  <option value="draft">{t("common.draft","مسودة")}</option>
                  <option value="published">{t("common.published","منشور")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1">{t("common.date","التاريخ")}</label>
              <input type="date" value={form.date} onChange={e=>on("date",e.target.value)}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block mb-1">{t("common.content","المحتوى (Markdown)")}</label>
            <textarea value={form.content} onChange={e=>on("content",e.target.value)}
                      className="w-full bg-white border border-sand rounded-lg px-3 py-2 min-h-[260px] font-mono"
                      placeholder={`## عنوان فرعي\n\nنص…`} />
          </div>
        </div>

        <div className="bg-ivory rounded-xl shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-3">{t("common.preview","معاينة")}</h2>
          <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
