import { z } from "zod";
declare const createTicketSchema: z.ZodObject<{
    userId: z.ZodNumber;
    subject: z.ZodString;
    message: z.ZodString;
    role: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const createSupportTicket: (input: z.infer<typeof createTicketSchema>) => Promise<{
    id: number;
    user_id: number;
    subject: string;
    message: string;
    status: string;
    role: string;
    created_at: Date;
    updated_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
    } | undefined;
    replies: {
        id: number;
        ticket_id: number;
        user_id: number;
        message: string;
        created_at: Date;
        user: {
            id: number;
            full_name: string;
            email: string;
        } | undefined;
    }[];
}>;
export declare const listSupportTickets: (opts: {
    userId?: number;
    role?: string | undefined;
    all?: boolean;
}) => Promise<{
    id: number;
    user_id: number;
    subject: string;
    message: string;
    status: string;
    role: string;
    created_at: Date;
    updated_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
    } | undefined;
    replies: {
        id: number;
        ticket_id: number;
        user_id: number;
        message: string;
        created_at: Date;
        user: {
            id: number;
            full_name: string;
            email: string;
        } | undefined;
    }[];
}[]>;
export declare const getSupportTicket: (id: number, userId?: number, isAdmin?: boolean) => Promise<{
    id: number;
    user_id: number;
    subject: string;
    message: string;
    status: string;
    role: string;
    created_at: Date;
    updated_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
    } | undefined;
    replies: {
        id: number;
        ticket_id: number;
        user_id: number;
        message: string;
        created_at: Date;
        user: {
            id: number;
            full_name: string;
            email: string;
        } | undefined;
    }[];
}>;
export declare const updateSupportTicketStatus: (id: number, status: string) => Promise<{
    id: number;
    user_id: number;
    subject: string;
    message: string;
    status: string;
    role: string;
    created_at: Date;
    updated_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
    } | undefined;
    replies: {
        id: number;
        ticket_id: number;
        user_id: number;
        message: string;
        created_at: Date;
        user: {
            id: number;
            full_name: string;
            email: string;
        } | undefined;
    }[];
}>;
declare const replySchema: z.ZodObject<{
    ticketId: z.ZodNumber;
    userId: z.ZodNumber;
    message: z.ZodString;
}, z.core.$strip>;
export declare const addSupportReply: (input: z.infer<typeof replySchema>) => Promise<{
    id: number;
    ticket_id: number;
    user_id: number;
    message: string;
    created_at: Date;
    user: {
        id: number;
        full_name: string;
        email: string;
    } | undefined;
}>;
export {};
//# sourceMappingURL=supportService.d.ts.map