import icon192 from '@/assets/pwa/favicon-192.png?url';
import icon512 from '@/assets/pwa/favicon-512.png?url';

const manifest = {
  name: 'Aalam Al-Otoor - عالم العطور',
  short_name: 'Aalam Al-Otoor',
  description: 'The world of perfumes - Luxury perfume marketplace and auction platform',
  start_url: '/',
  display: 'standalone',
  background_color: '#F7F5F2',
  theme_color: '#C8A24A',
  orientation: 'portrait-primary',
  icons: [
    {
      src: icon192,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: icon512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
  lang: 'ar',
  dir: 'rtl',
};

let manifestUrl: string | null = null;

export const getManifestUrl = () => {
  if (typeof window === 'undefined') return '';
  if (!manifestUrl) {
    const blob = new Blob([JSON.stringify(manifest)], {
      type: 'application/manifest+json',
    });
    manifestUrl = URL.createObjectURL(blob);
  }
  return manifestUrl;
};

export const getThemeColor = () => manifest.theme_color;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (manifestUrl) {
      URL.revokeObjectURL(manifestUrl);
      manifestUrl = null;
    }
  });
}
