type SendMailParams = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};
export declare const sendMail: ({ to, subject, html, text }: SendMailParams) => Promise<void>;
export {};
//# sourceMappingURL=mailer.d.ts.map