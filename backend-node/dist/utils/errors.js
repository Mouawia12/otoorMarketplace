"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = "AppError";
    }
    static badRequest(message, details) {
        return new AppError(message, 400, details);
    }
    static unauthorized(message = "Unauthorized") {
        return new AppError(message, 401);
    }
    static forbidden(message = "Forbidden") {
        return new AppError(message, 403);
    }
    static notFound(message = "Not found") {
        return new AppError(message, 404);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=errors.js.map