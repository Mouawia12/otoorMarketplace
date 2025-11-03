import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AuthRequest {
  id: number;
  seller: string;
  email: string;
  validator: string | null;
  status: 'pending' | 'processing' | 'done';
  result: string;
  submitted: string;
}

export default function AdminAuthRequestsPage() {
  const { t, i18n } = useTranslation();
  const [requests, setRequests] = useState<AuthRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AuthRequest | null>(null);
  const [result, setResult] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setRequests([
      { id: 1, seller: 'Ahmed Store', email: 'ahmed@store.com', validator: null, status: 'pending', result: '', submitted: '2024-10-05' },
      { id: 2, seller: 'Fatima Perfumes', email: 'fatima@perfumes.com', validator: 'Admin Sarah', status: 'processing', result: '', submitted: '2024-10-04' },
      { id: 3, seller: 'Omar Luxury', email: 'omar@luxury.com', validator: 'Admin John', status: 'done', result: 'Verified - All documents valid', submitted: '2024-10-01' },
      { id: 4, seller: 'Suspicious Shop', email: 'fake@shop.com', validator: 'Admin Sarah', status: 'done', result: 'Rejected - Invalid documents', submitted: '2024-09-28' },
    ]);
    setLoading(false);
  };

  const handleAssign = (id: number) => {
    setRequests(requests.map(r => r.id === id ? { ...r, validator: 'Current Admin', status: 'processing' } : r));
  };

  const handleProcess = (request: AuthRequest) => {
    setSelectedRequest(request);
    setResult(request.result);
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!selectedRequest) return;
    setRequests(requests.map(r => r.id === selectedRequest.id ? { ...r, status: 'done', result } : r));
    setShowModal(false);
    setResult('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gold bg-gold bg-opacity-10';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'done': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t('admin.authRequests')}</h1>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.seller')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.email')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.validator')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.submitted')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{r.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{r.seller}</td>
                  <td className="px-4 py-4 text-charcoal-light">{r.email}</td>
                  <td className="px-4 py-4 text-charcoal-light">{r.validator || '-'}</td>
                  <td className="px-4 py-4"><span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(r.status)}`}>{t(`admin.${r.status}`)}</span></td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(r.submitted).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                  <td className="px-4 py-4">
                    {r.status === 'pending' && (
                      <button onClick={() => handleAssign(r.id)} className="text-blue-600 hover:text-blue-700 text-sm font-semibold">{t('admin.assign')}</button>
                    )}
                    {r.status === 'processing' && (
                      <button onClick={() => handleProcess(r)} className="text-gold hover:text-gold-hover text-sm font-semibold">{t('admin.process')}</button>
                    )}
                    {r.status === 'done' && (
                      <button onClick={() => handleProcess(r)} className="text-gray-600 hover:text-gray-700 text-sm font-semibold">{t('admin.viewResult')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-luxury p-6 max-w-md w-full">
            <h3 className="text-h3 text-charcoal mb-4">{t('admin.processRequest')}</h3>
            <p className="text-charcoal mb-2"><strong>{t('admin.seller')}:</strong> {selectedRequest.seller}</p>
            <p className="text-charcoal mb-4"><strong>{t('admin.email')}:</strong> {selectedRequest.email}</p>
            <textarea value={result} onChange={(e) => setResult(e.target.value)} placeholder={t('admin.resultPlaceholder')} className="w-full px-4 py-3 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none mb-4" rows={4} readOnly={selectedRequest.status === 'done'} />
            <div className="flex gap-3">
              {selectedRequest.status !== 'done' && (
                <button onClick={handleSubmit} className="flex-1 bg-gold text-charcoal px-6 py-3 rounded-luxury font-semibold hover:bg-gold-hover">{t('admin.submit')}</button>
              )}
              <button onClick={() => setShowModal(false)} className="flex-1 bg-sand text-charcoal px-6 py-3 rounded-luxury font-semibold">{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
