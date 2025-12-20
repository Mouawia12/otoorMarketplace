"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auctionService_1 = require("../services/auctionService");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const auctionRealtime_1 = require("../realtime/auctionRealtime");
const router = (0, express_1.Router)();
router.get("/", async (req, res, next) => {
    try {
        const auctions = await (0, auctionService_1.listAuctions)({
            ...req.query,
            include_pending: false,
        });
        res.json({ auctions });
    }
    catch (error) {
        next(error);
    }
});
router.get("/product/:productId", async (req, res, next) => {
    try {
        const productId = Number(req.params.productId);
        if (Number.isNaN(productId)) {
            throw errors_1.AppError.badRequest("Invalid product id");
        }
        const auction = await (0, auctionService_1.getAuctionByProductId)(productId);
        res.json({ auction });
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid auction id");
        }
        const auction = await (0, auctionService_1.getAuctionById)(id);
        res.json(auction);
    }
    catch (error) {
        next(error);
    }
});
router.get("/:id/bids", async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid auction id");
        }
        const bids = await (0, auctionService_1.getAuctionBids)(id);
        res.json({ bids });
    }
    catch (error) {
        next(error);
    }
});
router.post("/:id/bids", (0, auth_1.authenticate)({ roles: ["BUYER", "SELLER", "ADMIN", "SUPER_ADMIN"] }), async (req, res, next) => {
    try {
        if (!req.user) {
            throw errors_1.AppError.unauthorized();
        }
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            throw errors_1.AppError.badRequest("Invalid auction id");
        }
        const amount = Number(req.body.amount);
        if (Number.isNaN(amount)) {
            throw errors_1.AppError.badRequest("Invalid bid amount");
        }
        const { bid, auction } = await (0, auctionService_1.placeBid)({
            auctionId: id,
            bidderId: req.user.id,
            amount,
        });
        res.status(201).json(bid);
        (0, auctionRealtime_1.broadcastBidUpdate)({
            auctionId: auction.id,
            bid,
            currentPrice: auction.current_price,
            totalBids: auction.total_bids ?? 0,
            placedAt: bid.created_at,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auctions.js.map