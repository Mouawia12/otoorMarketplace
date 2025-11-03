import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: number;
  user: string;
  action: string;
  actionAr: string;
  entity: string;
  entityId: number;
  timestamp: string;
  ipAddress: string;
}

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setLogs([
      { id: 1, user: 'Admin Sarah', action: 'Approved product', actionAr: 'تمت الموافقة على المنتج', entity: 'Product', entityId: 123, timestamp: '2024-10-05T14:30:00Z', ipAddress: '192.168.1.100' },
      { id: 2, user: 'Admin John', action: 'Suspended user', actionAr: 'تم إيقاف المستخدم', entity: 'User', entityId: 456, timestamp: '2024-10-05T13:15:00Z', ipAddress: '192.168.1.101' },
      { id: 3, user: 'Moderator Ali', action: 'Rejected product', actionAr: 'تم رفض المنتج', entity: 'Product', entityId: 789, timestamp: '2024-10-05T12:00:00Z', ipAddress: '192.168.1.102' },
      { id: 4, user: 'Admin Sarah', action: 'Changed settings', actionAr: 'تم تغيير الإعدادات', entity: 'Settings', entityId: 1, timestamp: '2024-10-05T11:30:00Z', ipAddress: '192.168.1.100' },
      { id: 5, user: 'Admin John', action: 'Ended auction', actionAr: 'تم إنهاء المزاد', entity: 'Auction', entityId: 12, timestamp: '2024-10-05T10:45:00Z', ipAddress: '192.168.1.101' },
      { id: 6, user: 'Admin Sarah', action: 'Deleted ad', actionAr: 'تم حذف الإعلان', entity: 'Ad', entityId: 34, timestamp: '2024-10-04T16:20:00Z', ipAddress: '192.168.1.100' },
      { id: 7, user: 'Moderator Fatima', action: 'Closed support ticket', actionAr: 'تم إغلاق تذكرة الدعم', entity: 'Ticket', entityId: 567, timestamp: '2024-10-04T15:00:00Z', ipAddress: '192.168.1.103' },
    ]);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action.toLowerCase().includes(filterAction.toLowerCase());
    const matchesUser = !filterUser || log.user.toLowerCase().includes(filterUser.toLowerCase());
    return matchesAction && matchesUser;
  });

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t('admin.auditLog')}</h1>

        <div className="flex gap-4 mb-6">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none">
            <option value="all">{t('admin.allActions')}</option>
            <option value="approved">{t('admin.approvals')}</option>
            <option value="rejected">{t('admin.rejections')}</option>
            <option value="suspended">{t('admin.suspensions')}</option>
            <option value="deleted">{t('admin.deletions')}</option>
          </select>
          <input type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder={t('admin.filterByUser')} className="flex-1 px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.user')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.action')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.entity')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.entityId')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.timestamp')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.ipAddress')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{log.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{log.user}</td>
                  <td className="px-4 py-4 text-charcoal">{i18n.language === 'ar' ? log.actionAr : log.action}</td>
                  <td className="px-4 py-4 text-charcoal-light">{log.entity}</td>
                  <td className="px-4 py-4 text-charcoal-light">{log.entityId}</td>
                  <td className="px-4 py-4 text-charcoal-light">
                    {new Date(log.timestamp).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light font-mono text-sm">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-taupe">{t('admin.noLogsFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
