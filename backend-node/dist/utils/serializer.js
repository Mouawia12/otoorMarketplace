"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainObject = void 0;
const client_1 = require("@prisma/client");
const isDecimal = (value) => {
    return value instanceof client_1.Prisma.Decimal;
};
const toPlainObject = (data) => {
    if (data === null || data === undefined) {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map((item) => (0, exports.toPlainObject)(item));
    }
    if (typeof data === "object") {
        const entries = Object.entries(data).map(([key, value]) => {
            if (isDecimal(value)) {
                return [key, value.toNumber()];
            }
            if (value instanceof Date) {
                return [key, value.toISOString()];
            }
            return [key, (0, exports.toPlainObject)(value)];
        });
        return Object.fromEntries(entries);
    }
    return data;
};
exports.toPlainObject = toPlainObject;
//# sourceMappingURL=serializer.js.map