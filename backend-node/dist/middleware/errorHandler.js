"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        console.warn("Handled error:", {
            statusCode: err.statusCode,
            message: err.message,
            details: err.details,
            path: _req.originalUrl,
            method: _req.method,
        });
        return res.status(err.statusCode).json({
            message: err.message,
            details: err.details,
        });
    }
    if (err instanceof zod_1.ZodError) {
        const firstMessage = err.issues.find((issue) => typeof issue.message === "string")?.message ??
            "Validation error";
        return res.status(422).json({
            message: firstMessage,
        });
    }
    console.error("Unexpected error:", err);
    return res.status(500).json({
        message: "Internal server error",
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map