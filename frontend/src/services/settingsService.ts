import api from '../lib/api';
import type { SocialLinks } from '../types';

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: '',
  tiktok: '',
  facebook: '',
  twitter: '',
  youtube: '',
  snapchat: '',
  linkedin: '',
  whatsapp: '',
};

let socialLinksCache: SocialLinks | null = null;
let socialLinksPromise: Promise<SocialLinks> | null = null;

const sanitizeSocialLinks = (links: unknown): SocialLinks => {
  if (!links || typeof links !== 'object') {
    return { ...DEFAULT_SOCIAL_LINKS };
  }

  const next: SocialLinks = { ...DEFAULT_SOCIAL_LINKS };
  (Object.keys(DEFAULT_SOCIAL_LINKS) as Array<keyof SocialLinks>).forEach((key) => {
    const value = (links as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      next[key] = value.trim();
    }
  });
  return next;
};

export const fetchSocialLinks = async (): Promise<SocialLinks> => {
  if (socialLinksCache) {
    return socialLinksCache;
  }
  if (socialLinksPromise) {
    return socialLinksPromise;
  }

  socialLinksPromise = api
    .get<SocialLinks>('/settings/social-links')
    .then((response) => {
      socialLinksCache = sanitizeSocialLinks(response.data);
      return socialLinksCache;
    })
    .catch(() => {
      socialLinksCache = { ...DEFAULT_SOCIAL_LINKS };
      return socialLinksCache;
    })
    .finally(() => {
      socialLinksPromise = null;
    });

  return socialLinksPromise;
};
