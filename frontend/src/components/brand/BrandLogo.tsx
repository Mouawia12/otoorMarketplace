import React, { useMemo, useState, useCallback } from "react";
import { useUIStore } from "../../store/uiStore";

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

  const basePath = "/brand";
  const fileBase =
    language === "ar" ? "logo-ao-wordmark-ar" : "logo-ao-wordmark-en";

  // نحضّر قائمة احتمالات تلقائية: svg ثم png ثم الاسم كما هو (بدون امتداد)
  const candidates = useMemo(() => {
    if (srcOverride) return [srcOverride];
    return [
      `${basePath}/${fileBase}.svg`,
      `${basePath}/${fileBase}.png`,
      `${basePath}/${fileBase}`, // لو رفعت الملف بلا امتداد
    ];
  }, [srcOverride, fileBase]);

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
