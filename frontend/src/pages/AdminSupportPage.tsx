import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Ticket {
  id: number;
  user: string;
  subject: string;
  subjectAr: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created: string;
}

const CANNED_REPLIES = {
  orderStatus: { en: 'Your order status has been updated. Please check your account for details.', ar: 'تم تحديث حالة طلبك. يرجى التحقق من حسابك للحصول على التفاصيل.' },
  refundPolicy: { en: 'Our refund policy allows returns within 14 days of purchase. Please contact us with your order number.', ar: 'تسمح سياسة الاسترداد بالإرجاع خلال 14 يومًا من الشراء. يرجى الاتصال بنا مع رقم طلبك.' },
  shippingDelay: { en: 'We apologize for the shipping delay. Your order is being processed and will be shipped soon.', ar: 'نعتذر عن تأخير الشحن. يتم معالجة طلبك وسيتم شحنه قريبًا.' },
};

export default function AdminSupportPage() {
  const { t, i18n } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReply, setShowReply] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setTickets([
      { id: 1, user: 'Ahmed M.', subject: 'Payment Issue', subjectAr: 'مشكلة في الدفع', status: 'open', priority: 'high', created: '2024-10-05' },
      { id: 2, user: 'Fatima A.', subject: 'Order Delay', subjectAr: 'تأخير في الطلب', status: 'in_progress', priority: 'medium', created: '2024-10-04' },
      { id: 3, user: 'Omar H.', subject: 'Product Question', subjectAr: 'سؤال حول المنتج', status: 'open', priority: 'low', created: '2024-10-04' },
      { id: 4, user: 'Sara I.', subject: 'Account Access', subjectAr: 'الوصول إلى الحساب', status: 'closed', priority: 'high', created: '2024-10-01' },
    ]);
    setLoading(false);
  };

  const handleReply = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReply('');
    setShowReply(true);
  };

  const handleUseCanned = (template: keyof typeof CANNED_REPLIES) => {
    setReply(CANNED_REPLIES[template][i18n.language as 'en' | 'ar']);
  };

  const handleSubmit = () => {
    if (!selectedTicket) return;
    setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: 'closed' } : t));
    setShowReply(false);
  };

  const handleStatusChange = (id: number, newStatus: Ticket['status']) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-gold bg-gold bg-opacity-10';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'closed': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-gold bg-gold bg-opacity-10';
      case 'low': return 'text-gray-600 bg-gray-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t('admin.supportTickets')}</h1>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.user')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.subject')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.priority')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.created')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{ticket.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{ticket.user}</td>
                  <td className="px-4 py-4 text-charcoal">{i18n.language === 'ar' ? ticket.subjectAr : ticket.subject}</td>
                  <td className="px-4 py-4"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(ticket.priority)}`}>{t(`admin.${ticket.priority}`)}</span></td>
                  <td className="px-4 py-4">
                    <select value={ticket.status} onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket['status'])} className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)} border-none`}>
                      <option value="open">{t('admin.open')}</option>
                      <option value="in_progress">{t('admin.inProgress')}</option>
                      <option value="closed">{t('admin.closed')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(ticket.created).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => handleReply(ticket)} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">{t('admin.reply')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showReply && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-luxury p-6 max-w-2xl w-full">
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.replyToTicket')} {selectedTicket.id}</h3>
            <p className="text-charcoal mb-4"><strong>{t('admin.user')}:</strong> {selectedTicket.user} | <strong>{t('admin.subject')}:</strong> {i18n.language === 'ar' ? selectedTicket.subjectAr : selectedTicket.subject}</p>
            
            <div className="mb-4">
              <p className="text-charcoal font-semibold mb-2">{t('admin.cannedReplies')}:</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleUseCanned('orderStatus')} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-luxury text-sm font-semibold hover:bg-blue-200">{t('admin.orderStatus')}</button>
                <button onClick={() => handleUseCanned('refundPolicy')} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-luxury text-sm font-semibold hover:bg-blue-200">{t('admin.refundPolicy')}</button>
                <button onClick={() => handleUseCanned('shippingDelay')} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-luxury text-sm font-semibold hover:bg-blue-200">{t('admin.shippingDelay')}</button>
              </div>
            </div>

            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('admin.replyPlaceholder')} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none mb-4" rows={6} />
            
            <div className="flex gap-3">
              <button onClick={handleSubmit} className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover">{t('admin.sendReply')}</button>
              <button onClick={() => setShowReply(false)} className="flex-1 bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
