import { Router } from "express";

import authRouter from "./auth";
import productsRouter from "./products";
import auctionsRouter from "./auctions";
import ordersRouter from "./orders";
import wishlistRouter from "./wishlist";
import adminRouter from "./admin";
import sellerRouter from "./seller";
import sellerProfileRouter from "./sellerProfile";
import uploadsRouter from "./uploads";
import blogRouter from "./blog";
import supportRouter from "./support";

const router = Router();

router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/auctions", auctionsRouter);
router.use("/orders", ordersRouter);
router.use("/wishlist", wishlistRouter);
router.use("/admin", adminRouter);
router.use("/seller", sellerRouter);
router.use("/seller/profile", sellerProfileRouter);
router.use("/uploads", uploadsRouter);
router.use("/blog", blogRouter);
router.use("/support", supportRouter);

export default router;
