export const shouldDisableTorodShipping = (
  courierCount: number,
  hasSelectedCity: boolean,
  loading: boolean
) => {
  if (!hasSelectedCity) return true;
  if (loading) return true;
  return courierCount <= 0;
};

export const shouldDisablePlaceOrder = (
  shippingMethod: string,
  courierCount: number,
  hasSelectedCity: boolean,
  loading: boolean,
  placingOrder: boolean
) => {
  if (placingOrder) return true;
  if (shippingMethod !== "torod") return false;
  return shouldDisableTorodShipping(courierCount, hasSelectedCity, loading);
};

export const shouldFetchCourierPartners = (
  previousCityId: number | null,
  nextCityId: number | null
) => {
  if (!nextCityId) return false;
  return previousCityId !== nextCityId;
};
