import type { Server as HTTPServer } from "http";
import type { CorsOptions } from "cors";
import { Server } from "socket.io";
type BidderPayload = {
    id: number;
    full_name: string;
    email: string;
} | undefined;
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
export declare const initAuctionRealtime: (server: HTTPServer, corsOptions: CorsOptions) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const shutdownAuctionRealtime: () => void;
export declare const broadcastBidUpdate: (payload: AuctionBidUpdatePayload) => void;
export {};
//# sourceMappingURL=auctionRealtime.d.ts.map