import { config } from "../config/env";
import { AppError } from "../utils/errors";
import { myFatoorahRequest } from "../utils/myFatoorahClient";

type MyFatoorahMethod = {
  PaymentMethodId?: number;
  PaymentMethodCode?: string;
  PaymentMethodEn?: string;
  PaymentMethodAr?: string;
  ServiceCharge?: number;
  TotalAmount?: number;
  CurrencyIso?: string;
  ImageUrl?: string;
};

type InitiatePaymentResponse = {
  PaymentMethods?: MyFatoorahMethod[];
  paymentMethods?: MyFatoorahMethod[];
};

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

type ExecutePaymentResponse = {
  InvoiceId?: number;
  InvoiceURL?: string;
  PaymentURL?: string;
  PaymentId?: number;
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

const normalizeMethods = (methods: MyFatoorahMethod[]): MyFatoorahPaymentMethod[] =>
  methods
    .map((method) => {
      const id = method.PaymentMethodId;
      if (!id) return null;
      return {
        id,
        code: method.PaymentMethodCode,
        nameEn: method.PaymentMethodEn,
        nameAr: method.PaymentMethodAr,
        serviceCharge: method.ServiceCharge,
        totalAmount: method.TotalAmount,
        currency: method.CurrencyIso,
        imageUrl: method.ImageUrl,
      };
    })
    .filter(Boolean) as MyFatoorahPaymentMethod[];

export const initiatePayment = async (amount: number, currency?: string) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError.badRequest("InvoiceAmount must be greater than zero");
  }

  const data = await myFatoorahRequest<InitiatePaymentResponse>({
    method: "POST",
    url: "/v2/InitiatePayment",
    data: {
      InvoiceAmount: Number(amount.toFixed(2)),
      CurrencyIso: currency ?? config.myfatoorah.currency,
    },
  });

  const methods = data?.PaymentMethods ?? data?.paymentMethods ?? [];
  return normalizeMethods(methods);
};

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

export const executePayment = async (
  payload: ExecutePaymentInput
): Promise<ExecutePaymentResult> => {
  if (!payload.paymentMethodId) {
    throw AppError.badRequest("PaymentMethodId is required");
  }
  if (!Number.isFinite(payload.invoiceValue) || payload.invoiceValue <= 0) {
    throw AppError.badRequest("InvoiceValue must be greater than zero");
  }

  const data = await myFatoorahRequest<ExecutePaymentResponse>({
    method: "POST",
    url: "/v2/ExecutePayment",
    data: {
      PaymentMethodId: payload.paymentMethodId,
      InvoiceValue: Number(payload.invoiceValue.toFixed(2)),
      CallBackUrl: config.myfatoorah.callbackUrl,
      ErrorUrl: config.myfatoorah.errorUrl,
      CustomerName: payload.customerName,
      CustomerEmail: payload.customerEmail,
      CustomerMobile: payload.customerMobile,
      CustomerReference: payload.customerReference,
      Language: "AR",
      DisplayCurrencyIso: config.myfatoorah.currency,
      InvoiceItems: payload.items?.map((item) => ({
        ItemName: item.name,
        Quantity: item.quantity,
        UnitPrice: Number(item.unitPrice.toFixed(2)),
      })),
    },
  });

  const invoiceId = data?.InvoiceId;
  const paymentUrl = data?.PaymentURL ?? data?.InvoiceURL;
  if (!invoiceId || !paymentUrl) {
    throw AppError.badRequest("MyFatoorah payment response missing invoice data");
  }

  const result: ExecutePaymentResult = {
    invoiceId: String(invoiceId),
    paymentUrl,
  };
  if (data?.PaymentId) {
    result.paymentId = String(data.PaymentId);
  }
  return result;
};

export const getPaymentStatus = async (key: string, keyType: "PaymentId" | "InvoiceId") => {
  if (!key) {
    throw AppError.badRequest("Payment key is required");
  }

  const data = await myFatoorahRequest<{
    InvoiceId?: number;
    InvoiceStatus?: string;
    CustomerReference?: string;
    InvoiceTransactions?: InvoiceTransaction[];
  }>({
    method: "POST",
    url: "/v2/GetPaymentStatus",
    data: {
      Key: key,
      KeyType: keyType,
    },
  });

  const transactions = data?.InvoiceTransactions ?? [];
  const first = transactions[0];
  const paymentId = first?.PaymentId ? String(first.PaymentId) : undefined;
  const transactionStatus = first?.TransactionStatus;

  return {
    invoiceId: data?.InvoiceId ? String(data.InvoiceId) : undefined,
    invoiceStatus: data?.InvoiceStatus,
    customerReference: data?.CustomerReference,
    paymentId,
    transactionStatus,
    raw: data,
  };
};
