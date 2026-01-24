import { describe, expect, it } from "vitest";

import { createOrder } from "./orderService";

describe("orderService torod shipping company validation", () => {
  it("rejects torod orders without shipping company", async () => {
    await expect(
      createOrder({
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
      })
    ).rejects.toMatchObject({
      statusCode: 422,
      message: "لا توجد شركة شحن متاحة لهذه المدينة",
    });
  });
});
