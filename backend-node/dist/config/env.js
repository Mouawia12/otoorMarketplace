"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: zod_1.z.coerce.number().default(8080),
    DATABASE_URL: zod_1.z
        .string()
        .min(1, "DATABASE_URL is required")
        .describe("MySQL connection string"),
    JWT_SECRET: zod_1.z.string().min(32, "JWT_SECRET should be at least 32 chars"),
    JWT_EXPIRES_IN: zod_1.z.string().default("86400"),
    ALLOWED_ORIGINS: zod_1.z.string().default("*"),
    PLATFORM_COMMISSION_RATE: zod_1.z
        .string()
        .default("0.1")
        .describe("Commission rate taken on every order (e.g. 0.1 for 10%)"),
    STANDARD_SHIPPING_FEE: zod_1.z.string().default("0"),
    EXPRESS_SHIPPING_FEE: zod_1.z.string().default("35"),
    UPLOAD_DIR: zod_1.z.string().default("uploads"),
    MAX_UPLOAD_SIZE_MB: zod_1.z.coerce.number().default(5),
    ASSET_BASE_URL: zod_1.z.string().default("http://localhost:8080"),
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    SUPPORT_EMAIL: zod_1.z.string().email().default("support@otourmarketplace.com"),
    MAIL_HOST: zod_1.z.string().min(1, "MAIL_HOST is required").default("localhost"),
    MAIL_PORT: zod_1.z.coerce.number().default(587),
    MAIL_USERNAME: zod_1.z.string().min(1, "MAIL_USERNAME is required"),
    MAIL_PASSWORD: zod_1.z.string().min(1, "MAIL_PASSWORD is required"),
    MAIL_ENCRYPTION: zod_1.z.enum(["none", "tls", "ssl"]).default("tls"),
    MAIL_FROM_ADDRESS: zod_1.z.string().email(),
    MAIL_FROM_NAME: zod_1.z.string().default("Otoor Marketplace"),
    PASSWORD_RESET_URL: zod_1.z
        .string()
        .url()
        .default("http://localhost:5173/reset-password"),
    ADMIN_PROTECTED_EMAIL: zod_1.z
        .string()
        .email()
        .default("fragreworld@gmail.com"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten());
    throw new Error("Invalid environment configuration");
}
const { NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, ALLOWED_ORIGINS, PLATFORM_COMMISSION_RATE, STANDARD_SHIPPING_FEE, EXPRESS_SHIPPING_FEE, UPLOAD_DIR, MAX_UPLOAD_SIZE_MB, ASSET_BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SUPPORT_EMAIL, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS, MAIL_FROM_NAME, PASSWORD_RESET_URL, ADMIN_PROTECTED_EMAIL, } = parsed.data;
const allowedOrigins = ALLOWED_ORIGINS === "*"
    ? ["*"]
    : ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
exports.config = {
    nodeEnv: NODE_ENV,
    port: PORT,
    databaseUrl: DATABASE_URL,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    allowedOrigins,
    platformCommissionRate: Number(PLATFORM_COMMISSION_RATE),
    shipping: {
        standard: Number(STANDARD_SHIPPING_FEE),
        express: Number(EXPRESS_SHIPPING_FEE),
    },
    uploads: {
        dir: UPLOAD_DIR,
        maxFileSizeMb: MAX_UPLOAD_SIZE_MB,
    },
    assetBaseUrl: ASSET_BASE_URL.replace(/\/+$/, ""),
    google: {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
    },
    support: {
        email: SUPPORT_EMAIL,
    },
    mail: {
        host: MAIL_HOST,
        port: MAIL_PORT,
        username: MAIL_USERNAME,
        password: MAIL_PASSWORD,
        encryption: MAIL_ENCRYPTION,
        from: {
            address: MAIL_FROM_ADDRESS,
            name: MAIL_FROM_NAME,
        },
    },
    auth: {
        passwordResetUrl: PASSWORD_RESET_URL.replace(/\/+$/, ""),
    },
    accounts: {
        protectedAdminEmail: ADMIN_PROTECTED_EMAIL.toLowerCase(),
    },
};
//# sourceMappingURL=env.js.map