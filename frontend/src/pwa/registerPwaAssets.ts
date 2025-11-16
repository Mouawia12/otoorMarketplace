import favicon32 from '@/assets/pwa/favicon-32.png?url';
import faviconPng from '@/assets/pwa/favicon.png?url';
import appleTouchIcon from '@/assets/pwa/favicon-180.png?url';
import { getManifestUrl, getThemeColor } from './manifest';

const ensureLink = (key: string, attributes: Record<string, string>) => {
  if (typeof document === 'undefined') return;
  const selector = `link[data-pwa="${key}"]`;
  let link = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.dataset.pwa = key;
    document.head.appendChild(link);
  }

  Object.entries(attributes).forEach(([attr, value]) => {
    if (attr === 'rel') {
      link!.rel = value;
    } else {
      link!.setAttribute(attr, value);
    }
  });
};

const ensureMeta = (name: string, content: string) => {
  if (typeof document === 'undefined') return;
  let meta = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
};

export const registerPwaAssets = () => {
  if (typeof document === 'undefined') return;

  ensureLink('favicon-32', {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: favicon32,
  });

  ensureLink('favicon', {
    rel: 'icon',
    type: 'image/png',
    href: faviconPng,
  });

  ensureLink('apple-touch', {
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: appleTouchIcon,
  });

  ensureLink('manifest', {
    rel: 'manifest',
    href: getManifestUrl(),
  });

  ensureMeta('theme-color', getThemeColor());
};

registerPwaAssets();
