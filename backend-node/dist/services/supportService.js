"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSupportReply = exports.updateSupportTicketStatus = exports.getSupportTicket = exports.listSupportTickets = exports.createSupportTicket = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const serializer_1 = require("../utils/serializer");
const notificationService_1 = require("./notificationService");
const createTicketSchema = zod_1.z.object({
    userId: zod_1.z.number().int().positive(),
    subject: zod_1.z.string().min(3),
    message: zod_1.z.string().min(5),
    role: zod_1.z.string().default("buyer"),
});
const createSupportTicket = async (input) => {
    const data = createTicketSchema.parse(input);
    const ticket = await client_2.prisma.supportTicket.create({
        data: {
            userId: data.userId,
            subject: data.subject,
            message: data.message,
            role: data.role,
        },
        include: {
            user: { select: { id: true, fullName: true, email: true } },
            replies: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    const normalized = mapTicket(ticket);
    await (0, notificationService_1.notifyAdmins)({
        type: client_1.NotificationType.SYSTEM,
        title: "تذكرة دعم جديدة",
        message: `${ticket.user?.fullName ?? "مستخدم"} (${data.role}) فتح تذكرة: ${data.subject}`,
        data: { ticketId: ticket.id, subject: ticket.subject, role: ticket.role },
        fallbackToSupport: true,
    });
    return normalized;
};
exports.createSupportTicket = createSupportTicket;
const listSupportTickets = async (opts) => {
    const where = {};
    if (!opts.all && opts.userId) {
        where.userId = opts.userId;
    }
    if (opts.role) {
        where.role = opts.role;
    }
    const tickets = await client_2.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            user: { select: { id: true, fullName: true, email: true } },
            replies: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    return tickets.map(mapTicket);
};
exports.listSupportTickets = listSupportTickets;
const getSupportTicket = async (id, userId, isAdmin) => {
    const ticket = await client_2.prisma.supportTicket.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, fullName: true, email: true } },
            replies: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    if (!ticket) {
        throw errors_1.AppError.notFound("Ticket not found");
    }
    if (!isAdmin && ticket.userId !== userId) {
        throw errors_1.AppError.unauthorized();
    }
    return mapTicket(ticket);
};
exports.getSupportTicket = getSupportTicket;
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["OPEN", "PENDING", "ANSWERED", "CLOSED"]),
});
const updateSupportTicketStatus = async (id, status) => {
    const data = updateStatusSchema.parse({ status: status.toUpperCase() });
    const ticket = await client_2.prisma.supportTicket.update({
        where: { id },
        data: { status: data.status },
        include: {
            user: { select: { id: true, fullName: true, email: true } },
            replies: {
                include: { user: { select: { id: true, fullName: true, email: true } } },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    return mapTicket(ticket);
};
exports.updateSupportTicketStatus = updateSupportTicketStatus;
const replySchema = zod_1.z.object({
    ticketId: zod_1.z.number().int().positive(),
    userId: zod_1.z.number().int().positive(),
    message: zod_1.z.string().min(2),
});
const addSupportReply = async (input, options) => {
    const data = replySchema.parse(input);
    const ticket = await client_2.prisma.supportTicket.findUnique({
        where: { id: data.ticketId },
        include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!ticket) {
        throw errors_1.AppError.notFound("Ticket not found");
    }
    const reply = await client_2.prisma.supportReply.create({
        data: {
            ticketId: data.ticketId,
            userId: data.userId,
            message: data.message,
        },
        include: { user: { select: { id: true, fullName: true, email: true } }, ticket: true },
    });
    if (options?.actorIsAdmin) {
        await (0, notificationService_1.createNotificationForUser)({
            userId: ticket.userId,
            type: client_1.NotificationType.SYSTEM,
            title: "رد جديد على تذكرتك",
            message: "قام فريق الدعم بالرد على تذكرتك.",
            data: { ticketId: ticket.id, replyId: reply.id },
        });
    }
    else {
        await (0, notificationService_1.notifyAdmins)({
            type: client_1.NotificationType.SYSTEM,
            title: "رد جديد من مستخدم على تذكرة دعم",
            message: `${reply.user?.fullName ?? "مستخدم"} رد على التذكرة #${ticket.id}`,
            data: { ticketId: ticket.id, replyId: reply.id },
            fallbackToSupport: true,
        });
    }
    return mapReply(reply);
};
exports.addSupportReply = addSupportReply;
const mapReply = (reply) => {
    const plain = (0, serializer_1.toPlainObject)(reply);
    return {
        id: plain.id,
        ticket_id: plain.ticketId,
        user_id: plain.userId,
        message: plain.message,
        created_at: plain.createdAt,
        user: plain.user
            ? {
                id: plain.user.id,
                full_name: plain.user.fullName,
                email: plain.user.email,
            }
            : undefined,
    };
};
const mapTicket = (ticket) => {
    const plain = (0, serializer_1.toPlainObject)(ticket);
    return {
        id: plain.id,
        user_id: plain.userId,
        subject: plain.subject,
        message: plain.message,
        status: plain.status.toLowerCase?.() ?? plain.status,
        role: plain.role,
        created_at: plain.createdAt,
        updated_at: plain.updatedAt,
        user: plain.user
            ? {
                id: plain.user.id,
                full_name: plain.user.fullName,
                email: plain.user.email,
            }
            : undefined,
        replies: Array.isArray(plain.replies) ? plain.replies.map((r) => mapReply(r)) : [],
    };
};
//# sourceMappingURL=supportService.js.map