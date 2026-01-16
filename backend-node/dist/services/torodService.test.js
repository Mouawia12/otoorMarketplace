"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nock_1 = __importDefault(require("nock"));
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
const mockToken = (baseUrl) => (0, nock_1.default)(baseUrl)
    .post("/token", (body) => typeof body === "string" &&
    body.includes("grant_type=client_credentials") &&
    body.includes("client_id=test-client") &&
    body.includes("client_secret=test-secret"))
    .reply(200, {
    access_token: "torod-token",
    expires_in: 3600,
});
const loadServices = async () => {
    vitest_1.vi.resetModules();
    setTestEnv();
    const service = await Promise.resolve().then(() => __importStar(require("./torodService")));
    const { config } = await Promise.resolve().then(() => __importStar(require("../config/env")));
    return { ...service, config };
};
(0, vitest_1.beforeEach)(() => {
    vitest_1.vi.resetModules();
    nock_1.default.cleanAll();
    nock_1.default.disableNetConnect();
    setTestEnv();
});
(0, vitest_1.afterEach)(() => {
    nock_1.default.cleanAll();
    nock_1.default.enableNetConnect();
});
(0, vitest_1.describe)("torodService", () => {
    (0, vitest_1.it)("attaches auth headers and parses order responses", async () => {
        const { createOrder, config } = await loadServices();
        mockToken(config.torod.baseUrl);
        const scope = (0, nock_1.default)(config.torod.baseUrl)
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
        (0, vitest_1.expect)(result.id).toBe("ORD-1");
        (0, vitest_1.expect)(scope.isDone()).toBe(true);
    });
    (0, vitest_1.it)("retries on 5xx responses before succeeding", async () => {
        const { trackShipment, config } = await loadServices();
        mockToken(config.torod.baseUrl);
        const scope = (0, nock_1.default)(config.torod.baseUrl)
            .get("/shipments/TRK-1")
            .reply(500, { message: "server error" })
            .get("/shipments/TRK-1")
            .reply(200, {
            data: { shipment_id: "SH-1", tracking_number: "TRK-1" },
        });
        const result = await trackShipment("TRK-1");
        (0, vitest_1.expect)(result.id).toBe("SH-1");
        (0, vitest_1.expect)(result.trackingNumber).toBe("TRK-1");
        (0, vitest_1.expect)(scope.isDone()).toBe(true);
    });
    (0, vitest_1.it)("maps shipment creation responses", async () => {
        const { shipOrder, config } = await loadServices();
        mockToken(config.torod.baseUrl);
        (0, nock_1.default)(config.torod.baseUrl)
            .post("/order/ship-process", (body) => {
            const payload = body;
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
        (0, vitest_1.expect)(result).toMatchObject({
            id: "SHIP-123",
            trackingNumber: "TRK-123",
            labelUrl: "https://cdn.torod.co/label.pdf",
        });
    });
});
//# sourceMappingURL=torodService.test.js.map