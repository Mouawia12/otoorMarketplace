const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const getCurrentOrigin = () =>
  typeof window !== 'undefined' && window.location ? window.location.origin : '';

const buildGoogleAuthConfig = () => {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
  const allowedOrigins = parseAllowedOrigins(import.meta.env.VITE_GOOGLE_ALLOWED_ORIGINS);
  const currentOrigin = getCurrentOrigin();

  const originAllowed =
    !currentOrigin || allowedOrigins.length === 0
      ? true
      : allowedOrigins.includes(currentOrigin);

  return {
    clientId,
    allowedOrigins,
    currentOrigin,
    originAllowed,
    hasClientId: clientId.length > 0,
    isEnabled: clientId.length > 0 && originAllowed,
  };
};

const googleAuthConfig = buildGoogleAuthConfig();

export default googleAuthConfig;
