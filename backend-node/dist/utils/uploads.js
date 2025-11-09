"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPublicUploadPath = exports.getUploadRoot = exports.ensureUploadDir = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const uploadRoot = path_1.default.resolve(process.cwd(), env_1.config.uploads.dir);
const ensureUploadDir = () => {
    if (!fs_1.default.existsSync(uploadRoot)) {
        fs_1.default.mkdirSync(uploadRoot, { recursive: true });
    }
};
exports.ensureUploadDir = ensureUploadDir;
(0, exports.ensureUploadDir)();
const getUploadRoot = () => uploadRoot;
exports.getUploadRoot = getUploadRoot;
const buildPublicUploadPath = (filename) => `/uploads/${filename}`;
exports.buildPublicUploadPath = buildPublicUploadPath;
//# sourceMappingURL=uploads.js.map