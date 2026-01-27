import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({}));

vi.mock("../prisma/client", () => ({
  prisma: prismaMock,
}));

import { __test__ } from "./orderService";

describe("orderService normalizeTorodPartners", () => {
  it("filters invalid entries and resolves partner ids", () => {
    const payload = {
      data: [
        { id: 1, title: "Partner A", supports_prepaid: true },
        { courier_id: "C-2", title_en: "Partner B" },
        { partner_id: 3 },
        { shipping_company_id: 4 },
        { company_id: 5 },
        { code: "X6" },
        { title: "No id" },
        null,
        "string",
      ],
    };

    const result = __test__.normalizeTorodPartners(payload);

    expect(result.map((partner) => partner.id)).toEqual([
      "1",
      "C-2",
      "3",
      "4",
      "5",
      "X6",
    ]);
    expect(result[0]?.name).toBe("Partner A");
    expect(result[0]?.supports_prepaid).toBe(true);
  });
});
