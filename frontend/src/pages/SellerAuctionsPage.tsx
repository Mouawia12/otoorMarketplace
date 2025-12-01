import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Auction, Product, ProductTemplate } from "../types";
import { useUIStore } from "../store/uiStore";
import { formatPrice } from "../utils/currency";
import { normalizeImagePathForStorage, resolveImageUrl } from "../utils/image";
import { compressImageFile } from "../utils/imageCompression";
import { sellerSearchTemplates } from "../services/productTemplateService";
import { PLACEHOLDER_PERFUME } from "../utils/staticAssets";
import SARIcon from "../components/common/SARIcon";

type AuctionFilter = "all" | "active" | "scheduled" | "completed" | "cancelled";

const statusTone = (status: string) => {
  switch (status) {
    case "active":
      return "text-green-600 bg-green-100";
    case "scheduled":
      return "text-blue-600 bg-blue-100";
    case "completed":
      return "text-gray-600 bg-gray-200";
    case "cancelled":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const statusLabelKey = (status: AuctionFilter) => {
  switch (status) {
    case "active":
      return "seller.active";
    case "scheduled":
      return "seller.upcoming";
    case "completed":
      return "seller.ended";
    case "cancelled":
      return "seller.cancelled";
    default:
      return "seller.allAuctions";
  }
};

export default function SellerAuctionsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filter, setFilter] = useState<AuctionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== "all" ? { status: filter.toUpperCase() } : undefined;
      const response = await api.get<Auction[]>("/seller/auctions", { params });
      setAuctions(response.data);
    } catch (err: any) {
      console.error("Failed to load seller auctions", err);
      setError(err?.response?.data?.detail ?? t("common.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filteredAuctions = useMemo(() => {
    if (filter === "all") {
      return auctions;
    }
    return auctions.filter((auction) => auction.status === filter);
  }, [auctions, filter]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-luxury p-8 shadow-luxury text-center">
        <p className="text-red-600 font-semibold mb-3">{error}</p>
        <button
          onClick={() => loadAuctions()}
          className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover transition"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const renderPrice = (value: number | undefined, size = 16, className = "") => {
    if (value === undefined || value === null) return "-";
    const formatted = formatPrice(value, language).replace(/\s?(SAR|﷼)$/i, "");
    return (
      <span className={`inline-flex items-center gap-1 ${className}`.trim()}>
        {formatted}
        <SARIcon size={size} />
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-h2 text-charcoal">{t("seller.auctions")}</h1>
            <p className="text-taupe text-sm">{t("seller.auctionsSubtitle")}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gold text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            + {t("seller.createAuction")}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {(["all", "active", "scheduled", "completed", "cancelled"] as AuctionFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-luxury text-sm font-semibold ${
                filter === status ? "bg-gold text-charcoal" : "bg-sand text-charcoal-light"
              }`}
            >
              {t(statusLabelKey(status))}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.id")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.product")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.startDate")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.endDate")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.startingPrice")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.currentBid")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.totalBids")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("seller.status")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuctions.map((auction) => {
                const productName =
                  i18n.language === "ar"
                    ? auction.product?.name_ar ?? t("products.unknownProduct")
                    : auction.product?.name_en ?? t("products.unknownProduct");
                return (
                  <tr key={auction.id} className="border-b border-gray-100 hover:bg-sand transition">
                    <td className="px-4 py-4 text-charcoal-light">{auction.id}</td>
                    <td className="px-4 py-4 text-charcoal font-medium">{productName}</td>
                    <td className="px-4 py-4 text-charcoal-light">
                      {new Date(auction.start_time).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                    </td>
                    <td className="px-4 py-4 text-charcoal-light">
                      {new Date(auction.end_time).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                    </td>
                    <td className="px-4 py-4 text-charcoal-light">
                      {renderPrice(auction.starting_price)}
                    </td>
                    <td className="px-4 py-4 text-charcoal font-semibold">
                      {auction.status === "active"
                        ? renderPrice(auction.current_price)
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-charcoal-light">{auction.total_bids ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusTone(auction.status)}`}>
                        {t(statusLabelKey(auction.status as AuctionFilter))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAuctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t("seller.noAuctions")}</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateAuctionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadAuctions();
          }}
        />
      )}
    </div>
  );
}

type CreateAuctionModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

type ProductSource = "existing" | "new";

type ProductFormState = {
  name_en: string;
  name_ar: string;
  brand: string;
  product_type: string;
  category: string;
  base_price: string;
  size_ml: string;
  concentration: string;
  description_en: string;
  description_ar: string;
  stock_quantity: string;
  condition: "NEW" | "USED";
  image_urls: string[];
};

const createProductFormState = (): ProductFormState => ({
  name_en: "",
  name_ar: "",
  brand: "",
  product_type: "EDP",
  category: "",
  base_price: "",
  size_ml: "",
  concentration: "",
  description_en: "",
  description_ar: "",
  stock_quantity: "1",
  condition: "NEW",
  image_urls: [],
});

function CreateAuctionModal({ onClose, onCreated }: CreateAuctionModalProps) {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [form, setForm] = useState({
    productId: "",
    startingPrice: "",
    minimumIncrement: "10",
    startTime: new Date().toISOString().slice(0, 16),
    durationHours: "24",
  });
  const [error, setError] = useState<string | null>(null);
  const [productSource, setProductSource] = useState<ProductSource>("existing");
  const [productForm, setProductForm] = useState<ProductFormState>(() => createProductFormState());
  const [templateQuery, setTemplateQuery] = useState("");
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setInitialLoading(true);
        const response = await api.get<Product[]>("/seller/products", { params: { status: "published" } });
        setProducts(response.data);
      } catch (err: any) {
        console.error("Failed to load seller products", err);
        setError(err?.response?.data?.detail ?? t("common.errorLoading"));
      } finally {
        setInitialLoading(false);
      }
    };

    fetchProducts();
  }, [t]);

  useEffect(() => {
    if (productSource !== "new") return;
    const term = templateQuery.trim();
    if (term.length === 1) return;
    let cancelled = false;
    setTemplatesLoading(true);
    (async () => {
      try {
        const response = await sellerSearchTemplates({
          limit: 6,
          ...(term ? { search: term } : {}),
        });
        if (!cancelled) {
          setTemplates(response);
          setTemplateError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTemplateError(t("seller.templateLoadFailed", "Failed to load templates"));
        }
      } finally {
        if (!cancelled) {
          setTemplatesLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productSource, templateQuery, t]);

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-luxury p-6 min-w-[320px] text-center">
          <p className="text-taupe">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const start = new Date(form.startTime);
      const duration = Number(form.durationHours) || 24;
      const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

      if (duration < 12) {
        setError(t("seller.auctionMinDuration", "يجب ألا تقل مدة المزاد عن 12 ساعة"));
        setLoading(false);
        return;
      }

      let productId = Number(form.productId);

      if (productSource === "new") {
        const newProductId = await createAuctionProduct();
        productId = newProductId;
      } else if (!productId) {
        setError(t("seller.selectProductFirst", "يرجى اختيار منتج للمزاد"));
        setLoading(false);
        return;
      }

      await api.post("/seller/auctions", {
        productId,
        startingPrice: Number(form.startingPrice),
        minimumIncrement: Number(form.minimumIncrement),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      onCreated();
      setForm({
        productId: "",
        startingPrice: "",
        minimumIncrement: "10",
        startTime: new Date().toISOString().slice(0, 16),
        durationHours: "24",
      });
      setProductForm(createProductFormState());
      setSelectedTemplateId(null);
      setTemplateQuery("");
    } catch (err: any) {
      console.error("Failed to create auction", err);
      setError(err?.response?.data?.detail ?? t("seller.createAuctionFailed", "Failed to create auction"));
    } finally {
      setLoading(false);
    }
  };

  const createAuctionProduct = async () => {
    if (productForm.image_urls.length === 0) {
      throw new Error(t("seller.imageRequired", "Please upload at least one image"));
    }
    const payload = {
      nameEn: productForm.name_en,
      nameAr: productForm.name_ar,
      brand: productForm.brand,
      productType: productForm.product_type,
      category: productForm.category,
      basePrice: parseFloat(productForm.base_price || "0"),
      sizeMl: parseInt(productForm.size_ml || "0", 10),
      concentration: productForm.concentration,
      stockQuantity: parseInt(productForm.stock_quantity || "1", 10),
      descriptionEn: productForm.description_en,
      descriptionAr: productForm.description_ar,
      condition: productForm.condition,
      status: "PUBLISHED",
      imageUrls: productForm.image_urls,
    };
    const { data } = await api.post("/seller/products", payload);
    return data?.id;
  };

  const handleProductChange =
    (field: keyof Omit<ProductFormState, "image_urls">) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setProductForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (!files.length) return;
    try {
      setLoading(true);
      const uploaded: string[] = [];
      const MAX_BYTES = 3 * 1024 * 1024;
      for (const file of files) {
        const optimized = await compressImageFile(file, { maxBytes: MAX_BYTES });
        if (optimized.size > MAX_BYTES) {
          alert(t("seller.imageTooLarge", "حجم الصورة يجب ألا يتجاوز ٣ ميجابايت"));
          continue;
        }
        const formData = new FormData();
        formData.append("image", optimized);
        const { data } = await api.post("/uploads/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const stored = normalizeImagePathForStorage(data?.path || data?.url);
        uploaded.push(stored || data?.url);
      }
      setProductForm((prev) => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploaded.filter(Boolean)],
      }));
    } catch (err) {
      console.error("Failed to upload", err);
      alert(t("seller.uploadFailed", "Failed to upload image"));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    setProductForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((img) => img !== url),
    }));
  };

  const handleSetPrimaryImage = (url: string) => {
    setProductForm((prev) => {
      if (!prev.image_urls.includes(url)) return prev;
      const remaining = prev.image_urls.filter((img) => img !== url);
      return {
        ...prev,
        image_urls: [url, ...remaining],
      };
    });
  };

  const applyTemplate = (template: ProductTemplate) => {
    setSelectedTemplateId(template.id);
    setProductForm({
      name_en: template.name_en,
      name_ar: template.name_ar,
      brand: template.brand,
      product_type: template.product_type || "EDP",
      category: template.category,
      base_price: template.base_price?.toString() || "",
      size_ml: template.size_ml?.toString() || "",
      concentration: template.concentration,
      description_en: template.description_en,
      description_ar: template.description_ar,
      stock_quantity: "1",
      condition: "NEW",
      image_urls: template.image_urls?.slice?.() || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-4">{t("seller.createAuction")}</h3>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setProductSource("existing")}
              className={`flex-1 px-4 py-2 rounded-luxury border ${
                productSource === "existing" ? "border-gold bg-gold/10 text-charcoal" : "border-gray-300 text-charcoal-light"
              }`}
            >
              {t("seller.productSourceExisting", "منتج مضاف مسبقاً")}
            </button>
            <button
              type="button"
              onClick={() => setProductSource("new")}
              className={`flex-1 px-4 py-2 rounded-luxury border ${
                productSource === "new" ? "border-gold bg-gold/10 text-charcoal" : "border-gray-300 text-charcoal-light"
              }`}
            >
              {t("seller.productSourceNew", "إنشاء منتج جديد")}
            </button>
          </div>

          {productSource === "existing" ? (
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("seller.product")}</label>
              <select
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              >
                <option value="">{t("seller.selectProduct")}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {language === "ar" ? product.name_ar : product.name_en}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4 rounded-luxury border border-gray-200 bg-sand/20 p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-charcoal font-semibold mb-1">{t("seller.templateLibraryTitle", "مكتبة المنتجات الجاهزة")}</label>
                  <input
                    type="text"
                    value={templateQuery}
                    onChange={(e) => setTemplateQuery(e.target.value)}
                    placeholder={t("seller.templateSearchPlaceholder", "ابحث عن منتج جاهز...")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateQuery("");
                    setSelectedTemplateId(null);
                    setProductForm(createProductFormState());
                  }}
                  className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-white"
                >
                  {t("seller.templateClear", "إعادة التعيين")}
                </button>
              </div>
              {templatesLoading && <p className="text-sm text-taupe">{t("common.loading")}</p>}
              {templateError && <p className="text-sm text-red-600">{templateError}</p>}
              {!templatesLoading && !templateError && templates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => {
                    const title = i18n.language === "ar" ? template.name_ar : template.name_en;
                    const preview = resolveImageUrl(template.image_urls?.[0]) || PLACEHOLDER_PERFUME;
                    const isActive = selectedTemplateId === template.id;
                    return (
                      <button
                        type="button"
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        className={`flex items-center gap-3 rounded-luxury border p-3 text-left transition ${
                          isActive ? "border-gold bg-white" : "border-gray-200 bg-white"
                        }`}
                      >
                        <img src={preview} alt={title} className="w-14 h-14 rounded-lg object-cover" />
                        <div>
                          <p className="font-semibold text-charcoal">{title}</p>
                          <p className="text-sm text-taupe">{template.brand}</p>
                          <span className={`text-xs ${isActive ? "text-green-600" : "text-gold"}`}>
                            {isActive ? t("seller.templateApplied", "تم التطبيق") : t("seller.templateApply", "استخدام القالب")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.titleEn", "Title (EN)")}</label>
                  <input
                    type="text"
                    value={productForm.name_en}
                    onChange={handleProductChange("name_en")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.titleAr", "Title (AR)")}</label>
                  <input
                    type="text"
                    value={productForm.name_ar}
                    onChange={handleProductChange("name_ar")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.brand", "Brand")}</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={handleProductChange("brand")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.category", "Category")}</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={handleProductChange("category")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.type", "Type")}</label>
                  <select
                    value={productForm.product_type}
                    onChange={handleProductChange("product_type")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  >
                    <option value="EDP">EDP</option>
                    <option value="EDT">EDT</option>
                    <option value="EDC">EDC</option>
                    <option value="Parfum">Parfum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.price", "Price")}</label>
                  <input
                    type="number"
                    value={productForm.base_price}
                    onChange={handleProductChange("base_price")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.stock", "Stock quantity")}</label>
                  <input
                    type="number"
                    value={productForm.stock_quantity}
                    onChange={handleProductChange("stock_quantity")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.size", "Size (ml)")}</label>
                  <input
                    type="number"
                    value={productForm.size_ml}
                    onChange={handleProductChange("size_ml")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.concentration", "Concentration")}</label>
                  <input
                    type="text"
                    value={productForm.concentration}
                    onChange={handleProductChange("concentration")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.condition", "Condition")}</label>
                  <select
                    value={productForm.condition}
                    onChange={handleProductChange("condition")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  >
                    <option value="NEW">{t("seller.conditionNew", "New")}</option>
                    <option value="USED">{t("seller.conditionUsed", "Used")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.descriptionEn", "Description (EN)")}</label>
                  <textarea
                    value={productForm.description_en}
                    onChange={handleProductChange("description_en")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-charcoal font-semibold mb-2">{t("seller.descriptionAr", "Description (AR)")}</label>
                  <textarea
                    value={productForm.description_ar}
                    onChange={handleProductChange("description_ar")}
                    className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-2">{t("seller.images", "Images")}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none bg-white"
                />
                <p className="text-sm text-taupe mt-1">{t("seller.imageUploadHint", "PNG أو JPG حتى ٥ ميجابايت لكل صورة")}</p>
                {productForm.image_urls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {productForm.image_urls.map((url) => {
                      const preview = resolveImageUrl(url) || url;
                      return (
                        <div key={url} className="relative border border-gray-200 rounded-lg overflow-hidden">
                          <img src={preview} alt="Product" className="w-full h-24 object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-2 right-2 bg-white/90 text-red-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(url)}
                            className="absolute bottom-2 left-2 bg-charcoal/85 text-white text-xs px-2 py-1 rounded-full shadow hover:bg-charcoal transition"
                          >
                            {t("seller.setPrimaryImage", "Set as cover image")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("seller.startingPrice")}</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.startingPrice}
                onChange={handleChange("startingPrice")}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("seller.minimumIncrement")}</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.minimumIncrement}
                onChange={handleChange("minimumIncrement")}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("seller.startDateTime")}</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={handleChange("startTime")}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("seller.durationHours")}</label>
              <input
                type="number"
                min="12"
                value={form.durationHours}
                onChange={handleChange("durationHours")}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              />
              <p className="text-xs text-taupe mt-1">{t("seller.auctionMinDuration", "مدة المزاد لا تقل عن 12 ساعة")}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal hover:bg-gray-100"
              disabled={loading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-luxury bg-gold text-charcoal font-semibold hover:bg-gold-hover disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
