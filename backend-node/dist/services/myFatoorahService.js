"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentStatus = exports.executePayment = exports.initiatePayment = void 0;
const env_1 = require("../config/env");
const errors_1 = require("../utils/errors");
const myFatoorahClient_1 = require("../utils/myFatoorahClient");
const normalizeMethods = (methods) => methods
    .map((method) => {
    const id = method.PaymentMethodId;
    if (!id)
        return null;
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
    .filter(Boolean);
const initiatePayment = async (amount, currency) => {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw errors_1.AppError.badRequest("InvoiceAmount must be greater than zero");
    }
    const data = await (0, myFatoorahClient_1.myFatoorahRequest)({
        method: "POST",
        url: "/v2/InitiatePayment",
        data: {
            InvoiceAmount: Number(amount.toFixed(2)),
            CurrencyIso: currency ?? env_1.config.myfatoorah.currency,
        },
    });
    const methods = data?.PaymentMethods ?? data?.paymentMethods ?? [];
    return normalizeMethods(methods);
};
exports.initiatePayment = initiatePayment;
const executePayment = async (payload) => {
    if (!payload.paymentMethodId) {
        throw errors_1.AppError.badRequest("PaymentMethodId is required");
    }
    if (!Number.isFinite(payload.invoiceValue) || payload.invoiceValue <= 0) {
        throw errors_1.AppError.badRequest("InvoiceValue must be greater than zero");
    }
    const data = await (0, myFatoorahClient_1.myFatoorahRequest)({
        method: "POST",
        url: "/v2/ExecutePayment",
        data: {
            PaymentMethodId: payload.paymentMethodId,
            InvoiceValue: Number(payload.invoiceValue.toFixed(2)),
            CallBackUrl: env_1.config.myfatoorah.callbackUrl,
            ErrorUrl: env_1.config.myfatoorah.errorUrl,
            CustomerName: payload.customerName,
            CustomerEmail: payload.customerEmail,
            CustomerMobile: payload.customerMobile,
            CustomerReference: payload.customerReference,
            Language: "AR",
            DisplayCurrencyIso: env_1.config.myfatoorah.currency,
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
        throw errors_1.AppError.badRequest("MyFatoorah payment response missing invoice data");
    }
    const result = {
        invoiceId: String(invoiceId),
        paymentUrl,
    };
    if (data?.PaymentId) {
        result.paymentId = String(data.PaymentId);
    }
    return result;
};
exports.executePayment = executePayment;
const getPaymentStatus = async (key, keyType) => {
    if (!key) {
        throw errors_1.AppError.badRequest("Payment key is required");
    }
    const data = await (0, myFatoorahClient_1.myFatoorahRequest)({
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
exports.getPaymentStatus = getPaymentStatus;
//# sourceMappingURL=myFatoorahService.js.map