import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";

const createAuditSchema = z.object({
  actorId: z.number().int().positive(),
  actorType: z.enum(["admin", "user"]).default("admin"),
  action: z.string().min(2),
  targetType: z.string().min(2),
  targetId: z.number().int().optional().nullable(),
  description: z.string().optional(),
  metadata: z.unknown().optional(),
  ipAddress: z.string().optional(),
});

export type RecordAuditParams = z.infer<typeof createAuditSchema>;

export const recordAuditLog = async (input: RecordAuditParams) => {
  const data = createAuditSchema.parse(input);

  const normalizeJsonInput = (
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull;
    }
    return value as Prisma.InputJsonValue;
  };

  const metadataValue = normalizeJsonInput(data.metadata);

  await prisma.adminAuditLog.create({
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

export const safeRecordAuditLog = async (input: RecordAuditParams) => {
  try {
    await recordAuditLog(input);
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
};

export const safeRecordAdminAuditLog = async (
  input: Omit<RecordAuditParams, "actorType">,
) => safeRecordAuditLog({ ...input, actorType: "admin" });

const listAuditSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).default(25).optional(),
  action: z.string().optional(),
  admin_id: z.coerce.number().optional(),
  search: z.string().optional(),
});

export const listAdminAuditLogs = async (query: unknown) => {
  const { page = 1, page_size = 25, action, admin_id, search } = listAuditSchema.parse(
    query ?? {},
  );

  const where: NonNullable<Parameters<typeof prisma.adminAuditLog.findMany>[0]>["where"] = {};

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

  const [total, rows] = await prisma.$transaction([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
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
