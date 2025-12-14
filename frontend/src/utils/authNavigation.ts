import { User } from '../store/authStore';

export const hasSubmittedSellerProfile = (user?: User | null): boolean => {
  if (!user) return false;

  if (typeof user.seller_profile_submitted === 'boolean') {
    return user.seller_profile_submitted;
  }

  const profile = (user as any)?.seller_profile;
  if (!profile) {
    return false;
  }

  if (typeof profile === 'object') {
    return Object.keys(profile).length > 0;
  }

  return Boolean(profile);
};

export const resolvePostAuthRoute = (user: User, redirectParam?: string | null): string => {
  if (redirectParam) {
    return redirectParam;
  }

  const upperRoles = (user.roles ?? []).map((role) => role.toUpperCase());

  if (upperRoles.includes('SUPER_ADMIN') || upperRoles.includes('ADMIN')) {
    return '/admin/dashboard';
  }

  if (upperRoles.includes('SELLER')) {
    const sellerStatus = user.seller_status ?? 'pending';
    if (sellerStatus.toLowerCase() === 'approved') {
      return '/seller/dashboard';
    }

    return hasSubmittedSellerProfile(user)
      ? '/seller/profile-status'
      : '/seller/profile-complete';
  }

  return '/';
};
