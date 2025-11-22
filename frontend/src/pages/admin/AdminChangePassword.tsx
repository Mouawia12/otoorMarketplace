import { useTranslation } from 'react-i18next';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

export default function AdminChangePassword() {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-luxury p-6 shadow-luxury">
      <h1 className="text-2xl font-bold text-charcoal mb-4">
        {t('account.updatePassword', 'Update password')}
      </h1>
      <p className="text-taupe mb-4">
        {t('account.updatePasswordDesc', 'Change your login password securely')}
      </p>
      <ChangePasswordForm />
    </div>
  );
}
