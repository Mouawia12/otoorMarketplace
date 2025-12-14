"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingService_1 = require("../services/settingService");
const router = (0, express_1.Router)();
router.get("/bank-transfer", async (_req, res, next) => {
    try {
        const settings = await (0, settingService_1.getBankTransferSettings)();
        res.json(settings);
    }
    catch (error) {
        next(error);
    }
});
router.get("/social-links", async (_req, res, next) => {
    try {
        const links = await (0, settingService_1.getSocialLinks)();
        res.json(links);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map