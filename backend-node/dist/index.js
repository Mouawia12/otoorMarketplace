"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const client_1 = require("./prisma/client");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const corsOptions = env_1.config.allowedOrigins.length === 1 && env_1.config.allowedOrigins[0] === "*"
    ? { origin: true, credentials: true }
    : { origin: env_1.config.allowedOrigins, credentials: true };
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
if (env_1.config.nodeEnv === "development") {
    app.use((0, morgan_1.default)("dev"));
}
app.use("/api", routes_1.default);
app.get("/health", async (_req, res) => {
    try {
        await client_1.prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: "ok",
            database: "up",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({
            status: "error",
            database: "down",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
app.use(errorHandler_1.errorHandler);
const server = app.listen(env_1.config.port, () => {
    console.log(`🚀 API server running on http://localhost:${env_1.config.port}`);
});
const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        await client_1.prisma.$disconnect();
        process.exit(0);
    });
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
exports.default = app;
//# sourceMappingURL=index.js.map