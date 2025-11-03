const USD_TO_SAR_RATE = 3.75;

export function formatPrice(priceInUSD: number | undefined, language: 'ar' | 'en' = 'ar'): string {
  if (priceInUSD === undefined || priceInUSD === null) {
    return language === 'ar' ? '0.00 ﷼' : '0.00 SAR';
  }

  const priceInSAR = priceInUSD * USD_TO_SAR_RATE;
  const formattedPrice = priceInSAR.toFixed(2);

  if (language === 'ar') {
    return `${formattedPrice} ﷼`;
  } else {
    return `${formattedPrice} SAR`;
  }
}

export function convertToSAR(priceInUSD: number): number {
  return priceInUSD * USD_TO_SAR_RATE;
}

export const formatSAR = (n: number, locale: "ar-SA" | "en-US" = "ar-SA") =>
  n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
