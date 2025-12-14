import { NotificationType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { toPlainObject } from "../utils/serializer";
import { createNotificationForUser, notifyAdmins } from "./notificationService";

const createTicketSchema = z.object({
  userId: z.number().int().positive(),
  subject: z.string().min(3),
  message: z.string().min(5),
  role: z.string().default("buyer"),
});

export const createSupportTicket = async (input: z.infer<typeof createTicketSchema>) => {
  const data = createTicketSchema.parse(input);
  const ticket = await prisma.supportTicket.create({
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

  await notifyAdmins({
    type: NotificationType.SYSTEM,
    title: "تذكرة دعم جديدة",
    message: `${ticket.user?.fullName ?? "مستخدم"} (${data.role}) فتح تذكرة: ${data.subject}`,
    data: { ticketId: ticket.id, subject: ticket.subject, role: ticket.role },
    fallbackToSupport: true,
  });

  return normalized;
};

export const listSupportTickets = async (opts: { userId?: number; role?: string | undefined; all?: boolean }) => {
  const where: Prisma.SupportTicketWhereInput = {};
  if (!opts.all && opts.userId) {
    where.userId = opts.userId;
  }
  if (opts.role) {
    where.role = opts.role;
  }

  const tickets = await prisma.supportTicket.findMany({
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

export const getSupportTicket = async (id: number, userId?: number, isAdmin?: boolean) => {
  const ticket = await prisma.supportTicket.findUnique({
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
    throw AppError.notFound("Ticket not found");
  }
  if (!isAdmin && ticket.userId !== userId) {
    throw AppError.unauthorized();
  }
  return mapTicket(ticket);
};

const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "PENDING", "ANSWERED", "CLOSED"]),
});

export const updateSupportTicketStatus = async (id: number, status: string) => {
  const data = updateStatusSchema.parse({ status: status.toUpperCase() });
  const ticket = await prisma.supportTicket.update({
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

const replySchema = z.object({
  ticketId: z.number().int().positive(),
  userId: z.number().int().positive(),
  message: z.string().min(2),
});

export const addSupportReply = async (
  input: z.infer<typeof replySchema>,
  options?: { actorIsAdmin?: boolean }
) => {
  const data = replySchema.parse(input);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: data.ticketId },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!ticket) {
    throw AppError.notFound("Ticket not found");
  }

  const reply = await prisma.supportReply.create({
    data: {
      ticketId: data.ticketId,
      userId: data.userId,
      message: data.message,
    },
    include: { user: { select: { id: true, fullName: true, email: true } }, ticket: true },
  });

  if (options?.actorIsAdmin) {
    await createNotificationForUser({
      userId: ticket.userId,
      type: NotificationType.SYSTEM,
      title: "رد جديد على تذكرتك",
      message: "قام فريق الدعم بالرد على تذكرتك.",
      data: { ticketId: ticket.id, replyId: reply.id },
    });
  } else {
    await notifyAdmins({
      type: NotificationType.SYSTEM,
      title: "رد جديد من مستخدم على تذكرة دعم",
      message: `${reply.user?.fullName ?? "مستخدم"} رد على التذكرة #${ticket.id}`,
      data: { ticketId: ticket.id, replyId: reply.id },
      fallbackToSupport: true,
    });
  }

  return mapReply(reply);
};

const mapReply = (
  reply: Prisma.SupportReplyGetPayload<{
    include: { user: { select: { id: true; fullName: true; email: true } }; ticket?: true };
  }>
) => {
  const plain = toPlainObject(reply);
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

const mapTicket = (
  ticket: Prisma.SupportTicketGetPayload<{
    include: {
      user: { select: { id: true; fullName: true; email: true } };
      replies?: {
        include: { user: { select: { id: true; fullName: true; email: true } } };
      };
    };
  }>
) => {
  const plain = toPlainObject(ticket);
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
    replies: Array.isArray(plain.replies) ? plain.replies.map((r: any) => mapReply(r)) : [],
  };
};
