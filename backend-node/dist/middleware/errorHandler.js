"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            details: err.details,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Validation error",
            errors: err.flatten(),
        });
    }
    console.error("Unexpected error:", err);
    return res.status(500).json({
        message: "Internal server error",
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map