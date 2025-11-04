import { PrismaClient } from "../generated/prisma";
import { config } from "../config/env";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

// Optional: log connection status once to confirm DB link
prisma
  .$connect()
  .then(() => {
    if (config.nodeEnv !== "test") {
      console.info("✅ Connected to MySQL database");
    }
  })
  .catch((error) => {
    console.error("❌ Failed to connect to MySQL:", error);
  });
