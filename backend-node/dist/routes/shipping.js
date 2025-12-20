"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redboxService_1 = require("../services/redboxService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get("/redbox/cities", async (req, res, next) => {
    try {
        const country = typeof req.query.country === "string" ? req.query.country : undefined;
        const result = await (0, redboxService_1.getCities)(country);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/redbox/points", async (req, res, next) => {
    try {
        const cityCode = typeof req.query.city_code === "string"
            ? req.query.city_code
            : typeof req.query.cityCode === "string"
                ? req.query.cityCode
                : undefined;
        if (!cityCode) {
            throw errors_1.AppError.badRequest("city_code is required");
        }
        const result = await (0, redboxService_1.getPointsByCity)(cityCode);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get("/redbox/nearby", async (req, res, next) => {
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const radius = req.query.radius ? Number(req.query.radius) : undefined;
        const type = typeof req.query.type === "string" ? req.query.type : undefined;
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            throw errors_1.AppError.badRequest("lat and lng are required");
        }
        const result = await (0, redboxService_1.searchNearbyPoints)({
            lat,
            lng,
            radius: radius ?? undefined,
            type: type ?? undefined,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=shipping.js.map