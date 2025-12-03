import nodemailer from "nodemailer";

import { config } from "../config/env";

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.encryption === "ssl",
  requireTLS: config.mail.encryption === "tls",
  auth: {
    user: config.mail.username,
    pass: config.mail.password,
  },
});

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export const sendMail = async ({ to, subject, html, text }: SendMailParams) => {
  await transporter.sendMail({
    to,
    from: `"${config.mail.from.name}" <${config.mail.from.address}>`,
    subject,
    html,
    text,
  });
};
