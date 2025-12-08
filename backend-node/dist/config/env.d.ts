import "dotenv/config";
export declare const config: {
    nodeEnv: "development" | "production" | "test";
    port: number;
    databaseUrl: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    allowedOrigins: string[];
    platformCommissionRate: number;
    shipping: {
        standard: number;
        express: number;
    };
    uploads: {
        dir: string;
        maxFileSizeMb: number;
    };
    assetBaseUrl: string;
    google: {
        clientId: string | undefined;
        clientSecret: string | undefined;
    };
    support: {
        email: string;
    };
    mail: {
        host: string;
        port: number;
        username: string;
        password: string;
        encryption: "none" | "tls" | "ssl";
        from: {
            address: string;
            name: string;
        };
    };
    auth: {
        passwordResetUrl: string;
    };
    accounts: {
        protectedAdminEmail: string;
    };
};
//# sourceMappingURL=env.d.ts.map