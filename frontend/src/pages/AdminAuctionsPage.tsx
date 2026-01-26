import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import type { Auction, Bid } from "../types";
import { formatPrice } from "../utils/currency";
import { useUIStore } from "../store/uiStore";

type FilterStatus =
  | "all"
  | "pending_review"
  | "active"
  | "scheduled"
  | "completed"
  | "cancelled";

const statusLabelKey = (status: FilterStatus) => {
  switch (status) {
    case "active":
      return "admin.running";
    case "scheduled":
      return "admin.scheduled";
    case "completed":
      return "admin.ended";
    case "cancelled":
      return "admin.cancelled";
    case "pending_review":
      return "admin.pendingReview";
    default:
      return "admin.all";
  }
};

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
    case "pending_review":
      return "text-amber-700 bg-amber-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

export default function AdminAuctionsPage() {
  const { t, i18n } = useTranslation();
  const { language } = useUIStore();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBidLog, setShowBidLog] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidLog, setBidLog] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [actionAuctionId, setActionAuctionId] = useState<number | null>(null);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<Auction[]>("/admin/auctions");
      setAuctions(response.data);
    } catch (err: any) {
      console.error("Failed to load admin auctions", err);
      setError(err?.response?.data?.detail ?? t("common.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [t]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredAuctions = useMemo(() => {
    if (filter === "all") {
      return auctions;
    }
    return auctions.filter((auction) => auction.status === filter);
  }, [auctions, filter]);

  const handleViewBids = async (auction: Auction) => {
    try {
      setActionAuctionId(auction.id);
      setNotice(null);
      setSelectedAuction(auction);
      setShowBidLog(true);
      setBidsLoading(true);
      const response = await api.get<{ bids: Bid[] }>(`/auctions/${auction.id}/bids`);
      setBidLog(response.data.bids);
    } catch (err: any) {
      console.error("Failed to load bids", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("admin.loadBidsFailed", "Failed to load bids"),
      });
      setShowBidLog(false);
    } finally {
      setBidsLoading(false);
      setActionAuctionId(null);
    }
  };

  const handleExtend = async (auction: Auction) => {
    const newEnd = new Date(auction.end_time);
    newEnd.setHours(newEnd.getHours() + 24);
    try {
      setActionAuctionId(auction.id);
      setNotice(null);
      await api.patch(`/admin/auctions/${auction.id}`, { endTime: newEnd.toISOString() });
      await loadAuctions();
      setNotice({
        tone: "success",
        message: t("admin.extendSuccess", "تم تمديد المزاد بنجاح"),
      });
    } catch (err: any) {
      console.error("Failed to extend auction", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("admin.extendFailed", "Failed to extend auction"),
      });
    } finally {
      setActionAuctionId(null);
    }
  };

  const handleEnd = async (auction: Auction) => {
    if (!window.confirm(t("admin.confirmEnd"))) {
      return;
    }
    try {
      setActionAuctionId(auction.id);
      setNotice(null);
      await api.patch(`/admin/auctions/${auction.id}`, { status: "completed" });
      await loadAuctions();
      setNotice({
        tone: "success",
        message: t("admin.endSuccess", "تم إنهاء المزاد"),
      });
    } catch (err: any) {
      console.error("Failed to end auction", err);
      setNotice({
        tone: "error",
        message: err?.response?.data?.detail ?? t("admin.endFailed", "Failed to end auction"),
      });
    } finally {
      setActionAuctionId(null);
    }
  };

  const handleApprove = async (auction: Auction) => {
    const now = new Date();
    const start = new Date(auction.start_time);
    const end = new Date(auction.end_time);

    if (end <= now) {
      alert(t("admin.cannotApproveEnded", "Cannot approve an auction that already ended"));
      return;
    }

    const nextStatus = start > now ? "scheduled" : "active";

    try {
      setActionAuctionId(auction.id);
      setNotice(null);
      await api.patch(`/admin/auctions/${auction.id}`, { status: nextStatus });
      await loadAuctions();
      setNotice({
        tone: "success",
        message: t("admin.approveSuccess", "تم اعتماد المزاد"),
      });
    } catch (err: any) {
      console.error("Failed to approve auction", err);
      setNotice({
        tone: "error",
        message:
          err?.response?.data?.detail ?? t("admin.approveAuctionFailed", "Failed to approve auction"),
      });
    } finally {
      setActionAuctionId(null);
    }
  };

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
      {notice && (
        <div
          className={`rounded-luxury border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      )}
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t("admin.auctions")}</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {(["all", "pending_review", "active", "scheduled", "completed", "cancelled"] as FilterStatus[]).map((status) => (
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
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.id")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.product")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.endDate")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.currentBid")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.totalBids")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.status")}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAuctions.map((auction) => {
                const productName =
                  i18n.language === "ar"
                    ? auction.product?.name_ar ?? t("products.unknownProduct")
                    : auction.product?.name_en ?? t("products.unknownProduct");
                const isRowBusy = actionAuctionId === auction.id;
                return (
                  <tr key={auction.id} className="border-b border-gray-100 hover:bg-sand">
                    <td className="px-4 py-4 text-charcoal-light">{auction.id}</td>
                    <td className="px-4 py-4 text-charcoal font-medium">{productName}</td>
                    <td className="px-4 py-4 text-charcoal-light">
                      {new Date(auction.end_time).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                    </td>
                    <td className="px-4 py-4 text-charcoal font-semibold">
                      {formatPrice(auction.current_price ?? auction.starting_price, language)}
                    </td>
                    <td className="px-4 py-4 text-charcoal-light">{auction.total_bids ?? 0}</td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusTone(auction.status)}`}>
                        {t(statusLabelKey(auction.status as FilterStatus))}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {auction.status !== "pending_review" && (
                          <button
                            onClick={() => handleViewBids(auction)}
                            disabled={isRowBusy}
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isRowBusy ? t("common.loading") : t("admin.viewBids")}
                          </button>
                        )}
                        {auction.status === "pending_review" && (
                          <button
                            onClick={() => handleApprove(auction)}
                            disabled={isRowBusy}
                            className="text-green-700 hover:text-green-800 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isRowBusy ? t("common.loading") : t("admin.approveAuction", "Approve")}
                          </button>
                        )}
                        {auction.status === "active" && (
                          <>
                            <button
                              onClick={() => handleExtend(auction)}
                              disabled={isRowBusy}
                              className="text-gold hover:text-gold-hover text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isRowBusy ? t("common.loading") : t("admin.extend")}
                            </button>
                            <button
                              onClick={() => handleEnd(auction)}
                              disabled={isRowBusy}
                              className="text-red-600 hover:text-red-700 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isRowBusy ? t("common.loading") : t("admin.end")}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAuctions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t("admin.noAuctions")}</p>
          </div>
        )}
      </div>

      {showBidLog && selectedAuction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-luxury p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-h3 text-charcoal mb-4">
              {t("admin.bidLog")} -{" "}
              {i18n.language === "ar"
                ? selectedAuction.product?.name_ar ?? selectedAuction.id
                : selectedAuction.product?.name_en ?? selectedAuction.id}
            </h3>
            {bidsLoading ? (
              <p className="text-taupe text-center py-6">{t("common.loading")}</p>
            ) : bidLog.length === 0 ? (
              <p className="text-taupe text-center py-6">{t("admin.noBids")}</p>
            ) : (
              <div className="space-y-3">
                {bidLog.map((bid) => (
                  <div key={bid.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-luxury">
                    <div>
                      <p className="text-charcoal font-medium">{bid.bidder?.full_name ?? bid.bidder_id}</p>
                      <p className="text-sm text-taupe">
                        {new Date(bid.created_at).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                      </p>
                    </div>
                    <p className="text-xl font-bold text-gold">
                      {formatPrice(bid.amount, language)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowBidLog(false)}
              className="mt-4 w-full bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
