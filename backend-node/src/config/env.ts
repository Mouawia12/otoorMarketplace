import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z
    .string({
      description: "MySQL connection string",
    })
    .min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET should be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("86400"),
  ALLOWED_ORIGINS: z.string().default("*"),
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
};
