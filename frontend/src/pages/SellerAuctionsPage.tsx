import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Auction, Product } from "../types";
import { useUIStore } from "../store/uiStore";
import { formatPrice } from "../utils/currency";

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
                      {formatPrice(auction.starting_price, language)}
                    </td>
                    <td className="px-4 py-4 text-charcoal font-semibold">
                      {auction.status === "active"
                        ? formatPrice(auction.current_price, language)
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

function CreateAuctionModal({ onClose, onCreated }: CreateAuctionModalProps) {
  const { t } = useTranslation();
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

      await api.post("/seller/auctions", {
        productId: Number(form.productId),
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
    } catch (err: any) {
      console.error("Failed to create auction", err);
      setError(err?.response?.data?.detail ?? t("seller.createAuctionFailed", "Failed to create auction"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-luxury p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-h3 text-charcoal mb-4">{t("seller.createAuction")}</h3>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                min="1"
                value={form.durationHours}
                onChange={handleChange("durationHours")}
                className="w-full px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
              />
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
