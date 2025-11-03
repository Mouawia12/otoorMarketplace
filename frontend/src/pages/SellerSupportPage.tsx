import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SupportTicket {
  id: number;
  subject: string;
  subjectAr: string;
  message: string;
  messageAr: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export default function SellerSupportPage() {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', image: null as File | null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockTickets: SupportTicket[] = [
      {
        id: 1,
        subject: 'Payment Settlement Delay',
        subjectAr: 'تأخير في تسوية الدفع',
        message: 'My payment for order 1004 has not been settled yet',
        messageAr: 'لم يتم تسوية دفعتي للطلب رقم 1004 بعد',
        status: 'in_progress',
        createdAt: '2024-10-03T10:00:00Z',
        updatedAt: '2024-10-04T14:00:00Z',
      },
      {
        id: 2,
        subject: 'Product Listing Rejected',
        subjectAr: 'رفض قائمة المنتج',
        message: 'Why was my product listing rejected?',
        messageAr: 'لماذا تم رفض قائمة منتجي؟',
        status: 'closed',
        createdAt: '2024-09-28T15:30:00Z',
        updatedAt: '2024-09-29T09:00:00Z',
      },
      {
        id: 3,
        subject: 'Question about Commission Rates',
        subjectAr: 'سؤال حول أسعار العمولة',
        message: 'Can you clarify the commission structure for auctions?',
        messageAr: 'هل يمكنك توضيح هيكل العمولة للمزادات؟',
        status: 'open',
        createdAt: '2024-10-05T12:00:00Z',
        updatedAt: '2024-10-05T12:00:00Z',
      },
    ];

    setTickets(mockTickets);
    setLoading(false);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      alert(t('support.fillAllFields'));
      return;
    }

    setSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const ticket: SupportTicket = {
      id: tickets.length + 1,
      subject: newTicket.subject,
      subjectAr: newTicket.subject,
      message: newTicket.message,
      messageAr: newTicket.message,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTickets([ticket, ...tickets]);
    setNewTicket({ subject: '', message: '', image: null });
    setShowNewTicketForm(false);
    setSubmitting(false);
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return 'text-gold bg-gold bg-opacity-10';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'closed': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-taupe">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-h2 text-charcoal">{t('seller.support')}</h1>
          <button
            onClick={() => setShowNewTicketForm(!showNewTicketForm)}
            className="bg-gold text-charcoal px-6 py-2 rounded-luxury font-semibold hover:bg-gold-hover transition"
          >
            {showNewTicketForm ? t('common.cancel') : t('support.newTicket')}
          </button>
        </div>

        {showNewTicketForm && (
          <form onSubmit={handleSubmitTicket} className="mb-6 p-6 bg-sand rounded-luxury">
            <h3 className="text-h3 text-charcoal mb-4">{t('support.createTicket')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('support.subject')}</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  placeholder={t('support.subjectPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-2">{t('support.message')}</label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none resize-none"
                  placeholder={t('support.messagePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-charcoal font-semibold mb-2">
                  {t('support.attachment')} ({t('support.optional')})
                </label>
                <input
                  type="file"
                  onChange={(e) => setNewTicket({ ...newTicket, image: e.target.files?.[0] || null })}
                  className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
                  accept="image/*"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-charcoal text-ivory px-6 py-3 rounded-luxury font-semibold hover:bg-charcoal-light transition disabled:opacity-50"
              >
                {submitting ? t('support.submitting') : t('support.submit')}
              </button>
            </div>
          </form>
        )}

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-taupe">{t('support.noTickets')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-gray-200 rounded-luxury p-4 hover:border-gold transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-charcoal">
                    {i18n.language === 'ar' ? ticket.subjectAr : ticket.subject}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)}`}>
                    {t(`support.${ticket.status}`)}
                  </span>
                </div>
                <p className="text-charcoal-light mb-3">
                  {i18n.language === 'ar' ? ticket.messageAr : ticket.message}
                </p>
                <div className="flex justify-between items-center text-sm text-taupe">
                  <span>{t('support.ticketId')}: {ticket.id}</span>
                  <span>
                    {new Date(ticket.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
