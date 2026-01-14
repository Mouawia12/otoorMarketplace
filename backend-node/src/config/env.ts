import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .describe("MySQL connection string"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET should be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("86400"),
  ALLOWED_ORIGINS: z.string().default("*"),
  PLATFORM_COMMISSION_RATE: z
    .string()
    .default("0.1")
    .describe("Commission rate taken on every order (e.g. 0.1 for 10%)"),
  STANDARD_SHIPPING_FEE: z.string().default("0"),
  EXPRESS_SHIPPING_FEE: z.string().default("35"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(5),
  ASSET_BASE_URL: z.string().default("http://localhost:8080"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().default("support@otourmarketplace.com"),
  MAIL_HOST: z.string().min(1, "MAIL_HOST is required").default("localhost"),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_USERNAME: z.string().min(1, "MAIL_USERNAME is required"),
  MAIL_PASSWORD: z.string().min(1, "MAIL_PASSWORD is required"),
  MAIL_ENCRYPTION: z.enum(["none", "tls", "ssl"]).default("tls"),
  MAIL_FROM_ADDRESS: z.string().email(),
  MAIL_FROM_NAME: z.string().default("Otoor Marketplace"),
  PASSWORD_RESET_URL: z
    .string()
    .url()
    .default("http://localhost:5173/reset-password"),
  AUTH_COOKIE_NAME: z.string().default("otoor_session"),
  ADMIN_PROTECTED_EMAIL: z
    .string()
    .email()
    .default("fragreworld@gmail.com"),
  TOROD_API_URL: z
    .string()
    .url()
    .default("https://demo.stage.torod.co/en/api/"),
  TOROD_CLIENT_ID: z.string().min(1, "TOROD_CLIENT_ID is required"),
  TOROD_CLIENT_SECRET: z.string().min(1, "TOROD_CLIENT_SECRET is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten());
  throw new Error("Invalid environment configuration");
}

const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ALLOWED_ORIGINS,
  PLATFORM_COMMISSION_RATE,
  STANDARD_SHIPPING_FEE,
  EXPRESS_SHIPPING_FEE,
  UPLOAD_DIR,
  MAX_UPLOAD_SIZE_MB,
  ASSET_BASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  SUPPORT_EMAIL,
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_ENCRYPTION,
  MAIL_FROM_ADDRESS,
  MAIL_FROM_NAME,
  PASSWORD_RESET_URL,
  AUTH_COOKIE_NAME,
  ADMIN_PROTECTED_EMAIL,
  TOROD_API_URL,
  TOROD_CLIENT_ID,
  TOROD_CLIENT_SECRET,
} = parsed.data;

const allowedOrigins =
  ALLOWED_ORIGINS === "*"
    ? ["*"]
    : ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

export const config = {
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
    cookieName: AUTH_COOKIE_NAME,
    cookieMaxAgeSeconds: (() => {
      const numericExpires = Number(JWT_EXPIRES_IN);
      return Number.isNaN(numericExpires) ? 86400 : numericExpires;
    })(),
  },
  accounts: {
    protectedAdminEmail: ADMIN_PROTECTED_EMAIL.toLowerCase(),
  },
  torod: {
    baseUrl: TOROD_API_URL.replace(/\/+$/, ""),
    clientId: TOROD_CLIENT_ID,
    clientSecret: TOROD_CLIENT_SECRET,
  },
};
