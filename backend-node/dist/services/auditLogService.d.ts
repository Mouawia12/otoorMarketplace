import { Prisma } from "@prisma/client";
import { z } from "zod";
declare const createAuditSchema: z.ZodObject<{
    actorId: z.ZodNumber;
    actorType: z.ZodDefault<z.ZodEnum<{
        user: "user";
        admin: "admin";
    }>>;
    action: z.ZodString;
    targetType: z.ZodString;
    targetId: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    description: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodUnknown>;
    ipAddress: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RecordAuditParams = z.infer<typeof createAuditSchema>;
export declare const recordAuditLog: (input: RecordAuditParams) => Promise<void>;
export declare const safeRecordAuditLog: (input: RecordAuditParams) => Promise<void>;
export declare const safeRecordAdminAuditLog: (input: Omit<RecordAuditParams, "actorType">) => Promise<void>;
export declare const listAdminAuditLogs: (query: unknown) => Promise<{
    logs: {
        id: number;
        actor_type: string;
        action: string;
        target_type: string;
        target_id: number | null;
        description: string | null;
        metadata: Prisma.JsonValue;
        ip_address: string | null;
        created_at: Date;
        admin: {
            id: number;
            full_name: string;
            email: string;
        } | null;
    }[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}>;
export {};
//# sourceMappingURL=auditLogService.d.ts.map