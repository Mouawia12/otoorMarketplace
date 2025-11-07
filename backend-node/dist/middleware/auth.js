"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const client_1 = require("../prisma/client");
const jwt_1 = require("../utils/jwt");
const errors_1 = require("../utils/errors");
const authenticate = (options = {}) => async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw errors_1.AppError.unauthorized();
        }
        const [, token] = authHeader.split(" ");
        if (!token) {
            throw errors_1.AppError.unauthorized();
        }
        const payload = (0, jwt_1.verifyAccessToken)(token);
        const user = await client_1.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { roles: { include: { role: true } } },
        });
        if (!user) {
            throw errors_1.AppError.unauthorized();
        }
        const userRoles = user.roles.map((r) => r.role.name);
        if (options.roles &&
            options.roles.length > 0 &&
            !options.roles.some((role) => userRoles.includes(role))) {
            throw errors_1.AppError.forbidden();
        }
        req.user = {
            id: user.id,
            roles: userRoles,
        };
        return next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            return next(error);
        }
        return next(errors_1.AppError.unauthorized());
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map