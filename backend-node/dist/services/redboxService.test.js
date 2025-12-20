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
    process.env.REDBOX_API_TOKEN = "test-token";
    process.env.REDBOX_ENV = "sandbox";
    process.env.REDBOX_BUSINESS_ID = "biz-123";
};
const loadServices = async () => {
    vitest_1.vi.resetModules();
    setTestEnv();
    const service = await Promise.resolve().then(() => __importStar(require("./redboxService")));
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
(0, vitest_1.describe)("redboxService", () => {
    (0, vitest_1.it)("parses success responses and attaches auth header", async () => {
        const { getCities, config } = await loadServices();
        const scope = (0, nock_1.default)(config.redbox.baseUrl)
            .get("/countries/SA/cities")
            .matchHeader("authorization", "Bearer test-token")
            .reply(200, {
            success: true,
            response_code: 200,
            data: { cities: [{ code: "RUH", name: "Riyadh" }] },
        });
        const result = await getCities();
        (0, vitest_1.expect)(result).toEqual({ cities: [{ code: "RUH", name: "Riyadh" }] });
        (0, vitest_1.expect)(scope.isDone()).toBe(true);
    });
    (0, vitest_1.it)("retries on 5xx responses before succeeding", async () => {
        const { getStatus, config } = await loadServices();
        const scope = (0, nock_1.default)(config.redbox.baseUrl)
            .get("/shipments/demo")
            .reply(500, { message: "server error" })
            .get("/shipments/demo")
            .reply(200, {
            success: true,
            data: { shipment_id: "sh-1", tracking_number: "TRK-1" },
        });
        const result = await getStatus("demo");
        (0, vitest_1.expect)(result.id).toBe("sh-1");
        (0, vitest_1.expect)(result.trackingNumber).toBe("TRK-1");
        (0, vitest_1.expect)(scope.isDone()).toBe(true);
    });
    (0, vitest_1.it)("throws unauthorized errors on 401 responses", async () => {
        const { getPointsByCity, config } = await loadServices();
        (0, nock_1.default)(config.redbox.baseUrl)
            .get("/cities/RUH/points")
            .reply(401, { msg: "unauthorized" });
        await (0, vitest_1.expect)(getPointsByCity("RUH")).rejects.toMatchObject({
            statusCode: 401,
        });
    });
    (0, vitest_1.it)("maps shipment creation responses", async () => {
        const { createShipmentDirect, config } = await loadServices();
        (0, nock_1.default)(config.redbox.baseUrl)
            .post("/shipments/direct", (body) => body.point_id === "POINT-1")
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
        (0, vitest_1.expect)(result).toMatchObject({
            id: "ship-123",
            trackingNumber: "TRK-123",
            labelUrl: "https://cdn.redboxsa.com/label.pdf",
        });
    });
});
//# sourceMappingURL=redboxService.test.js.map