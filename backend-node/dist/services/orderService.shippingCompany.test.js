"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const orderService_1 = require("./orderService");
(0, vitest_1.describe)("orderService torod shipping company validation", () => {
    (0, vitest_1.it)("rejects torod orders without shipping company", async () => {
        await (0, vitest_1.expect)((0, orderService_1.createOrder)({
            buyerId: 1,
            paymentMethod: "MYFATOORAH",
            shipping: {
                name: "Test User",
                phone: "+966 555555555",
                city: "Riyadh",
                region: "Riyadh",
                address: "Test Address",
                type: "torod",
                customerCountry: "SA",
                codCurrency: "SAR",
                torodCountryId: 1,
                torodRegionId: 10,
                torodCityId: 100,
                deferTorodShipment: false,
            },
            items: [
                {
                    productId: 1,
                    quantity: 1,
                },
            ],
        })).rejects.toMatchObject({
            statusCode: 422,
            message: "لا توجد شركة شحن متاحة لهذه المدينة",
        });
    });
});
//# sourceMappingURL=orderService.shippingCompany.test.js.map