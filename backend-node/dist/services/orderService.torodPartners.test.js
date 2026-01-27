"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prismaMock = vitest_1.vi.hoisted(() => ({}));
vitest_1.vi.mock("../prisma/client", () => ({
    prisma: prismaMock,
}));
const orderService_1 = require("./orderService");
(0, vitest_1.describe)("orderService normalizeTorodPartners", () => {
    (0, vitest_1.it)("filters invalid entries and resolves partner ids", () => {
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
        const result = orderService_1.__test__.normalizeTorodPartners(payload);
        (0, vitest_1.expect)(result.map((partner) => partner.id)).toEqual([
            "1",
            "C-2",
            "3",
            "4",
            "5",
            "X6",
        ]);
        (0, vitest_1.expect)(result[0]?.name).toBe("Partner A");
        (0, vitest_1.expect)(result[0]?.supports_prepaid).toBe(true);
    });
});
//# sourceMappingURL=orderService.torodPartners.test.js.map