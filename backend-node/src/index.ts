import express from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/env";
import { prisma } from "./prisma/client";

const app = express();

const corsOptions: CorsOptions =
  config.allowedOrigins.length === 1 && config.allowedOrigins[0] === "*"
    ? { origin: true, credentials: true }
    : { origin: config.allowedOrigins, credentials: true };

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      database: "up",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "down",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const server = app.listen(config.port, () => {
  console.log(`🚀 API server running on http://localhost:${config.port}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default app;
