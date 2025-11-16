import { useMemo, useState, useCallback } from "react";
import { useUIStore } from "../../store/uiStore";
import logoWordmarkAr from "@/assets/brand/logo-ao-wordmark-ar.svg?url";
import logoWordmarkEn from "@/assets/brand/logo-ao-wordmark-en.svg?url";

type BrandLogoProps = {
  /** نستخدم wordmark لمطابقة الهيدر */
  variant?: "wordmark";
  /** العرض بالبكسل (الارتفاع يتكيّف تلقائيًا) */
  size?: number;
  className?: string;
  alt?: string;
  /**
   * إن أردت مسارًا مخصصًا (مثلاً /logo.svg)
   * سيُستخدم مباشرة بدل المنطق التلقائي.
   */
  srcOverride?: string;
};

export default function BrandLogo({
  variant = "wordmark",
  size = 52,
  className = "",
  alt,
  srcOverride,
}: BrandLogoProps) {
  const { language } = useUIStore();

  const basePath = import.meta.env.VITE_CDN_BASE_URL
    ? `${import.meta.env.VITE_CDN_BASE_URL.replace(/\/+$/, "")}/brand`
    : `${window.location.origin}/brand`;
  const fileBase =
    language === "ar" ? "logo-ao-wordmark-ar" : "logo-ao-wordmark-en";
  const localFallback = language === "ar" ? logoWordmarkAr : logoWordmarkEn;

  // نحضّر قائمة احتمالات تلقائية: svg ثم png ثم الاسم كما هو (بدون امتداد)
  const candidates = useMemo(() => {
    if (srcOverride) return [srcOverride];
    const sources = [
      `${basePath}/${fileBase}.svg`,
      `${basePath}/${fileBase}.png`,
      `${basePath}/${fileBase}`,
    ];
    if (localFallback) {
      sources.push(localFallback);
    }
    return sources;
  }, [srcOverride, fileBase, basePath, localFallback]);

  const [idx, setIdx] = useState(0);

  const onError = useCallback(() => {
    setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
  }, [candidates.length]);

  const effectiveAlt =
    alt ??
    (language === "ar"
      ? "عالم العطور - الشعار النصي"
      : "The World of Perfumes - Wordmark");

  return (
    <img
      src={candidates[idx]}
      onError={onError}
      alt={effectiveAlt}
      width={size}
      height={size}
      className={className}
      style={{ height: "auto", display: "block" }}
      loading="lazy"
      data-variant={variant}
    />
  );
}
