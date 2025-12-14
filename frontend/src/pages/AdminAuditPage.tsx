import { useCallback, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

interface AuditLog {
  id: number;
  action: string;
  target_type: string;
  target_id?: number | null;
  description?: string | null;
  ip_address?: string | null;
  created_at: string;
  actor_type: 'admin' | 'user';
  admin?: {
    id: number;
    full_name: string;
    email: string;
  } | null;
}

const ACTION_KEYS = [
  'user.update',
  'user.delete',
  'product.moderate',
  'product.status',
  'auction.update',
  'template.create',
  'template.update',
  'template.delete',
  'blog.create',
  'blog.update',
  'blog.delete',
  'settings.update',
  'settings.create',
  'settings.delete',
];

export default function AdminAuditPage() {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const actionOptions = useMemo(() => {
    const base = [
      { value: 'all', label: t('admin.allActions') },
      { value: 'user.update', label: t('admin.auditFilters.userUpdate', 'User updates') },
      { value: 'user.delete', label: t('admin.auditFilters.userDelete', 'User deletions') },
      { value: 'product.moderate', label: t('admin.auditFilters.productModeration', 'Product moderation') },
      { value: 'product.status', label: t('admin.auditFilters.productStatus', 'Product status') },
      { value: 'auction.update', label: t('admin.auditFilters.auctionUpdate', 'Auction changes') },
      { value: 'template.create', label: t('admin.auditFilters.templateChanges', 'Template changes') },
      { value: 'template.update', label: t('admin.auditFilters.templateChanges', 'Template changes') },
      { value: 'template.delete', label: t('admin.auditFilters.templateChanges', 'Template changes') },
      { value: 'blog.create', label: t('admin.auditFilters.blogChanges', 'Blog changes') },
      { value: 'blog.update', label: t('admin.auditFilters.blogChanges', 'Blog changes') },
      { value: 'blog.delete', label: t('admin.auditFilters.blogChanges', 'Blog changes') },
      { value: 'settings.update', label: t('admin.auditFilters.settingsUpdate', 'Settings updates') },
      { value: 'settings.create', label: t('admin.auditFilters.settingsCreate', 'Settings creation') },
      { value: 'settings.delete', label: t('admin.auditFilters.settingsDelete', 'Settings deletion') },
    ];
    const seen = new Set<string>();
    return base.filter((option) => {
      if (seen.has(option.value)) {
        return false;
      }
      seen.add(option.value);
      return true;
    });
  }, [t]);

  const actionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    ACTION_KEYS.forEach((key) => {
      switch (key) {
        case 'user.update':
          labels[key] = t('admin.auditFilters.userUpdate', 'User updates');
          break;
        case 'user.delete':
          labels[key] = t('admin.auditFilters.userDelete', 'User deletions');
          break;
        case 'product.moderate':
          labels[key] = t('admin.auditFilters.productModeration', 'Product moderation');
          break;
        case 'product.status':
          labels[key] = t('admin.auditFilters.productStatus', 'Product status');
          break;
        case 'auction.update':
          labels[key] = t('admin.auditFilters.auctionUpdate', 'Auction changes');
          break;
        case 'template.create':
        case 'template.update':
        case 'template.delete':
          labels[key] = t('admin.auditFilters.templateChanges', 'Template changes');
          break;
        case 'blog.create':
        case 'blog.update':
        case 'blog.delete':
          labels[key] = t('admin.auditFilters.blogChanges', 'Blog changes');
          break;
        case 'settings.update':
          labels[key] = t('admin.auditFilters.settingsUpdate', 'Settings updates');
          break;
        case 'settings.create':
          labels[key] = t('admin.auditFilters.settingsCreate', 'Settings creation');
          break;
        case 'settings.delete':
          labels[key] = t('admin.auditFilters.settingsDelete', 'Settings deletion');
          break;
        default:
          labels[key] = key;
      }
    });
    return labels;
  }, [t]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = { page };
      if (filterAction !== 'all') {
        params.action = filterAction;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const response = await api.get('/admin/audit-logs', { params });
      setLogs(response.data?.logs ?? []);
      setTotalPages(response.data?.total_pages ?? 1);
    } catch (err: any) {
      console.error('Failed to load audit logs', err);
      const detail = err?.response?.data?.detail || err?.message || t('common.error');
      setError(detail);
      setLogs([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filterAction, page, search, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleActionChange = (value: string) => {
    setFilterAction(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const renderAction = (value: string) => {
    if (actionLabels[value]) return actionLabels[value];
    // Fallback: humanize unknown keys like "settings.update" -> "Settings update"
    const parts = value.split('.').map((p) => p.replace(/_/g, ' ')).join(' › ');
    const sentence = parts
      .split(' ')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
    return sentence || value;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-h2 text-charcoal">{t('admin.auditLog')}</h1>
            <p className="text-sm text-taupe">{t('admin.auditSubtitle', 'Track every administrative action in real time.')}</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={filterAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('admin.searchAudit', 'Search user or description...')}
              className="flex-1 px-4 py-2 rounded-luxury border border-gray-300 focus:border-gold focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-luxury border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-taupe">{t('common.loading')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-taupe">{t('admin.noLogsFound')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.user')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.action')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.description', 'Description')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.entity')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.entityId')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.timestamp')}</th>
                    <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.ipAddress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-sand">
                      <td className="px-4 py-4 text-charcoal-light">{log.id}</td>
                      <td className="px-4 py-4 text-charcoal font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            {log.admin?.full_name || t('admin.unknownUser', 'Unknown admin')}
                            <span className="block text-xs text-charcoal-light">{log.admin?.email}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${log.actor_type === 'admin' ? 'bg-charcoal text-white' : 'bg-gold/20 text-gold'}`}>
                            {log.actor_type === 'admin' ? t('admin.actorAdmin', 'Admin') : t('admin.actorUser', 'User')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-charcoal">{renderAction(log.action)}</td>
                      <td className="px-4 py-4 text-charcoal-light">
                        {log.description || t('admin.noDescription', 'No description')}
                      </td>
                      <td className="px-4 py-4 text-charcoal-light">{log.target_type}</td>
                      <td className="px-4 py-4 text-charcoal-light">{log.target_id ?? '—'}</td>
                      <td className="px-4 py-4 text-charcoal-light">
                        {new Date(log.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-4 text-charcoal-light font-mono text-xs">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-6">
              <p className="text-sm text-charcoal-light">
                {t('admin.pageIndicator', { page, total: totalPages })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal disabled:opacity-50"
                >
                  {t('common.previous', 'Previous')}
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-luxury border border-gray-300 text-charcoal disabled:opacity-50"
                >
                  {t('common.next', 'Next')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
