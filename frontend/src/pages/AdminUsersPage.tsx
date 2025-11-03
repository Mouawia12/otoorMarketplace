import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'buyer' | 'seller' | 'moderator' | 'admin';
  status: 'active' | 'suspended';
  verifiedSeller: boolean;
  joined: string;
}

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setUsers([
      { id: 1, name: 'Ahmed Mohamed', email: 'ahmed@example.com', role: 'seller', status: 'active', verifiedSeller: true, joined: '2024-08-15' },
      { id: 2, name: 'Fatima Ali', email: 'fatima@example.com', role: 'buyer', status: 'active', verifiedSeller: false, joined: '2024-09-01' },
      { id: 3, name: 'Omar Hassan', email: 'omar@example.com', role: 'seller', status: 'active', verifiedSeller: false, joined: '2024-09-10' },
      { id: 4, name: 'Sara Ibrahim', email: 'sara@example.com', role: 'buyer', status: 'suspended', verifiedSeller: false, joined: '2024-07-20' },
      { id: 5, name: 'Khalid Ahmed', email: 'khalid@example.com', role: 'moderator', status: 'active', verifiedSeller: false, joined: '2024-06-01' },
    ]);
    setLoading(false);
  };

  const handleStatusToggle = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));
  };

  const handleRoleChange = (id: number, newRole: User['role']) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  const handleVerifyToggle = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, verifiedSeller: !u.verifiedSeller } : u));
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  if (loading) {
    return <div className="text-center py-12"><p className="text-taupe">{t('common.loading')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-luxury p-6 shadow-luxury">
        <h1 className="text-h2 text-charcoal mb-6">{t('admin.users')}</h1>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.id')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.name')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.email')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.role')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.status')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.verified')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.joined')}</th>
                <th className="text-right px-4 py-3 text-charcoal font-semibold">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-sand">
                  <td className="px-4 py-4 text-charcoal-light">{u.id}</td>
                  <td className="px-4 py-4 text-charcoal font-medium">{u.name}</td>
                  <td className="px-4 py-4 text-charcoal-light">{u.email}</td>
                  <td className="px-4 py-4">
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])} className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-600 border-none">
                      <option value="buyer">{t('admin.buyer')}</option>
                      <option value="seller">{t('admin.seller')}</option>
                      <option value="moderator">{t('admin.moderator')}</option>
                      <option value="admin">{t('admin.admin')}</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(u.status)}`}>{t(`admin.${u.status}`)}</span>
                  </td>
                  <td className="px-4 py-4">
                    {u.role === 'seller' && (
                      <button onClick={() => handleVerifyToggle(u.id)} className={`px-3 py-1 rounded-full text-sm font-semibold ${u.verifiedSeller ? 'bg-gold text-charcoal' : 'bg-gray-200 text-gray-600'}`}>
                        {u.verifiedSeller ? '✓ ' : ''}
                        {t('admin.verifiedSeller')}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-charcoal-light">{new Date(u.joined).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-4">
                    <button onClick={() => handleStatusToggle(u.id)} className={`text-sm font-semibold ${u.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}>
                      {u.status === 'active' ? t('admin.suspend') : t('admin.activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
