import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nock from "nock";

const setTestEnv = () => {
  process.env.TOROD_API_URL = "https://demo.stage.torod.co/en/api/";
  process.env.TOROD_CLIENT_ID = "test-client";
  process.env.TOROD_CLIENT_SECRET = "test-secret";
  process.env.MYFATOORAH_API_TOKEN = "test-token";
  process.env.MYFATOORAH_BASE_URL = "https://api-sa.myfatoorah.com";
  process.env.MYFATOORAH_CALLBACK_URL = "https://example.com/payment/success";
  process.env.MYFATOORAH_ERROR_URL = "https://example.com/payment/error";
  process.env.MYFATOORAH_CURRENCY = "SAR";
};

const mockToken = (baseUrl: string) =>
  nock(baseUrl)
    .post("/token", (body) =>
      typeof body === "string" &&
      body.includes("grant_type=client_credentials") &&
      body.includes("client_id=test-client") &&
      body.includes("client_secret=test-secret")
    )
    .reply(200, {
      access_token: "torod-token",
      expires_in: 3600,
    });

const loadServices = async () => {
  vi.resetModules();
  setTestEnv();
  const service = await import("./torodService");
  const { config } = await import("../config/env");
  return { ...service, config };
};

beforeEach(() => {
  vi.resetModules();
  nock.cleanAll();
  nock.disableNetConnect();
  setTestEnv();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe("torodService", () => {
  it("attaches auth headers and parses order responses", async () => {
    const { createOrder, config } = await loadServices();

    mockToken(config.torod.baseUrl);

    const scope = nock(config.torod.baseUrl)
      .post("/order/create")
      .matchHeader("authorization", "Bearer torod-token")
      .matchHeader("client-id", "test-client")
      .reply(200, {
        data: { order_id: "ORD-1" },
      });

    const result = await createOrder({
      reference: "order-1",
      customer_name: "Test",
      customer_phone: "+966500000000",
      customer_address: "Riyadh",
      customer_city: "Riyadh",
      items: [{ name: "Item-1", quantity: 1, price: 10 }],
    });

    expect(result.id).toBe("ORD-1");
    expect(scope.isDone()).toBe(true);
  });

  it("retries on 5xx responses before succeeding", async () => {
    const { trackShipment, config } = await loadServices();

    mockToken(config.torod.baseUrl);

    const scope = nock(config.torod.baseUrl)
      .get("/shipments/TRK-1")
      .reply(500, { message: "server error" })
      .get("/shipments/TRK-1")
      .reply(200, {
        data: { shipment_id: "SH-1", tracking_number: "TRK-1" },
      });

    const result = await trackShipment("TRK-1");
    expect(result.id).toBe("SH-1");
    expect(result.trackingNumber).toBe("TRK-1");
    expect(scope.isDone()).toBe(true);
  });

  it("maps shipment creation responses", async () => {
    const { shipOrder, config } = await loadServices();

    mockToken(config.torod.baseUrl);

    nock(config.torod.baseUrl)
      .post("/order/ship-process", (body) => {
        const payload = body as { order_id?: string; shipping_company_id?: string };
        return payload?.order_id === "ORD-1" && payload.shipping_company_id === "COMP-1";
      })
      .reply(200, {
        data: {
          shipment_id: "SHIP-123",
          tracking_number: "TRK-123",
          label_url: "https://cdn.torod.co/label.pdf",
        },
      });

    const result = await shipOrder("ORD-1", {
      shipping_company_id: "COMP-1",
    });

    expect(result).toMatchObject({
      id: "SHIP-123",
      trackingNumber: "TRK-123",
      labelUrl: "https://cdn.torod.co/label.pdf",
    });
  });
});
