"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastUserNotification = exports.broadcastBidUpdate = exports.shutdownAuctionRealtime = exports.initAuctionRealtime = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
let io = null;
const AUCTION_ROOM_PREFIX = "auction:";
const USER_ROOM_PREFIX = "user:";
const resolveCorsOrigins = (corsOptions) => {
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
const initAuctionRealtime = (server, corsOptions) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: resolveCorsOrigins(corsOptions),
            credentials: true,
        },
        // align websocket path with API prefix to work behind /api reverse proxy
        path: "/api/socket.io",
        serveClient: false,
    });
    io.use((socket, next) => {
        console.log("[socket] handshake", {
            origin: socket.handshake.headers.origin,
            auth: socket.handshake.auth,
            cookie: socket.handshake.headers.cookie,
        });
        const tokenRaw = (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token.trim().length > 0
            ? socket.handshake.auth.token
            : undefined) ||
            (typeof socket.handshake.query?.token === "string" ? socket.handshake.query.token : undefined) ||
            (typeof socket.handshake.headers?.authorization === "string"
                ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, "")
                : undefined);
        if (tokenRaw) {
            try {
                const payload = (0, jwt_1.verifyAccessToken)(tokenRaw);
                socket.data.userId = payload.sub;
                socket.data.roles = payload.roles;
            }
            catch (error) {
                console.warn("Failed to authenticate realtime socket:", error instanceof Error ? error.message : error);
            }
        }
        next();
    });
    io.on("connection", (socket) => {
        if (socket.data.userId) {
            socket.join(getUserRoom(socket.data.userId));
        }
        socket.on("auction:join", (maybeId) => {
            const auctionId = Number(maybeId);
            if (!Number.isFinite(auctionId) || auctionId <= 0) {
                return;
            }
            socket.join(getAuctionRoom(auctionId));
            socket.emit("auction:joined", { auctionId });
        });
        socket.on("auction:leave", (maybeId) => {
            const auctionId = Number(maybeId);
            if (!Number.isFinite(auctionId) || auctionId <= 0) {
                return;
            }
            socket.leave(getAuctionRoom(auctionId));
        });
    });
    io.engine.on("connection_error", (err) => {
        console.error("[engine] connection_error", {
            code: err.code,
            message: err.message,
            context: err.context,
        });
    });
    return io;
};
exports.initAuctionRealtime = initAuctionRealtime;
const shutdownAuctionRealtime = () => {
    if (io) {
        io.removeAllListeners();
        io.close();
        io = null;
    }
};
exports.shutdownAuctionRealtime = shutdownAuctionRealtime;
const getIo = () => {
    if (!io) {
        throw new Error("Auction realtime server is not initialized");
    }
    return io;
};
const getAuctionRoom = (auctionId) => `${AUCTION_ROOM_PREFIX}${auctionId}`;
const getUserRoom = (userId) => `${USER_ROOM_PREFIX}${userId}`;
const broadcastBidUpdate = (payload) => {
    const instance = getIo();
    instance.to(getAuctionRoom(payload.auctionId)).emit("auction:update", payload);
};
exports.broadcastBidUpdate = broadcastBidUpdate;
const broadcastUserNotification = (payload) => {
    const instance = getIo();
    instance.to(getUserRoom(payload.userId)).emit("notification:new", payload.notification);
};
exports.broadcastUserNotification = broadcastUserNotification;
//# sourceMappingURL=auctionRealtime.js.map