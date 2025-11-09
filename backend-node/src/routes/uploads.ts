import { Router } from "express";
import multer from "multer";
import path from "path";
import { RoleName } from "@prisma/client";

import { authenticate } from "../middleware/auth";
import { AppError } from "../utils/errors";
import { buildPublicUploadPath, getUploadRoot } from "../utils/uploads";
import { config } from "../config/env";

const router = Router();

const uploadDir = getUploadRoot();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const baseName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName || "image"}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
]);

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(AppError.badRequest("Only image files are allowed"));
    }
  },
});

const sellerRoles = [RoleName.SELLER, RoleName.ADMIN, RoleName.SUPER_ADMIN];
const sellerOnly = authenticate({ roles: sellerRoles });

router.post(
  "/image",
  sellerOnly,
  upload.single("image"),
  (req, res, next) => {
    if (!req.file) {
      return next(AppError.badRequest("No image file received"));
    }

    const publicPath = buildPublicUploadPath(req.file.filename);
    const absoluteUrl = `${req.protocol}://${req.get("host")}${publicPath}`;

    res.json({
      url: absoluteUrl,
      path: publicPath,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  }
);

export default router;
