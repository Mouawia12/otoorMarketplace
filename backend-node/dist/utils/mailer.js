"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.config.mail.host,
    port: env_1.config.mail.port,
    secure: env_1.config.mail.encryption === "ssl",
    requireTLS: env_1.config.mail.encryption === "tls",
    auth: {
        user: env_1.config.mail.username,
        pass: env_1.config.mail.password,
    },
});
const sendMail = async ({ to, subject, html, text }) => {
    await transporter.sendMail({
        to,
        from: `"${env_1.config.mail.from.name}" <${env_1.config.mail.from.address}>`,
        subject,
        html,
        text,
    });
};
exports.sendMail = sendMail;
//# sourceMappingURL=mailer.js.map