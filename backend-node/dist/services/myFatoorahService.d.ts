export type MyFatoorahPaymentMethod = {
    id: number;
    code?: string;
    nameEn?: string;
    nameAr?: string;
    serviceCharge?: number;
    totalAmount?: number;
    currency?: string;
    imageUrl?: string;
};
export type ExecutePaymentResult = {
    invoiceId: string;
    paymentUrl: string;
    paymentId?: string;
};
type InvoiceTransaction = {
    PaymentId?: string | number;
    TransactionStatus?: string;
};
export type PaymentStatusResult = {
    invoiceId?: string;
    invoiceStatus?: string;
    customerReference?: string;
    paymentId?: string;
    transactionStatus?: string;
    raw: unknown;
};
export declare const initiatePayment: (amount: number, currency?: string) => Promise<MyFatoorahPaymentMethod[]>;
export type ExecutePaymentInput = {
    paymentMethodId: number;
    invoiceValue: number;
    customerName: string;
    customerEmail?: string;
    customerMobile?: string;
    customerReference?: string;
    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
    }>;
};
export declare const executePayment: (payload: ExecutePaymentInput) => Promise<ExecutePaymentResult>;
export declare const getPaymentStatus: (key: string, keyType: "PaymentId" | "InvoiceId") => Promise<{
    invoiceId: string | undefined;
    invoiceStatus: string | undefined;
    customerReference: string | undefined;
    paymentId: string | undefined;
    transactionStatus: string | undefined;
    raw: {
        InvoiceId?: number;
        InvoiceStatus?: string;
        CustomerReference?: string;
        InvoiceTransactions?: InvoiceTransaction[];
    };
}>;
export {};
//# sourceMappingURL=myFatoorahService.d.ts.map