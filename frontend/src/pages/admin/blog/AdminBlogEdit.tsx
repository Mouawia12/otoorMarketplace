import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import slugify from "slugify";
import { marked } from "marked";
import api from "../../../lib/api";

type Mode = "create" | "edit";
type Form = {
  title: string; slug: string; description: string; cover?: string;
  author?: string; category?: string; tags: string;
  lang: "ar"|"en"; date: string; status: "draft"|"published";
  content: string;
};

type AdminBlogPost = Form & { id: number; cover?: string };

export default function AdminBlogEdit({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [form, setForm] = useState<Form>({
    title:"", slug:"", description:"", cover:"", author:"", category:"",
    tags:"", lang:"ar", date:new Date().toISOString().slice(0,10),
    status:"draft", content:""
  });

  useEffect(() => {
    if (mode === "edit" && id) {
      (async () => {
        try {
          const res = await api.get(`/admin/blog/${id}`);
          const existing = res.data as AdminBlogPost;
          const tagsValue = Array.isArray(existing.tags)
            ? existing.tags.join(", ")
            : existing.tags || "";

          setForm({
            title: existing.title,
            slug: existing.slug,
            description: existing.description,
            cover: existing.cover,
            author: existing.author,
            category: existing.category,
            tags: tagsValue,
            lang: existing.lang,
            date: existing.date,
            status: existing.status,
            content: existing.content,
          });
          if (existing.cover) {
            setCoverPreview(existing.cover);
          }
        } catch (error) {
          console.error("Failed to load post", error);
          alert(t("common.error","حدث خطأ"));
        }
      })();
    }
  }, [mode, id]);

  const on = (k: keyof Form, v:any)=> setForm(s=>({...s,[k]:v}));
  const html = useMemo(
    () => marked.parse(form.content || "") as string,
    [form.content]
  );
  const autoSlug = ()=> form.title && on("slug", slugify(form.title,{lower:true,strict:true}));

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const save = async ()=>{
    setSaving(true);
    try{
      const coverData = coverFile ? await readFileAsDataUrl(coverFile) : undefined;
      const payload = {
        ...form,
        tags: tagsList,
        coverData,
        coverUrl: !coverFile ? coverPreview || form.cover : undefined,
      };

      if (mode === "edit" && id) {
        await api.put(`/admin/blog/${id}`, payload);
      } else {
        await api.post(`/admin/blog`, payload);
      }

      navigate("/admin/blog");
    }catch(e){ console.error(e); alert(t("common.error","حدث خطأ")); }
    finally{ setSaving(false); }
  };

  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [coverFile]);

  useEffect(() => {
    if (!coverFile && form.cover && !coverPreview) {
      setCoverPreview(form.cover);
    }
  }, [coverFile, form.cover, coverPreview]);

  const tagsList = useMemo(
    () => (form.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    [form.tags]
  );

  const handleCoverInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      on("cover", file.name);
    }
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
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverInput}
                  className="block w-full text-sm text-charcoal file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gold file:text-charcoal hover:file:bg-gold-hover"
                />
                {coverPreview && (
                  <div className="w-full h-32 rounded-lg overflow-hidden border border-sand bg-sand/40 flex items-center justify-center">
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={(e)=>{ e.currentTarget.style.display="none"; }}
                    />
                  </div>
                )}
              </div>
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
            <div>
              <label className="block mb-1">{t("common.date","التاريخ")}</label>
              <input type="date" value={form.date} onChange={e=>on("date",e.target.value)}
                     className="w-full bg-white border border-sand rounded-lg px-3 py-2" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
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
            <label className="block mb-1">{t("common.content","المحتوى (Markdown)")}</label>
            <textarea value={form.content} onChange={e=>on("content",e.target.value)}
                      className="w-full bg-white border border-sand rounded-lg px-3 py-2 min-h-[260px] font-mono"
                      placeholder={`## عنوان فرعي\n\nنص…`} />
          </div>
        </div>

        <div className="bg-ivory rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="text-lg font-semibold">{t("common.preview","معاينة")}</h2>

          <div className="bg-white border border-sand rounded-xl overflow-hidden shadow-sm">
            <div className="h-48 bg-sand/50 relative">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                  onError={(e)=>{ e.currentTarget.style.display="none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-charcoal-light text-sm">
                  {t("common.noImage","لا توجد صورة غلاف بعد")}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-ivory">
                <p className="text-xs">{form.category || t("common.category","التصنيف")}</p>
                <h3 className="text-xl font-bold">{form.title || "Heading"}</h3>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex flex-wrap gap-2 text-xs text-charcoal-light">
                <span>{form.author || t("common.author","المؤلف")}</span>
                <span>•</span>
                <span>{form.date || "—"}</span>
                {tagsList.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex flex-wrap gap-1">
                      {tagsList.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-sand/60 rounded-full text-charcoal text-[11px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="text-charcoal font-semibold text-lg">{form.title || "Heading"}</p>
              <p className="text-charcoal-light text-sm line-clamp-2">
                {form.description || t("common.description","الوصف")}
              </p>
            </div>
          </div>

          <article className="prose max-w-none bg-white rounded-xl border border-sand p-4"
                   dangerouslySetInnerHTML={{ __html: html || "<h2>Heading</h2><p>Content…</p>" }} />
        </div>
      </div>
    </div>
  );
}
