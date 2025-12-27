import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import slugify from "slugify";
import DOMPurify from "dompurify";
import api from "../../../lib/api";
import { normalizeImagePathForStorage, resolveImageUrl } from "../../../utils/image";
import { compressImageFile } from "../../../utils/imageCompression";
import RichTextEditorModal from "../../../components/common/RichTextEditorModal";

const MAX_COVER_BYTES = 3 * 1024 * 1024; // 3MB

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Form>({
    title:"", slug:"", description:"", cover:"", author:"", category:"",
    tags:"", lang:"ar", date:new Date().toISOString().slice(0,10),
    status:"draft", content:""
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    if (mode === "edit" && id) {
      (async () => {
        try {
          const res = await api.get(`/admin/blog/${id}`);
          const existing = res.data as AdminBlogPost;
          const tagsValue = Array.isArray(existing.tags)
            ? existing.tags.join(", ")
            : existing.tags || "";

          const sanitizedCover = normalizeImagePathForStorage(existing.cover) || existing.cover || "";
          setForm({
            title: existing.title,
            slug: existing.slug,
            description: existing.description,
            cover: sanitizedCover,
            author: existing.author,
            category: existing.category,
            tags: tagsValue,
            lang: existing.lang,
            date: existing.date,
            status: existing.status,
            content: existing.content,
          });
          if (existing.cover) {
            const previewUrl = existing.cover.startsWith("data:") || existing.cover.startsWith("blob:")
              ? existing.cover
              : resolveImageUrl(existing.cover, { disableOptimization: true }) || existing.cover;
            setCoverPreview(previewUrl);
          }
        } catch (error) {
          console.error("Failed to load post", error);
          alert(t("common.error","حدث خطأ"));
        }
      })();
    }
  }, [mode, id]);

  const on = (k: keyof Form, v:any)=> {
    setForm(s=>({...s,[k]:v}));
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };
  const html = useMemo(() => DOMPurify.sanitize(form.content || ""), [form.content]);
  const autoSlug = ()=> form.title && on("slug", slugify(form.title,{lower:true,strict:true}));

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = t("validation.required", "هذا الحقل مطلوب");
    if (!form.slug.trim()) nextErrors.slug = t("validation.required", "هذا الحقل مطلوب");
    if (!form.description.trim()) nextErrors.description = t("validation.required", "هذا الحقل مطلوب");
    if (!form.content.trim()) nextErrors.content = t("validation.required", "هذا الحقل مطلوب");
    if (!coverPreview && !coverFile && !form.cover?.trim()) nextErrors.cover = t("validation.coverRequired", "يرجى رفع صورة للغلاف");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const formatServerError = (raw: string) => {
    if (!raw) return t("common.error", "حدث خطأ");
    if (/entity\.too\.large/i.test(raw)) {
      return t("errors.imageTooLarge", "حجم الملف أكبر من المسموح (٣ ميجابايت)");
    }
    return raw;
  };

  const save = async ()=>{
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitError(null);
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
    }catch(e: any){ 
      console.error(e); 
      const message = e?.response?.data?.message || e?.response?.data?.detail || e?.message;
      setSubmitError(formatServerError(message));
    }
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
      const isDataUrl = form.cover.startsWith("data:") || form.cover.startsWith("blob:");
      const resolved = isDataUrl ? form.cover : resolveImageUrl(form.cover) || form.cover;
      setCoverPreview(resolved);
    }
  }, [coverFile, form.cover, coverPreview]);

  const tagsList = useMemo(
    () => (form.tags || "").split(",").map(t => t.trim()).filter(Boolean),
    [form.tags]
  );

  const handleCoverInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const optimized = await compressImageFile(file, { maxBytes: MAX_COVER_BYTES });
      if (optimized.size > MAX_COVER_BYTES) {
        setErrors((prev) => ({
          ...prev,
          cover: t("validation.coverTooLarge", "حجم الصورة يتجاوز ٣ ميجابايت"),
        }));
        setCoverFile(null);
        return;
      }
      setCoverFile(optimized);
      setErrors((prev) => {
        if (!prev.cover) return prev;
        const next = { ...prev };
        delete next.cover;
        return next;
      });
      on("cover", optimized.name);
    }
  };

  const fieldBorder = (field: keyof Form | "cover" | "content") =>
    `w-full bg-white rounded-lg px-3 py-2 border ${
      errors[field] ? "border-red-500 focus:border-red-500" : "border-sand focus:border-gold"
    }`;

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
      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-ivory rounded-xl shadow-sm p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1">{t("common.title","العنوان")}</label>
              <input value={form.title} onChange={e=>on("title",e.target.value)} onBlur={autoSlug}
                     className={fieldBorder("title")} />
              {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block mb-1">Slug</label>
              <input value={form.slug} onChange={e=>on("slug",e.target.value)}
                     className={fieldBorder("slug")} />
              {errors.slug && <p className="text-sm text-red-600 mt-1">{errors.slug}</p>}
            </div>
          </div>

          <div>
            <label className="block mb-1">{t("common.description","الوصف")}</label>
            <textarea value={form.description} onChange={e=>on("description",e.target.value)}
                      className={`${fieldBorder("description")} min-h-[80px]`} />
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
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
                <div className={`w-full rounded-lg border ${errors.cover ? "border-red-500" : "border-sand"} bg-sand/40 overflow-hidden`}>
                  {coverPreview ? (
                    <div className="relative aspect-[4/3]">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = "none";
                    }}
                  />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-3 right-3 text-white">
                        <p className="text-xs opacity-80">
                          {form.category || t("common.category", "التصنيف")}
                        </p>
                        <p className="font-semibold text-sm line-clamp-2">
                          {form.title || t("common.title", "العنوان")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex flex-col items-center justify-center text-charcoal-light text-sm gap-1">
                      <span className="text-3xl">🖼️</span>
                      <p>{t("common.noImage","لا توجد صورة غلاف بعد")}</p>
                    </div>
                  )}
                </div>
                {errors.cover && <p className="text-sm text-red-600">{errors.cover}</p>}
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
            <label className="block mb-1">{t("common.content","المحتوى")}</label>
            <div className={`${fieldBorder("content")} min-h-[160px] bg-white rounded-lg p-3`}>
              {form.content ? (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <p className="text-sm text-charcoal-light">{t("admin.noContent", "لا يوجد محتوى بعد.")}</p>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="px-4 py-2 rounded-luxury border border-sand text-charcoal text-sm font-semibold hover:bg-sand/60"
              >
                {t("admin.editContent", "تحرير المحتوى")}
              </button>
            </div>
            {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}
          </div>
        </div>

        <div className="bg-ivory rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="text-lg font-semibold">{t("common.preview","معاينة")}</h2>

          <div className="bg-white border border-sand rounded-xl overflow-hidden shadow-sm">
            <div className="relative aspect-[16/9] bg-sand/50 flex items-center justify-center">
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Cover"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-ivory">
                    <p className="text-xs opacity-90">
                      {form.category || t("common.category", "التصنيف")}
                    </p>
                    <h3 className="text-xl font-bold line-clamp-2">
                      {form.title || t("common.title", "العنوان")}
                    </h3>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-charcoal-light gap-2">
                  <span className="text-4xl">🖼️</span>
                  <p className="text-sm">{t("common.noImage","لا توجد صورة غلاف بعد")}</p>
                  <p className="text-xs">{t("common.cover","قم برفع صورة ليظهر المعاينة")}</p>
                </div>
              )}
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

          <article
            className="prose max-w-none bg-white rounded-xl border border-sand p-4"
            dangerouslySetInnerHTML={{ __html: html || "<h2>Heading</h2><p>Content…</p>" }}
          />
        </div>
      </div>

      <RichTextEditorModal
        isOpen={editorOpen}
        title={t("admin.editContent", "تحرير المحتوى")}
        value={form.content}
        onSave={(value) => on("content", value)}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  );
}
