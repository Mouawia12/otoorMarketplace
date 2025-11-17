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
};
//# sourceMappingURL=env.d.ts.map