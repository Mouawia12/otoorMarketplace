"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const errors_1 = require("../utils/errors");
const uploads_1 = require("../utils/uploads");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const uploadDir = (0, uploads_1.getUploadRoot)();
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || ".png";
        const baseName = path_1.default
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
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: env_1.config.uploads.maxFileSizeMb * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (allowedMimeTypes.has(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(errors_1.AppError.badRequest("Only image files are allowed"));
        }
    },
});
const sellerRoles = [client_1.RoleName.SELLER, client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN];
const sellerOnly = (0, auth_1.authenticate)({ roles: sellerRoles });
router.post("/image", sellerOnly, upload.single("image"), (req, res, next) => {
    if (!req.file) {
        return next(errors_1.AppError.badRequest("No image file received"));
    }
    const publicPath = (0, uploads_1.buildPublicUploadPath)(req.file.filename);
    const absoluteUrl = `${req.protocol}://${req.get("host")}${publicPath}`;
    res.json({
        url: absoluteUrl,
        path: publicPath,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
    });
});
exports.default = router;
//# sourceMappingURL=uploads.js.map