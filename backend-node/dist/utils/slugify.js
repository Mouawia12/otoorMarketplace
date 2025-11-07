"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSlug = void 0;
const transliteration_1 = require("transliteration");
const makeSlug = (value) => {
    const base = (0, transliteration_1.slugify)(value, { lowercase: true, separator: "-" });
    return base.replace(/-+/g, "-");
};
exports.makeSlug = makeSlug;
//# sourceMappingURL=slugify.js.map