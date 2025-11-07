"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: env_1.config.databaseUrl,
        },
    },
});
// Optional: log connection status once to confirm DB link
exports.prisma
    .$connect()
    .then(() => {
    if (env_1.config.nodeEnv !== "test") {
        console.info("✅ Connected to MySQL database");
    }
})
    .catch((error) => {
    console.error("❌ Failed to connect to MySQL:", error);
});
//# sourceMappingURL=client.js.map