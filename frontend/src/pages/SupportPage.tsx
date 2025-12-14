import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { SupportTicket } from "../types";
import { useAuthStore } from "../store/authStore";

type StatusKey = "open" | "pending" | "answered" | "closed";
type RoleFilter = "all" | "buyer" | "seller";

export default function SupportPage() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isAdmin = useMemo(
    () => user?.roles?.some((r) => ["admin", "super_admin"].includes(r.toLowerCase())),
    [user]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (isAdmin && roleFilter !== "all") params.role = roleFilter === "buyer" ? "buyer" : "seller";
        const res = await api.get("/support", { params });
        setTickets(res.data.tickets ?? []);
      } catch (err) {
        console.error("Failed to load tickets", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, isAdmin, roleFilter]);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "answered":
        return "bg-blue-100 text-blue-700";
      case "closed":
        return "bg-gray-200 text-charcoal";
      default:
        return "bg-gray-200 text-charcoal";
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      alert(t("support.fillAllFields"));
      return;
    }
    try {
      setSubmitting(true);
      const res = await api.post("/support", {
        subject: newTicket.subject,
        message: newTicket.message,
      });
      setTickets((prev) => [res.data, ...prev]);
      setNewTicket({ subject: "", message: "" });
      setShowNewTicketForm(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;
    if (activeTicket.status === "closed") {
      alert(t("support.ticketClosedNotice", "تم إغلاق هذه التذكرة. يرجى فتح تذكرة جديدة للتواصل مع الدعم."));
      return;
    }
    try {
      const res = await api.post(`/support/${activeTicket.id}/replies`, { message: replyMessage });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id ? { ...t, replies: [...(t.replies ?? []), res.data] } : t
        )
      );
      setActiveTicket((prev) =>
        prev ? { ...prev, replies: [...(prev.replies ?? []), res.data] } : prev
      );
      setReplyMessage("");
    } catch (err: any) {
      alert(err?.response?.data?.detail || t("common.error"));
    }
  };

  const handleStatusUpdate = async (status: StatusKey) => {
    if (!activeTicket || !isAdmin) return;
    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/support/${activeTicket.id}/status`, { status });
      setTickets((prev) => prev.map((t) => (t.id === activeTicket.id ? res.data : t)));
      setActiveTicket(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.detail || t("common.error"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("orders.authRequired")}</p>
      </div>
    );
  }

  const isTicketClosed = activeTicket?.status === "closed";

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h1 className="text-h2 text-charcoal">{t("account.support")}</h1>
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "pending", "answered", "closed"] as Array<StatusKey | "all">).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-luxury text-sm font-semibold ${
                  statusFilter === s ? "bg-gold text-charcoal" : "bg-sand/70 text-charcoal-light hover:bg-sand"
                }`}
              >
                {s === "all" ? t("common.all") : t(`support.${s}`)}
              </button>
            ))}
            {isAdmin && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="border border-sand/70 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">{t("common.all")}</option>
                <option value="buyer">{t("support.buyer", "زبون")}</option>
                <option value="seller">{t("support.seller", "بائع")}</option>
              </select>
            )}
            <button
              onClick={() => setShowNewTicketForm((v) => !v)}
              className="bg-gold text-charcoal px-4 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
            >
              {showNewTicketForm ? t("common.cancel") : t("support.newTicket")}
            </button>
          </div>
        </div>

        {showNewTicketForm && (
          <form onSubmit={handleSubmitTicket} className="mb-6 p-5 bg-sand rounded-luxury space-y-4">
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("support.subject")}</label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                placeholder={t("support.subjectPlaceholder")}
                required
              />
            </div>
            <div>
              <label className="block text-charcoal font-semibold mb-2">{t("support.message")}</label>
              <textarea
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none resize-none"
                placeholder={t("support.messagePlaceholder")}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-charcoal text-ivory px-6 py-3 rounded-luxury font-semibold hover:bg-charcoal-light transition disabled:opacity-50"
            >
              {submitting ? t("support.submitting") : t("support.submit")}
            </button>
          </form>
        )}

        {filteredTickets.length === 0 ? (
          <div className="text-center py-10 text-taupe">{t("support.noTickets")}</div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setActiveTicket(ticket)}
                className="w-full text-left border border-gray-200 rounded-luxury p-4 hover:border-gold transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm text-taupe">
                      {t("support.ticketId")}: {ticket.id}
                      {isAdmin && ticket.role ? ` • ${ticket.role}` : ""}
                    </p>
                    <h3 className="text-lg font-semibold text-charcoal">{ticket.subject}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                    {t(`support.${ticket.status}`)}
                  </span>
                </div>
                <p className="text-sm text-charcoal-light line-clamp-2">{ticket.message}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand/80">
              <div>
                <p className="text-xs text-taupe">
                  {t("support.ticketId")}: {activeTicket.id} {activeTicket.role ? `• ${activeTicket.role}` : ""}
                </p>
                <h3 className="text-lg font-bold text-charcoal">{activeTicket.subject}</h3>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <select
                    value={activeTicket.status}
                    onChange={(e) => handleStatusUpdate(e.target.value as StatusKey)}
                    disabled={updatingStatus}
                    className="border border-sand/70 rounded-lg px-3 py-2 text-sm"
                  >
                    {(["open", "pending", "answered", "closed"] as StatusKey[]).map((s) => (
                      <option key={s} value={s}>
                        {t(`support.${s}`)}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setActiveTicket(null)}
                  className="text-charcoal hover:text-alert text-sm font-semibold"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="border border-sand/60 rounded-xl p-4">
                <p className="text-sm text-charcoal mb-2">{activeTicket.message}</p>
                <p className="text-[11px] text-taupe">
                  {new Date(activeTicket.created_at).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")}
                </p>
              </div>

              {activeTicket.replies && activeTicket.replies.length > 0 && (
                <div className="space-y-3">
                  {activeTicket.replies.map((reply) => (
                    <div key={reply.id} className="border border-sand/60 rounded-xl p-3">
                      <p className="text-sm text-charcoal mb-1">{reply.message}</p>
                      <p className="text-[11px] text-taupe flex justify-between">
                        <span>{reply.user?.full_name || t("reviews.anonymous")}</span>
                        <span>
                          {new Date(reply.created_at).toLocaleString(
                            i18n.language === "ar" ? "ar-EG" : "en-US"
                          )}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-sand/60 pt-3">
                <label className="block text-sm font-semibold text-charcoal mb-2">{t("support.reply", "الرد")}</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  disabled={isTicketClosed}
                  className={`w-full px-3 py-2 rounded-lg border border-sand focus:border-gold focus:outline-none ${
                    isTicketClosed ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
                  }`}
                  placeholder={
                    isTicketClosed
                      ? t("support.ticketClosedNotice", "تم إغلاق هذه التذكرة. يرجى فتح تذكرة جديدة للتواصل مع الدعم.")
                      : t("support.replyPlaceholder", "اكتب ردك هنا")
                  }
                />
                <button
                  onClick={handleReply}
                  disabled={isTicketClosed || !replyMessage.trim()}
                  className="mt-2 bg-gold text-charcoal px-4 py-2 rounded-luxury text-sm font-semibold hover:bg-gold-hover transition disabled:opacity-60"
                >
                  {t("support.sendReply", "إرسال الرد")}
                </button>
                {isTicketClosed && (
                  <p className="text-xs text-alert mt-2">
                    {t("support.ticketClosedNotice", "تم إغلاق هذه التذكرة. يرجى فتح تذكرة جديدة للتواصل مع الدعم.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
