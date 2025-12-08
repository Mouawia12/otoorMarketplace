import { Router } from "express";

import {
  listAuctions,
  getAuctionById,
  getAuctionBids,
  placeBid,
  getAuctionByProductId,
} from "../services/auctionService";
import { authenticate } from "../middleware/auth";
import { AppError } from "../utils/errors";
import { broadcastBidUpdate } from "../realtime/auctionRealtime";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const auctions = await listAuctions(req.query);
    res.json({ auctions });
  } catch (error) {
    next(error);
  }
});

router.get("/product/:productId", async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (Number.isNaN(productId)) {
      throw AppError.badRequest("Invalid product id");
    }
    const auction = await getAuctionByProductId(productId);
    res.json({ auction });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid auction id");
    }
    const auction = await getAuctionById(id);
    res.json(auction);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/bids", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid auction id");
    }
    const bids = await getAuctionBids(id);
    res.json({ bids });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/bids",
  authenticate({ roles: ["BUYER", "SELLER", "ADMIN", "SUPER_ADMIN"] }),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw AppError.badRequest("Invalid auction id");
    }

    const amount = Number(req.body.amount);
    if (Number.isNaN(amount)) {
      throw AppError.badRequest("Invalid bid amount");
    }

    const { bid, auction } = await placeBid({
      auctionId: id,
      bidderId: req.user.id,
      amount,
    });

    res.status(201).json(bid);

    broadcastBidUpdate({
      auctionId: auction.id,
      bid,
      currentPrice: auction.current_price,
      totalBids: auction.total_bids ?? 0,
      placedAt: bid.created_at,
    });
  } catch (error) {
    next(error);
  }
  }
);

export default router;
