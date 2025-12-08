import { Prisma, PrismaClient } from "@prisma/client";
type SeedContext = {
    prisma: PrismaClient | Prisma.TransactionClient;
    requirePasswordReset?: boolean;
};
export declare function runSeed({ prisma: client, requirePasswordReset, }: SeedContext): Promise<void>;
export {};
//# sourceMappingURL=seed.d.ts.map