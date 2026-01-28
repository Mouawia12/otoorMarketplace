import { describe, expect, it } from "vitest";
import { computeTorodShippingTotal } from "./torodShipping";

describe("computeTorodShippingTotal", () => {
  it("sums partner prices for a common partner across groups", () => {
    const groups = [
      {
        group_key: "A",
        partners: [
          { id: 11, rate: 12, currency: "SAR" },
          { id: 12, rate: 7, currency: "SAR" },
        ],
      },
      {
        group_key: "B",
        partners: [
          { id: 11, rate: 8, currency: "SAR" },
          { id: 13, rate: 5, currency: "SAR" },
        ],
      },
    ];

    const result = computeTorodShippingTotal({
      groups,
      groupSelections: {},
      commonPartnerId: "11",
    });

    expect(result.total).toBe(20);
    expect(result.currency).toBe("SAR");
  });
});
