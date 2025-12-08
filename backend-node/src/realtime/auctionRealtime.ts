import type { Server as HTTPServer } from "http";
import type { CorsOptions } from "cors";
import { Server } from "socket.io";

let io: Server | null = null;

const AUCTION_ROOM_PREFIX = "auction:";

type BidderPayload =
  | {
      id: number;
      full_name: string;
      email: string;
    }
  | undefined;

export type RealtimeBidPayload = {
  id: number;
  auction_id: number;
  bidder_id: number;
  amount: number;
  created_at: string;
  bidder?: BidderPayload;
};

export type AuctionBidUpdatePayload = {
  auctionId: number;
  bid: RealtimeBidPayload;
  currentPrice: number;
  totalBids: number;
  placedAt: string;
};

const resolveCorsOrigins = (corsOptions: CorsOptions) => {
  if (Array.isArray(corsOptions.origin)) {
    return corsOptions.origin;
  }

  if (typeof corsOptions.origin === "string") {
    return [corsOptions.origin];
  }

  if (corsOptions.origin === true) {
    return true;
  }

  return ["*"];
};

export const initAuctionRealtime = (server: HTTPServer, corsOptions: CorsOptions) => {
  io = new Server(server, {
    cors: {
      origin: resolveCorsOrigins(corsOptions),
      credentials: true,
    },
    path: "/socket.io",
    serveClient: false,
  });

  io.on("connection", (socket) => {
    socket.on("auction:join", (maybeId: unknown) => {
      const auctionId = Number(maybeId);
      if (!Number.isFinite(auctionId) || auctionId <= 0) {
        return;
      }
      socket.join(getAuctionRoom(auctionId));
      socket.emit("auction:joined", { auctionId });
    });

    socket.on("auction:leave", (maybeId: unknown) => {
      const auctionId = Number(maybeId);
      if (!Number.isFinite(auctionId) || auctionId <= 0) {
        return;
      }
      socket.leave(getAuctionRoom(auctionId));
    });
  });

  return io;
};

export const shutdownAuctionRealtime = () => {
  if (io) {
    io.removeAllListeners();
    io.close();
    io = null;
  }
};

const getIo = () => {
  if (!io) {
    throw new Error("Auction realtime server is not initialized");
  }
  return io;
};

const getAuctionRoom = (auctionId: number | string) => `${AUCTION_ROOM_PREFIX}${auctionId}`;

export const broadcastBidUpdate = (payload: AuctionBidUpdatePayload) => {
  const instance = getIo();
  instance.to(getAuctionRoom(payload.auctionId)).emit("auction:update", payload);
};
