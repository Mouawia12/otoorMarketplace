import { Router } from "express";

import { AppError } from "../utils/errors";
import { initiatePayment, getPaymentStatus } from "../services/myFatoorahService";
import { syncMyFatoorahPayment } from "../services/orderService";

const router = Router();

router.post("/myfatoorah/methods", async (req, res, next) => {
  try {
    const amountRaw = req.body?.amount ?? req.query?.amount;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) {
      throw AppError.badRequest("amount is required");
    }
    const currency =
      typeof req.body?.currency === "string" ? req.body.currency : undefined;

    const methods = await initiatePayment(amount, currency);
    res.json({ methods });
  } catch (error) {
    next(error);
  }
});

router.post("/myfatoorah/confirm", async (req, res, next) => {
  try {
    const paymentId =
      typeof req.body?.paymentId === "string"
        ? req.body.paymentId
        : typeof req.body?.payment_id === "string"
        ? req.body.payment_id
        : typeof req.body?.PaymentId === "string"
        ? req.body.PaymentId
        : typeof req.query?.paymentId === "string"
        ? req.query.paymentId
        : typeof req.query?.payment_id === "string"
        ? req.query.payment_id
        : typeof req.query?.PaymentId === "string"
        ? req.query.PaymentId
        : undefined;

    const invoiceId =
      typeof req.body?.invoiceId === "string"
        ? req.body.invoiceId
        : typeof req.body?.invoice_id === "string"
        ? req.body.invoice_id
        : typeof req.body?.InvoiceId === "string"
        ? req.body.InvoiceId
        : typeof req.query?.invoiceId === "string"
        ? req.query.invoiceId
        : typeof req.query?.invoice_id === "string"
        ? req.query.invoice_id
        : typeof req.query?.InvoiceId === "string"
        ? req.query.InvoiceId
        : undefined;

    if (!paymentId && !invoiceId) {
      throw AppError.badRequest("paymentId or invoiceId is required");
    }

    const key = paymentId ?? invoiceId!;
    const keyType = paymentId ? "PaymentId" : "InvoiceId";
    const status = await getPaymentStatus(String(key), keyType);

    const syncPayload: Parameters<typeof syncMyFatoorahPayment>[0] = {
      ...(status.paymentId || paymentId
        ? { paymentId: status.paymentId ?? paymentId }
        : {}),
      ...(status.invoiceId || invoiceId
        ? { invoiceId: status.invoiceId ?? invoiceId }
        : {}),
      ...(status.invoiceStatus ? { invoiceStatus: status.invoiceStatus } : {}),
      ...(status.transactionStatus
        ? { transactionStatus: status.transactionStatus }
        : {}),
      ...(status.customerReference
        ? { customerReference: status.customerReference }
        : {}),
      raw: status.raw,
    };

    const result = await syncMyFatoorahPayment(syncPayload);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
