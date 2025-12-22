import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nock from "nock";

const setTestEnv = () => {
  process.env.REDBOX_API_TOKEN = "test-token";
  process.env.REDBOX_ENV = "sandbox";
  process.env.REDBOX_BUSINESS_ID = "biz-123";
};

const loadServices = async () => {
  vi.resetModules();
  setTestEnv();
  const service = await import("./redboxService");
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

describe("redboxService", () => {
  it("parses success responses and attaches auth header", async () => {
    const { getCities, config } = await loadServices();

    const scope = nock(config.redbox.baseUrl)
      .get("/countries/SA/cities")
      .matchHeader("authorization", "Bearer test-token")
      .reply(200, {
        success: true,
        response_code: 200,
        data: { cities: [{ code: "RUH", name: "Riyadh" }] },
      });

    const result = await getCities();
    expect(result).toEqual({ cities: [{ code: "RUH", name: "Riyadh" }] });
    expect(scope.isDone()).toBe(true);
  });

  it("retries on 5xx responses before succeeding", async () => {
    const { getStatus, config } = await loadServices();

    const scope = nock(config.redbox.baseUrl)
      .get("/shipments/demo/status")
      .reply(500, { message: "server error" })
      .get("/shipments/demo/status")
      .reply(200, {
        success: true,
        data: { shipment_id: "sh-1", tracking_number: "TRK-1" },
      });

    const result = await getStatus("demo");
    expect(result.id).toBe("sh-1");
    expect(result.trackingNumber).toBe("TRK-1");
    expect(scope.isDone()).toBe(true);
  });

  it("throws unauthorized errors on 401 responses", async () => {
    const { getPointsByCity, config } = await loadServices();

    nock(config.redbox.baseUrl)
      .get("/cities/RUH/points")
      .reply(401, { msg: "unauthorized" });

    await expect(getPointsByCity("RUH")).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it("maps shipment creation responses", async () => {
    const { createShipmentDirect, config } = await loadServices();

    nock(config.redbox.baseUrl)
      .post("/shipments", (body) => body.point_id === "POINT-1")
      .reply(200, {
        success: true,
        data: {
          shipment_id: "ship-123",
          tracking_number: "TRK-123",
          label_url: "https://cdn.redboxsa.com/label.pdf",
        },
      });

    const result = await createShipmentDirect({
      pointId: "POINT-1",
      receiver: { name: "Test", phone: "0500000000" },
    });

    expect(result).toMatchObject({
      id: "ship-123",
      trackingNumber: "TRK-123",
      labelUrl: "https://cdn.redboxsa.com/label.pdf",
    });
  });
});
