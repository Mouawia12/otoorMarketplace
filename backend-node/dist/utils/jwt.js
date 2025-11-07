"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccessToken = exports.signAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const signAccessToken = (payload) => {
    const numericExpires = Number(env_1.config.jwtExpiresIn);
    const expiresIn = Number.isNaN(numericExpires) ? 86400 : numericExpires;
    const options = {
        expiresIn,
    };
    return jsonwebtoken_1.default.sign(payload, env_1.config.jwtSecret, options);
};
exports.signAccessToken = signAccessToken;
const verifyAccessToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtSecret);
    if (typeof decoded !== "object" || decoded === null) {
        throw new Error("Invalid token payload");
    }
    const rolesRaw = Array.isArray(decoded.roles)
        ? (decoded.roles)
        : [];
    const roles = rolesRaw.map((role) => role);
    const subValue = decoded.sub;
    const sub = typeof subValue === "string" ? Number(subValue) : subValue;
    if (typeof sub !== "number" || Number.isNaN(sub)) {
        throw new Error("Invalid token subject");
    }
    return {
        sub,
        roles,
    };
};
exports.verifyAccessToken = verifyAccessToken;
//# sourceMappingURL=jwt.js.map