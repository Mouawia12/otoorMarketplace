import { useMemo, useState, useCallback, useEffect } from "react";
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const basePath = import.meta.env?.VITE_CDN_BASE_URL
    ? `${import.meta.env.VITE_CDN_BASE_URL.replace(/\/+$/, "")}/brand`
    : origin
    ? `${origin}/brand`
    : "/brand";
  const fileBase =
    language === "ar" ? "logo-ao-wordmark-ar" : "logo-ao-wordmark-en";
  const localFallback = language === "ar" ? logoWordmarkAr : logoWordmarkEn;

  const remoteCandidates = useMemo(() => {
    if (srcOverride) return [srcOverride];
    return [
      `${basePath}/${fileBase}.svg`,
      `${basePath}/${fileBase}.png`,
      `${basePath}/${fileBase}`,
    ];
  }, [srcOverride, basePath, fileBase]);

  const [currentSrc, setCurrentSrc] = useState(srcOverride ?? localFallback);

  useEffect(() => {
    setCurrentSrc(srcOverride ?? localFallback);
  }, [srcOverride, localFallback]);

  useEffect(() => {
    if (srcOverride) return;
    let cancelled = false;

    const tryLoad = (index: number) => {
      if (index >= remoteCandidates.length || cancelled) return;
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          setCurrentSrc(remoteCandidates[index]);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          tryLoad(index + 1);
        }
      };
      img.src = remoteCandidates[index];
    };

    tryLoad(0);

    return () => {
      cancelled = true;
    };
  }, [remoteCandidates, srcOverride]);

  const onError = useCallback(() => {
    setCurrentSrc(localFallback);
  }, [localFallback]);

  const effectiveAlt =
    alt ??
    (language === "ar"
      ? "عالم العطور - الشعار النصي"
      : "The World of Perfumes - Wordmark");

  return (
    <img
      src={currentSrc}
      onError={onError}
      alt={effectiveAlt}
      width={size}
      height={size}
      className={className}
      style={{ height: "auto", display: "block" }}
      loading="eager"
      data-variant={variant}
    />
  );
}
