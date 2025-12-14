"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdminAuditLogs = exports.safeRecordAdminAuditLog = exports.safeRecordAuditLog = exports.recordAuditLog = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const createAuditSchema = zod_1.z.object({
    actorId: zod_1.z.number().int().positive(),
    actorType: zod_1.z.enum(["admin", "user"]).default("admin"),
    action: zod_1.z.string().min(2),
    targetType: zod_1.z.string().min(2),
    targetId: zod_1.z.number().int().optional().nullable(),
    description: zod_1.z.string().optional(),
    metadata: zod_1.z.unknown().optional(),
    ipAddress: zod_1.z.string().optional(),
});
const recordAuditLog = async (input) => {
    const data = createAuditSchema.parse(input);
    const normalizeJsonInput = (value) => {
        if (value === undefined) {
            return undefined;
        }
        if (value === null) {
            return client_1.Prisma.JsonNull;
        }
        return value;
    };
    const metadataValue = normalizeJsonInput(data.metadata);
    await client_2.prisma.adminAuditLog.create({
        data: {
            adminId: data.actorId,
            actorType: data.actorType,
            action: data.action,
            targetType: data.targetType,
            targetId: data.targetId ?? null,
            description: data.description ?? null,
            ...(metadataValue !== undefined ? { metadata: metadataValue } : {}),
            ipAddress: data.ipAddress ?? null,
        },
    });
};
exports.recordAuditLog = recordAuditLog;
const safeRecordAuditLog = async (input) => {
    try {
        await (0, exports.recordAuditLog)(input);
    }
    catch (error) {
        console.error("Failed to record audit log", error);
    }
};
exports.safeRecordAuditLog = safeRecordAuditLog;
const safeRecordAdminAuditLog = async (input) => (0, exports.safeRecordAuditLog)({ ...input, actorType: "admin" });
exports.safeRecordAdminAuditLog = safeRecordAdminAuditLog;
const listAuditSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1).optional(),
    page_size: zod_1.z.coerce.number().int().min(1).max(100).default(25).optional(),
    action: zod_1.z.string().optional(),
    admin_id: zod_1.z.coerce.number().optional(),
    search: zod_1.z.string().optional(),
});
const listAdminAuditLogs = async (query) => {
    const { page = 1, page_size = 25, action, admin_id, search } = listAuditSchema.parse(query ?? {});
    const where = {};
    if (action) {
        where.action = { contains: action };
    }
    if (admin_id) {
        where.adminId = admin_id;
    }
    if (search) {
        where.OR = [
            { description: { contains: search } },
            { targetType: { contains: search } },
            { action: { contains: search } },
            { admin: { fullName: { contains: search } } },
            { admin: { email: { contains: search } } },
        ];
    }
    const [total, rows] = await client_2.prisma.$transaction([
        client_2.prisma.adminAuditLog.count({ where }),
        client_2.prisma.adminAuditLog.findMany({
            where,
            include: {
                admin: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * page_size,
            take: page_size,
        }),
    ]);
    const logs = rows.map((row) => ({
        id: row.id,
        actor_type: row.actorType,
        action: row.action,
        target_type: row.targetType,
        target_id: row.targetId,
        description: row.description,
        metadata: row.metadata,
        ip_address: row.ipAddress,
        created_at: row.createdAt,
        admin: row.admin
            ? {
                id: row.admin.id,
                full_name: row.admin.fullName,
                email: row.admin.email,
            }
            : null,
    }));
    return {
        logs,
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
    };
};
exports.listAdminAuditLogs = listAdminAuditLogs;
//# sourceMappingURL=auditLogService.js.map