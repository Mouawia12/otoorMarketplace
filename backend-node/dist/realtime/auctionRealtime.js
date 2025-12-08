"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastBidUpdate = exports.shutdownAuctionRealtime = exports.initAuctionRealtime = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const AUCTION_ROOM_PREFIX = "auction:";
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
        path: "/socket.io",
        serveClient: false,
    });
    io.on("connection", (socket) => {
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
const broadcastBidUpdate = (payload) => {
    const instance = getIo();
    instance.to(getAuctionRoom(payload.auctionId)).emit("auction:update", payload);
};
exports.broadcastBidUpdate = broadcastBidUpdate;
//# sourceMappingURL=auctionRealtime.js.map