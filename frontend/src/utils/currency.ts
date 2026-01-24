export function formatPrice(
  priceInSAR: number | undefined,
  language: "ar" | "en" | "fr" = "ar"
): string {
  if (priceInSAR === undefined || priceInSAR === null || Number.isNaN(priceInSAR)) {
    return language === "ar" ? "0.00 ﷼" : "0.00 SAR";
  }

  const formattedPrice = Number(priceInSAR).toFixed(2);
  return language === "ar" ? `${formattedPrice} ﷼` : `${formattedPrice} SAR`;
}

export const formatSAR = (n: number, locale: "ar-SA" | "en-US" = "ar-SA") =>
  Number(n).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
