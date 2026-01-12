import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import type { CorsOptions } from "cors";

import { config } from "./config/env";
import { prisma } from "./prisma/client";
import apiRouter from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { getUploadRoot } from "./utils/uploads";
import { initAuctionRealtime, shutdownAuctionRealtime } from "./realtime/auctionRealtime";
import { startAuctionFinalizer, stopAuctionFinalizer } from "./services/auctionService";
import { resumePendingPerfumeImports } from "./services/perfumeImportService";

const app = express();
const httpServer = http.createServer(app);

const corsOptions: CorsOptions =
  config.allowedOrigins.length === 1 && config.allowedOrigins[0] === "*"
    ? { origin: true, credentials: true }
    : { origin: config.allowedOrigins, credentials: true };

app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(getUploadRoot()));
app.use("/api", apiRouter);

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

app.use(errorHandler);

initAuctionRealtime(httpServer, corsOptions);

const server = httpServer.listen(config.port, () => {
  console.log(`🚀 API server running on http://localhost:${config.port}`);
  resumePendingPerfumeImports().catch((error) => {
    console.error("Failed to resume perfume imports", error);
  });
  startAuctionFinalizer();
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    shutdownAuctionRealtime();
    stopAuctionFinalizer();
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default app;
