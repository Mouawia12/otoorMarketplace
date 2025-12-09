import type { Server as HTTPServer } from "http";
import type { CorsOptions } from "cors";
import { Server } from "socket.io";

import { verifyAccessToken } from "../utils/jwt";

let io: Server | null = null;

const AUCTION_ROOM_PREFIX = "auction:";
const USER_ROOM_PREFIX = "user:";

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

export type NotificationRealtimePayload = {
  userId: number;
  notification: {
    id: number;
    type: string;
    title: string;
    message: string;
    data: unknown;
    read_at: string | null;
    created_at: string;
  };
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

  io.use((socket, next) => {
    const tokenRaw =
      (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token.trim().length > 0
        ? socket.handshake.auth.token
        : undefined) ||
      (typeof socket.handshake.query?.token === "string" ? (socket.handshake.query.token as string) : undefined) ||
      (typeof socket.handshake.headers?.authorization === "string"
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
        : undefined);

    if (tokenRaw) {
      try {
        const payload = verifyAccessToken(tokenRaw);
        socket.data.userId = payload.sub;
        socket.data.roles = payload.roles;
      } catch (error) {
        console.warn("Failed to authenticate realtime socket:", error instanceof Error ? error.message : error);
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.userId) {
      socket.join(getUserRoom(socket.data.userId));
    }

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
const getUserRoom = (userId: number | string) => `${USER_ROOM_PREFIX}${userId}`;

export const broadcastBidUpdate = (payload: AuctionBidUpdatePayload) => {
  const instance = getIo();
  instance.to(getAuctionRoom(payload.auctionId)).emit("auction:update", payload);
};

export const broadcastUserNotification = (payload: NotificationRealtimePayload) => {
  const instance = getIo();
  instance.to(getUserRoom(payload.userId)).emit("notification:new", payload.notification);
};
