import { describe, expect, it } from "vitest";

import {
  shouldDisablePlaceOrder,
  shouldDisableTorodShipping,
  shouldFetchCourierPartners,
} from "./checkoutGuards";

describe("checkoutGuards", () => {
  it("disables torod when there are no couriers for the selected city", () => {
    expect(shouldDisableTorodShipping(0, true, false)).toBe(true);
    expect(shouldDisableTorodShipping(1, true, false)).toBe(false);
  });

  it("disables place order when torod shipping has no couriers", () => {
    expect(shouldDisablePlaceOrder("torod", 0, true, false, false)).toBe(true);
    expect(shouldDisablePlaceOrder("torod", 2, true, false, false)).toBe(false);
  });

  it("re-fetches courier partners when city changes", () => {
    expect(shouldFetchCourierPartners(null, 1)).toBe(true);
    expect(shouldFetchCourierPartners(1, 1)).toBe(false);
    expect(shouldFetchCourierPartners(1, 2)).toBe(true);
  });
});
