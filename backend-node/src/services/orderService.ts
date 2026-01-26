import { Prisma, OrderStatus, type Coupon } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { normalizeProduct } from "./productService";
import { config } from "../config/env";
import { sendMail } from "../utils/mailer";
import {
  prepareCouponForOrder,
  prepareCouponsForOrder,
  finalizeCouponUsage,
  finalizeCouponsUsage,
} from "./couponService";
import {
  createOrder as createTorodOrder,
  shipOrder as shipTorodOrder,
  trackShipment as trackTorodShipment,
  listCourierPartners as listTorodCourierPartners,
  listOrderCourierPartners as listTorodOrderCourierPartners,
  type TorodOrderPayload,
} from "./torodService";
import { executePayment, type ExecutePaymentInput } from "./myFatoorahService";

const orderItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive().optional(),
});

const listOrdersSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).default(25).optional(),
  search: z.string().optional(),
  sellerId: z.coerce.number().optional(),
});

const checkoutPartnersSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1),
  customer_city_id: z.coerce.number().int().positive(),
  order_total: z.coerce.number().positive().optional(),
});

const normalizeShippingType = (value?: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "redbox" || normalized === "omni") {
    return "torod";
  }
  if (["standard", "express", "torod"].includes(normalized)) {
    return normalized as "standard" | "express" | "torod";
  }
  return undefined;
};

const normalizeTorodPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.startsWith("966")) {
    const rest = digits.slice(3).replace(/^0+/, "");
    return `966${rest}`;
  }
  const trimmed = digits.replace(/^0+/, "");
  return trimmed;
};

const normalizeMyFatoorahMobile = (value?: string | null) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("966")) {
    const rest = digits.slice(3);
    if (rest.length === 9) {
      return `0${rest}`;
    }
    if (rest.length >= 10 && rest.length <= 11) {
      return rest;
    }
    return rest.slice(0, 11);
  }
  if (digits.length === 9 && digits.startsWith("5")) {
    return `0${digits}`;
  }
  if (digits.length > 11) {
    return digits.slice(0, 11);
  }
  return digits;
};

const resolveProductWeightKg = (product: {
  weightKg?: Prisma.Decimal | number | null;
  sizeMl?: number | null;
}) => {
  const rawWeight =
    typeof product.weightKg === "number"
      ? product.weightKg
      : product.weightKg instanceof Prisma.Decimal
      ? product.weightKg.toNumber()
      : undefined;
  if (typeof rawWeight === "number" && Number.isFinite(rawWeight) && rawWeight > 0) {
    return rawWeight;
  }
  if (product.sizeMl && product.sizeMl > 0) {
    return product.sizeMl / 1000;
  }
  return 1;
};

const resolveSellerWarehouseCode = async (userId: number) => {
  const preferred = await prisma.sellerWarehouse.findFirst({
    where: { userId, isDefault: true },
    select: { warehouseCode: true },
  });
  if (preferred?.warehouseCode) {
    return preferred.warehouseCode;
  }
  const fallback = await prisma.sellerWarehouse.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { warehouseCode: true },
  });
  if (fallback?.warehouseCode) {
    return fallback.warehouseCode;
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { torodWarehouseId: true },
  });
  return profile?.torodWarehouseId ?? null;
};

const resolveSellerWarehouse = async (userId: number, warehouseIds: Set<number>) => {
  if (warehouseIds.size === 1) {
    const warehouseId = Array.from(warehouseIds)[0];
    if (warehouseId !== undefined) {
      const warehouse = await prisma.sellerWarehouse.findUnique({
        where: { id: warehouseId },
        select: { warehouseCode: true, cityId: true },
      });
      if (warehouse?.warehouseCode) {
        return warehouse;
      }
    }
  }

  const fallback = await prisma.sellerWarehouse.findFirst({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    select: { warehouseCode: true, cityId: true },
  });
  if (fallback?.warehouseCode) {
    return fallback;
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { torodWarehouseId: true },
  });
  if (!profile?.torodWarehouseId) {
    return null;
  }

  const byCode = await prisma.sellerWarehouse.findFirst({
    where: { userId, warehouseCode: profile.torodWarehouseId },
    select: { warehouseCode: true, cityId: true },
  });
  return byCode ?? { warehouseCode: profile.torodWarehouseId, cityId: null };
};

const resolveOrderWarehouseCode = async (
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>
) => {
  const sellerIds = new Set<number>();
  const warehouseIds = new Set<number>();

  order.items.forEach((item) => {
    const product = item.product;
    if (product?.sellerId) {
      sellerIds.add(product.sellerId);
    }
    if (product?.sellerWarehouseId) {
      warehouseIds.add(product.sellerWarehouseId);
    }
  });

  if (warehouseIds.size === 1) {
    const warehouseId = Array.from(warehouseIds)[0];
    if (warehouseId !== undefined) {
      const warehouse = await prisma.sellerWarehouse.findUnique({
        where: { id: warehouseId },
        select: { warehouseCode: true },
      });
      if (warehouse?.warehouseCode) {
        return warehouse.warehouseCode;
      }
    }
  }

  if (sellerIds.size === 1) {
    const sellerId = Array.from(sellerIds)[0];
    if (sellerId !== undefined) {
      return resolveSellerWarehouseCode(sellerId);
    }
  }

  return null;
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
};

const extractList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.result)) return data.result;
    if (data.data && typeof data.data === "object") {
      const nested = data.data as Record<string, unknown>;
      if (Array.isArray(nested.data)) return nested.data;
      if (Array.isArray(nested.items)) return nested.items;
    }
    if (Array.isArray(data.items)) return data.items;
  }
  return [];
};

const resolvePartnerId = (partner: Record<string, unknown>) => {
  const raw =
    partner.id ??
    partner.courier_id ??
    partner.partner_id ??
    partner.shipping_company_id ??
    partner.company_id ??
    partner.code;
  if (typeof raw === "string" || typeof raw === "number") {
    return String(raw);
  }
  return undefined;
};

const normalizeTorodPartners = (payload: unknown) => {
  const partners = extractList(payload);
  return partners
    .map((partner) => {
      if (!partner || typeof partner !== "object") return null;
      const record = partner as Record<string, unknown>;
      const id = resolvePartnerId(record);
      if (!id) return null;
      const { supportsCod, supportsPrepaid } = resolvePaymentSupport(record);
      return {
        id,
        name:
          record.title ??
          record.title_en ??
          record.company_name ??
          record.name ??
          record.method ??
          record.carrier_name ??
          record.service_name ??
          id,
        name_ar:
          record.title_arabic ??
          record.title_ar ??
          record.company_name_ar ??
          record.name_ar ??
          record.name_arabic ??
          null,
        rate:
          toNumber(record.rate) ??
          toNumber(record.total_amount) ??
          toNumber(record.amount) ??
          toNumber(record.price) ??
          toNumber(record.cost) ??
          null,
        currency:
          record.currency ??
          record.currency_code ??
          record.currency_iso ??
          null,
        eta:
          record.eta ??
          record.delivery_time ??
          record.estimated_days ??
          record.estimated_time ??
          null,
        cod_fee:
          toNumber(record.cod_fee) ??
          toNumber(record.cod_fee_amount) ??
          toNumber(record.cod_amount) ??
          null,
        supports_cod: supportsCod,
        supports_prepaid: supportsPrepaid,
        raw: record,
      };
    })
    .filter(Boolean);
};

const normalizeTokens = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).toLowerCase());
  }
  if (typeof value === "string") {
    return value
      .split(/[,\s/|]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const resolvePaymentSupport = (raw: Record<string, unknown>) => {
  const toBool = (value: unknown) =>
    typeof value === "boolean" ? value : value === "1" ? true : value === "0" ? false : undefined;
  const codKeys = ["cod_available", "cash_on_delivery", "supports_cod", "allow_cod", "is_cod"];
  const prepaidKeys = ["prepaid_available", "supports_prepaid", "allow_prepaid", "is_prepaid"];

  let supportsCod: boolean | undefined;
  let supportsPrepaid: boolean | undefined;

  for (const key of codKeys) {
    if (key in raw) {
      supportsCod = toBool(raw[key]);
      if (supportsCod !== undefined) break;
    }
  }

  for (const key of prepaidKeys) {
    if (key in raw) {
      supportsPrepaid = toBool(raw[key]);
      if (supportsPrepaid !== undefined) break;
    }
  }

  const tokens = normalizeTokens(
    raw.payment_methods ??
      raw.payment_method ??
      raw.payment_types ??
      raw.payment_type ??
      raw.supported_payment_methods ??
      raw.supported_payment_types
  );
  if (tokens.length > 0) {
    if (tokens.some((token) => ["cod", "cash", "cash_on_delivery"].includes(token))) {
      supportsCod = true;
    }
    if (tokens.some((token) => ["prepaid", "card", "online"].includes(token))) {
      supportsPrepaid = true;
    }
  }

  return { supportsCod, supportsPrepaid };
};

type InventoryIssueReason =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK";

type InventoryIssue = {
  productId: number;
  name: string;
  requestedQuantity: number;
  availableQuantity: number;
  reason: InventoryIssueReason;
};

const resolveProductName = (product: { nameAr: string | null; nameEn: string | null }, fallbackId: number) =>
  product.nameAr?.trim() || product.nameEn?.trim() || `#${fallbackId}`;

const buildInventoryIssue = (
  product: { id: number; nameAr: string | null; nameEn: string | null; stockQuantity: number; status: string },
  requestedQuantity: number
): InventoryIssue | null => {
  const name = resolveProductName(product, product.id);
  const availableQuantity = Math.max(0, product.stockQuantity ?? 0);

  if (product.status !== "PUBLISHED") {
    return {
      productId: product.id,
      name,
      requestedQuantity,
      availableQuantity,
      reason: "PRODUCT_UNAVAILABLE",
    };
  }

  if (availableQuantity <= 0) {
    return {
      productId: product.id,
      name,
      requestedQuantity,
      availableQuantity,
      reason: "OUT_OF_STOCK",
    };
  }

  if (availableQuantity < requestedQuantity) {
    return {
      productId: product.id,
      name,
      requestedQuantity,
      availableQuantity,
      reason: "INSUFFICIENT_STOCK",
    };
  }

  return null;
};

const assertInventoryOrThrow = (
  products: Array<{
    id: number;
    nameAr: string | null;
    nameEn: string | null;
    stockQuantity: number;
    status: string;
  }>,
  aggregatedItems: Array<{ productId: number; quantity: number }>
) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const issues: InventoryIssue[] = [];

  for (const item of aggregatedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      issues.push({
        productId: item.productId,
        name: `#${item.productId}`,
        requestedQuantity: item.quantity,
        availableQuantity: 0,
        reason: "PRODUCT_NOT_FOUND",
      });
      continue;
    }

    const issue = buildInventoryIssue(product, item.quantity);
    if (issue) {
      issues.push(issue);
    }
  }

  if (issues.length > 0) {
    throw AppError.badRequest("المخزون غير كافٍ لبعض المنتجات", {
      code: "INSUFFICIENT_STOCK",
      issues,
    });
  }
};

const shippingDetailsSchema = z.preprocess((value) => {
  if (value && typeof value === "object") {
    const shipping = value as Record<string, unknown>;
    const normalizedType =
      normalizeShippingType(shipping.type) ??
      normalizeShippingType(shipping.shipping_method) ??
      normalizeShippingType(shipping.shippingMethod);
    return {
      name: shipping.name,
      phone: shipping.phone,
      city: shipping.city,
      region: shipping.region ?? shipping.city,
      address: shipping.address,
      type: normalizedType ?? shipping.type,
      customerCityCode:
        shipping.customerCityCode ??
        shipping.customer_city_code ??
        shipping.city,
      customerCountry:
        shipping.customerCountry ?? shipping.customer_country ?? "SA",
      codAmount: shipping.codAmount ?? shipping.cod_amount,
      codCurrency: shipping.codCurrency ?? shipping.cod_currency,
      torodShippingCompanyId:
        toOptionalNumber(
          shipping.torodShippingCompanyId ??
            shipping.torod_shipping_company_id ??
            shipping.shippingCompanyId ??
            shipping.shipping_company_id
        ),
      torodWarehouseId:
        shipping.torodWarehouseId ??
        shipping.torod_warehouse_id ??
        shipping.warehouseId ??
        shipping.warehouse_id,
      torodCountryId:
        toOptionalNumber(
          shipping.torodCountryId ??
            shipping.torod_country_id ??
            shipping.countryId ??
            shipping.country_id
        ),
      torodRegionId:
        toOptionalNumber(
          shipping.torodRegionId ??
            shipping.torod_region_id ??
            shipping.regionId ??
            shipping.region_id
        ),
      torodCityId:
        toOptionalNumber(
          shipping.torodCityId ??
            shipping.torod_city_id ??
            shipping.cityId ??
            shipping.city_id
        ),
      torodDistrictId:
        toOptionalNumber(
          shipping.torodDistrictId ??
            shipping.torod_district_id ??
            shipping.districtId ??
            shipping.district_id
        ),
      torodMetadata:
        shipping.torodMetadata ?? shipping.torod_metadata ?? shipping.metadata,
      deferTorodShipment:
        shipping.deferTorodShipment ??
        shipping.defer_torod_shipment ??
        shipping.deferShipment ??
        shipping.defer_shipment,
    };
  }
  return value;
}, z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  city: z.string().min(2),
  region: z.string().min(2),
  address: z.string().min(3),
  type: z.enum(["standard", "express", "torod"]).default("standard"),
  customerCityCode: z.string().optional(),
  customerCountry: z.string().default("SA"),
  codAmount: z.coerce.number().nonnegative().optional(),
  codCurrency: z.string().default("SAR"),
  torodShippingCompanyId: z.coerce.number().int().positive().optional(),
  torodWarehouseId: z.string().optional(),
  torodCountryId: z.coerce.number().int().positive().optional(),
  torodRegionId: z.coerce.number().int().positive().optional(),
  torodCityId: z.coerce.number().int().positive().optional(),
  torodDistrictId: z.coerce.number().int().positive().optional(),
  torodMetadata: z.record(z.string(), z.unknown()).optional(),
  deferTorodShipment: z.coerce.boolean().optional(),
}));

const createOrderSchema = z.object({
  buyerId: z.number().int().positive(),
  paymentMethod: z.string().min(2),
  paymentMethodId: z.coerce.number().int().optional(),
  paymentMethodCode: z.string().min(1).optional(),
  language: z.enum(["ar", "en"]).optional(),
  shipping: shippingDetailsSchema.optional(),
  items: z.array(orderItemSchema).min(1),
  couponCode: z.string().min(3).optional(),
  couponCodes: z.array(z.string().min(3)).max(5).optional(),
});

const orderEmailInclude = Prisma.validator<Prisma.OrderInclude>()({
  buyer: {
    select: {
      email: true,
      fullName: true,
    },
  },
  items: {
    include: {
      product: {
        include: {
          images: {
            orderBy: { sortOrder: "asc" as const },
          },
          seller: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
    },
  },
});

type SupportedLang = "ar" | "en";

const normalizeLanguage = (value?: string | null): SupportedLang =>
  value?.toLowerCase() === "en" ? "en" : "ar";

const resolveAppBaseUrl = () => {
  try {
    return new URL(config.auth.emailVerificationUrl).origin;
  } catch {
    return config.assetBaseUrl;
  }
};

const formatMoney = (value: Prisma.Decimal | number | string) => {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number(value);
  if (!Number.isFinite(numeric)) return "0.00";
  return numeric.toFixed(2);
};

const resolveOrderEmailProductName = (
  product: { nameAr?: string | null; nameEn?: string | null } | null,
  lang: SupportedLang,
) => {
  if (lang === "en") {
    return product?.nameEn?.trim() || product?.nameAr?.trim() || "Product";
  }
  return product?.nameAr?.trim() || product?.nameEn?.trim() || "منتج";
};

const sendOrderPlacedEmail = async (orderId: number, context: { paid: boolean }) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderEmailInclude,
  });

  if (!order?.buyer?.email) {
    return;
  }

  const lang = normalizeLanguage(order.language);
  const isEn = lang === "en";
  const brandSignature = config.mail.from.name || (isEn ? "FragraWorld" : "FragraWorld | عالم العطور");
  const supportEmail = config.support.email;
  const appBaseUrl = resolveAppBaseUrl();
  const ordersUrl = `${appBaseUrl}/account/orders`;
  const sellerOrdersUrl = `${appBaseUrl}/seller/orders`;
  const orderNumber = `#${order.id}`;
  const buyerName = order.buyer.fullName || (isEn ? "Valued customer" : "عميلنا العزيز");
  const totalAmount = formatMoney(order.totalAmount);
  const shippingFee = formatMoney(order.shippingFee);
  const discountAmount = formatMoney(order.discountAmount);
  const subtotalAmount = formatMoney(order.subtotalAmount);
  const createdAt = new Date(order.createdAt).toLocaleString(isEn ? "en-US" : "ar-SA");

  const paymentMethodLabel = (() => {
    const method = order.paymentMethod.toLowerCase();
    if (method.includes("myfatoorah")) {
      return isEn ? "Online payment (MyFatoorah)" : "دفع إلكتروني (ماي فاتورة)";
    }
    if (method.includes("cod")) {
      return isEn ? "Cash on delivery" : "الدفع عند الاستلام";
    }
    return order.paymentMethod;
  })();

  const paymentStatusLabel = context.paid
    ? isEn
      ? "Payment confirmed"
      : "تم تأكيد الدفع"
    : isEn
    ? "Awaiting confirmation"
    : "بانتظار التأكيد";

  const paymentLine = context.paid
    ? isEn
      ? "Your payment has been confirmed and we have already started preparing your order."
      : "تم تأكيد الدفع بنجاح، وبدأنا تجهيز طلبك مباشرة."
    : isEn
    ? "Your order is now in the queue. We will keep you posted at every step."
    : "طلبك قيد التأكيد الآن، وسنوافيك بالتحديثات خطوة بخطوة.";

  const itemsHtml = order.items
    .map((item) => {
      const name = resolveOrderEmailProductName(item.product, lang);
      const quantity = item.quantity;
      const lineTotal = formatMoney(item.totalPrice);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1ece3;font-weight:600;color:#2c2a29;">${name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1ece3;text-align:center;color:#5b534b;">${quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1ece3;text-align:end;font-weight:700;color:#2c2a29;">${lineTotal} ${isEn ? "SAR" : "ر.س"}</td>
        </tr>
      `;
    })
    .join("");

  const itemsText = order.items
    .map((item) => {
      const name = resolveOrderEmailProductName(item.product, lang);
      return `- ${name} × ${item.quantity}: ${formatMoney(item.totalPrice)} ${isEn ? "SAR" : "ر.س"}`;
    })
    .join("\n");

  const shippingSummary = `${order.shippingName} — ${order.shippingPhone}\n${order.shippingCity} / ${order.shippingRegion}\n${order.shippingAddress}`;

  const plainText = [
    isEn ? `Hello ${buyerName},` : `مرحباً ${buyerName}،`,
    "",
    isEn
      ? `Your order has been received successfully (${orderNumber}).`
      : `تم استلام طلبك بنجاح (${orderNumber}).`,
    paymentLine,
    "",
    isEn ? "Order details:" : "تفاصيل الطلب:",
    `${isEn ? "Order number" : "رقم الطلب"}: ${orderNumber}`,
    `${isEn ? "Date" : "التاريخ"}: ${createdAt}`,
    `${isEn ? "Payment method" : "طريقة الدفع"}: ${paymentMethodLabel}`,
    `${isEn ? "Payment status" : "حالة الدفع"}: ${paymentStatusLabel}`,
    "",
    isEn ? "Shipping address:" : "عنوان الشحن:",
    shippingSummary,
    "",
    isEn ? "Items:" : "المنتجات:",
    itemsText,
    "",
    `${isEn ? "Subtotal" : "الإجمالي الفرعي"}: ${subtotalAmount} ${isEn ? "SAR" : "ر.س"}`,
    `${isEn ? "Discount" : "الخصم"}: ${discountAmount} ${isEn ? "SAR" : "ر.س"}`,
    `${isEn ? "Shipping" : "الشحن"}: ${shippingFee} ${isEn ? "SAR" : "ر.س"}`,
    `${isEn ? "Total" : "الإجمالي"}: ${totalAmount} ${isEn ? "SAR" : "ر.س"}`,
    "",
    isEn ? `Track your order: ${ordersUrl}` : `يمكنك متابعة طلبك من هنا: ${ordersUrl}`,
    isEn
      ? `Need help? Reach us at ${supportEmail}`
      : `لأي استفسار، يسعدنا خدمتك عبر ${supportEmail}`,
    "",
    brandSignature,
  ].join("\n");

  const headline = isEn ? "Your Order Is Confirmed" : "تم استلام طلبك بنجاح";
  const marketingTitle = isEn ? "Why this order is special" : "لماذا هذا الطلب مميز؟";
  const marketingBody = isEn
    ? "You picked premium selections. We are preparing them with luxury packaging and extra care."
    : "اخترت عطوراً منتقاة بعناية، ونحن الآن نجهزها لك بأفضل تغليف وتجربة فاخرة تليق بذوقك.";
  const trackCta = isEn ? "Track Your Order" : "تتبّع طلبك الآن";
  const readyLine = isEn
    ? "We are preparing your order carefully. Shipping updates will arrive shortly."
    : "نجهّز طلبك بعناية، وخلال وقت قصير يصلك إشعار الشحن ✈️";
  const helpLine = isEn ? "Need help?" : "لأي مساعدة:";

  const htmlDir = isEn ? "ltr" : "rtl";
  const htmlAlign = isEn ? "left" : "right";

  const html = `
    <div style="background:#f7f4ef;padding:32px 16px;font-family:'Cairo','Inter','Segoe UI',sans-serif;direction:${htmlDir};text-align:center;color:#2c2a29;">
      <table role="presentation" style="margin:0 auto;max-width:660px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.04);">
        <tr>
          <td style="padding:28px 28px 12px;background:linear-gradient(135deg,#111 0%,#2b2b2b 100%);color:#f8f5ef;">
            <div style="font-size:13px;letter-spacing:.6px;opacity:.85;margin-bottom:6px;">${brandSignature}</div>
            <div style="font-size:26px;font-weight:800;margin:0;">${headline}</div>
            <div style="margin-top:6px;font-size:14px;opacity:.9;">${orderNumber}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px 8px;text-align:${htmlAlign};">
            <p style="margin:0 0 8px;font-size:16px;line-height:1.9;color:#3a342f;">${isEn ? "Hello" : "مرحباً"} ${buyerName} ✨</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.9;color:#4d463f;">
              ${paymentLine}
            </p>

            <div style="margin:12px 0 16px;border:1px solid #f1ece3;border-radius:14px;padding:12px 14px;background:#fcfaf6;">
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Order number" : "رقم الطلب"}</span>
                <strong style="color:#2c2a29;">${orderNumber}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Date" : "التاريخ"}</span>
                <strong style="color:#2c2a29;">${createdAt}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Payment method" : "طريقة الدفع"}</span>
                <strong style="color:#2c2a29;">${paymentMethodLabel}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Payment status" : "حالة الدفع"}</span>
                <strong style="color:#2c2a29;">${paymentStatusLabel}</strong>
              </div>
            </div>

            <div style="margin:16px 0 12px;padding:14px 16px;border-radius:14px;background:#f8f3ea;border:1px solid #f0e6d7;">
              <div style="font-weight:800;font-size:15px;margin-bottom:8px;">${marketingTitle}</div>
              <div style="font-size:14px;line-height:1.9;color:#5a524a;">
                ${marketingBody}
              </div>
            </div>

            <div style="margin-top:18px;border:1px solid #f1ece3;border-radius:16px;overflow:hidden;">
              <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#fbf7f0;color:#5b534b;">
                    <th style="padding:10px 12px;text-align:${htmlAlign};font-weight:700;">${isEn ? "Item" : "المنتج"}</th>
                    <th style="padding:10px 12px;text-align:center;font-weight:700;">${isEn ? "Qty" : "الكمية"}</th>
                    <th style="padding:10px 12px;text-align:end;font-weight:700;">${isEn ? "Total" : "الإجمالي"}</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div style="margin-top:16px;border-radius:14px;background:#fcfaf6;border:1px solid #f1ece3;padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Subtotal" : "الإجمالي الفرعي"}</span>
                <strong style="color:#2c2a29;">${subtotalAmount} ${isEn ? "SAR" : "ر.س"}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Discount" : "الخصم"}</span>
                <strong style="color:#2c2a29;">${discountAmount} ${isEn ? "SAR" : "ر.س"}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:14px;margin:4px 0;color:#5b534b;">
                <span>${isEn ? "Shipping" : "الشحن"}</span>
                <strong style="color:#2c2a29;">${shippingFee} ${isEn ? "SAR" : "ر.س"}</strong>
              </div>
              <div style="height:1px;background:#eee4d6;margin:8px 0;"></div>
              <div style="display:flex;justify-content:space-between;font-size:16px;margin:6px 0;color:#2c2a29;">
                <span style="font-weight:800;">${isEn ? "Total" : "الإجمالي"}</span>
                <span style="font-weight:900;">${totalAmount} ${isEn ? "SAR" : "ر.س"}</span>
              </div>
            </div>

            <div style="margin:16px 0 10px;border:1px solid #f1ece3;border-radius:14px;padding:12px 14px;background:#fff;">
              <div style="font-weight:800;font-size:14px;margin-bottom:6px;">${isEn ? "Shipping address" : "عنوان الشحن"}</div>
              <div style="font-size:13.5px;line-height:1.9;color:#4d463f;white-space:pre-line;">${shippingSummary}</div>
            </div>

            <div style="margin:24px 0 18px;text-align:center;">
              <a href="${ordersUrl}" style="display:inline-block;padding:14px 24px;background:#caa56a;color:#2c2a29;font-weight:800;text-decoration:none;border-radius:999px;box-shadow:0 10px 24px rgba(202,165,106,0.35);">
                ${trackCta}
              </a>
            </div>

            <p style="margin:0 0 6px;font-size:13px;line-height:1.8;color:#6a635b;text-align:center;">
              ${readyLine}
            </p>
            <p style="margin:0;font-size:13px;line-height:1.8;color:#6a635b;text-align:center;">
              ${helpLine} <a href="mailto:${supportEmail}" style="color:#a67c52;font-weight:700;text-decoration:none;">${supportEmail}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f2e9dc;padding:14px 20px;text-align:center;font-size:12.5px;color:#655b50;">
            ${isEn ? "Thank you for your trust — Team" : "شكرًا لثقتك — فريق"} ${brandSignature}
          </td>
        </tr>
      </table>
    </div>
  `;

  await sendMail({
    to: order.buyer.email,
    subject: isEn ? `Order received successfully ${orderNumber}` : `تم استلام طلبك بنجاح ${orderNumber}`,
    html,
    text: plainText,
  });

  const sellersMap = new Map<
    number,
    { sellerId: number; email: string; name: string; items: typeof order.items }
  >();

  for (const item of order.items) {
    const seller = item.product?.seller;
    const sellerId = item.product?.sellerId;
    if (!seller || !sellerId || !seller.email) continue;
    const existing = sellersMap.get(sellerId);
    if (existing) {
      existing.items.push(item);
    } else {
      sellersMap.set(sellerId, {
        sellerId,
        email: seller.email,
        name: seller.fullName || (isEn ? "Seller" : "البائع"),
        items: [item],
      });
    }
  }

  for (const sellerEntry of sellersMap.values()) {
    const sellerItemsHtml = sellerEntry.items
      .map((item) => {
        const name = resolveOrderEmailProductName(item.product, lang);
        return `
          <tr>
            <td style="padding:8px 10px;border-bottom:1px solid #f1ece3;">${name}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #f1ece3;text-align:center;">${item.quantity}</td>
          </tr>
        `;
      })
      .join("");

    const sellerItemsText = sellerEntry.items
      .map((item) => `- ${resolveOrderEmailProductName(item.product, lang)} × ${item.quantity}`)
      .join("\n");

    const sellerSubject = isEn
      ? `New order received ${orderNumber}`
      : `لديك طلب جديد ${orderNumber}`;

    const sellerPlainText = [
      isEn ? `Hello ${sellerEntry.name},` : `مرحباً ${sellerEntry.name}،`,
      "",
      isEn
        ? `You have received a new order (${orderNumber}).`
        : `لديك طلب جديد (${orderNumber}).`,
      "",
      isEn ? "Buyer info:" : "معلومات العميل:",
      `${order.shippingName} — ${order.shippingPhone}`,
      `${order.shippingCity} / ${order.shippingRegion}`,
      order.shippingAddress,
      "",
      isEn ? "Payment:" : "الدفع:",
      `${paymentMethodLabel} — ${paymentStatusLabel}`,
      "",
      isEn ? "Items for you:" : "المنتجات الخاصة بك:",
      sellerItemsText,
      "",
      isEn ? `Manage orders: ${sellerOrdersUrl}` : `إدارة الطلبات: ${sellerOrdersUrl}`,
    ].join("\n");

    const sellerHtml = `
      <div style="background:#f7f4ef;padding:28px 14px;font-family:'Cairo','Inter','Segoe UI',sans-serif;direction:${htmlDir};text-align:center;color:#2c2a29;">
        <table role="presentation" style="margin:0 auto;max-width:620px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 14px 36px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:22px 24px 10px;background:#111;color:#f8f5ef;">
              <div style="font-size:13px;opacity:.9;">${brandSignature}</div>
              <div style="font-size:22px;font-weight:800;margin-top:4px;">
                ${isEn ? "New order received" : "لديك طلب جديد"}
              </div>
              <div style="margin-top:4px;font-size:13px;opacity:.9;">${orderNumber}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;text-align:${htmlAlign};">
              <div style="margin-bottom:10px;font-weight:700;">${isEn ? "Buyer information" : "معلومات العميل"}</div>
              <div style="font-size:14px;line-height:1.9;color:#4d463f;white-space:pre-line;margin-bottom:12px;">
                ${order.shippingName} — ${order.shippingPhone}
                <br />${order.shippingCity} / ${order.shippingRegion}
                <br />${order.shippingAddress}
              </div>

              <div style="margin:12px 0;border:1px solid #f1ece3;border-radius:12px;overflow:hidden;">
                <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
                  <thead>
                    <tr style="background:#fbf7f0;color:#5b534b;">
                      <th style="padding:8px 10px;text-align:${htmlAlign};">${isEn ? "Item" : "المنتج"}</th>
                      <th style="padding:8px 10px;text-align:center;">${isEn ? "Qty" : "الكمية"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sellerItemsHtml}
                  </tbody>
                </table>
              </div>

              <div style="font-size:13.5px;color:#5b534b;margin:8px 0;">
                ${isEn ? "Payment" : "الدفع"}: <strong style="color:#2c2a29;">${paymentMethodLabel} — ${paymentStatusLabel}</strong>
              </div>

              <div style="margin-top:16px;text-align:center;">
                <a href="${sellerOrdersUrl}" style="display:inline-block;padding:12px 20px;background:#caa56a;color:#2c2a29;font-weight:800;text-decoration:none;border-radius:999px;">
                  ${isEn ? "Open seller orders" : "فتح طلبات البائع"}
                </a>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    void sendMail({
      to: sellerEntry.email,
      subject: sellerSubject,
      html: sellerHtml,
      text: sellerPlainText,
    }).catch((error) => {
      console.error("Failed to send seller order email", {
        orderId: order.id,
        sellerId: sellerEntry.sellerId,
        error,
      });
    });
  }
};

export const createOrder = async (input: z.infer<typeof createOrderSchema>) => {
  const data = createOrderSchema.parse(input);
  if (!data.shipping) {
    throw AppError.badRequest("Shipping details are required");
  }

  const itemMap = new Map<number, { productId: number; quantity: number }>();
  for (const item of data.items) {
    const existing = itemMap.get(item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      itemMap.set(item.productId, {
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  const aggregatedItems = Array.from(itemMap.values());
  if (aggregatedItems.length === 0) {
    throw AppError.badRequest("Order items are required");
  }

  const shipping = data.shipping;
  const orderLanguage = normalizeLanguage(data.language);
  const normalizedPaymentMethod = data.paymentMethod.trim().toLowerCase();
  if (normalizedPaymentMethod === "cod") {
    throw AppError.badRequest("Cash on delivery is disabled");
  }
  const isCodPayment = normalizedPaymentMethod === "cod";
  const isMyFatoorahPayment = normalizedPaymentMethod === "myfatoorah";
  const paymentMethodId = data.paymentMethodId;
  const shippingMethod = normalizeShippingType(shipping.type) ?? "standard";
  const requiresTorodShipment = shippingMethod === "torod";
  const deferTorodShipment = requiresTorodShipment
    ? shipping.deferTorodShipment ??
      !(shipping.torodShippingCompanyId && shipping.torodShippingCompanyId > 0)
    : false;
  const shippingOption = shippingMethod === "express" ? "express" : "standard";

  if (requiresTorodShipment) {
    if (!shipping.torodCountryId) {
      throw AppError.badRequest("Torod country is required");
    }
    if (!shipping.torodRegionId) {
      throw AppError.badRequest("Torod region is required");
    }
    if (!shipping.torodCityId) {
      throw AppError.badRequest("Torod city is required");
    }
    if (!deferTorodShipment && !shipping.torodShippingCompanyId) {
      throw new AppError("لا توجد شركة شحن متاحة لهذه المدينة", 422);
    }
  }
  const shippingFeeValue =
    shippingOption === "express"
      ? config.shipping.express
      : config.shipping.standard;

  // validate products and stock
  const products = await prisma.product.findMany({
    where: {
      id: { in: aggregatedItems.map((item) => item.productId) },
    },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      stockQuantity: true,
      status: true,
      basePrice: true,
      sizeMl: true,
      weightKg: true,
      sellerId: true,
      sellerWarehouseId: true,
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const sellerIds = new Set<number>();
  products.forEach((product) => sellerIds.add(product.sellerId));

  assertInventoryOrThrow(products, aggregatedItems);

  const subtotal = aggregatedItems.reduce((total, item) => {
    const product = productMap.get(item.productId)!;
    return total + product.basePrice.toNumber() * item.quantity;
  }, 0);

  if (subtotal <= 0) {
    throw AppError.badRequest("Order subtotal must be greater than zero");
  }

  const normalizedItems = aggregatedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    const basePriceNumber = product.basePrice.toNumber();
    const unitPrice = new Prisma.Decimal(basePriceNumber);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice.mul(item.quantity),
    };
  });

  const couponLines = aggregatedItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: item.productId,
      quantity: item.quantity,
      sellerId: product.sellerId,
      unitPrice: product.basePrice.toNumber(),
    };
  });

  let appliedCoupon: { coupon: Coupon; discountAmount: number } | null = null;
  let appliedCoupons: Array<{ coupon: Coupon; discountAmount: number }> = [];
  let appliedCouponCodes: string[] = [];

  if (data.couponCodes && data.couponCodes.length > 0) {
    const prepared = await prisma.$transaction((tx) =>
      prepareCouponsForOrder(tx, data.couponCodes!, couponLines)
    );
    appliedCoupons = prepared.coupons.map((entry) => ({
      coupon: entry.coupon,
      discountAmount: entry.discountAmount,
    }));
    appliedCouponCodes = appliedCoupons.map((entry) => entry.coupon.code);
  } else if (data.couponCode) {
    appliedCoupon = await prisma.$transaction((tx) =>
      prepareCouponForOrder(tx, data.couponCode!, couponLines)
    );
    if (appliedCoupon) {
      appliedCoupons = [appliedCoupon];
      appliedCouponCodes = [appliedCoupon.coupon.code];
    }
  }

  const discountAmount = appliedCoupons.reduce(
    (total, entry) => total + entry.discountAmount,
    0
  );
  const totalBeforeShipping = Math.max(0, subtotal - discountAmount);
  const totalAmount = totalBeforeShipping + shippingFeeValue;
  const platformFee =
    totalAmount * config.platformCommissionRate;
  const shouldRecordCod = shipping.codAmount !== undefined || isCodPayment;
  const codAmount =
    shipping.codAmount !== undefined
      ? shipping.codAmount
      : shouldRecordCod
      ? totalAmount
      : undefined;
  const codCurrency = shipping.codCurrency ?? "SAR";
  const customerCityCode = shipping.customerCityCode ?? shipping.city;
  const customerCountry = shipping.customerCountry ?? "SA";
  const torodShippingCompanyId = shipping.torodShippingCompanyId;
  let torodWarehouseId = shipping.torodWarehouseId;
  const torodCountryId = shipping.torodCountryId;
  const torodRegionId = shipping.torodRegionId;
  const torodCityId = shipping.torodCityId;
  const torodDistrictId = shipping.torodDistrictId;
  const torodMetadata = shipping.torodMetadata;

  if (requiresTorodShipment && !deferTorodShipment && !torodWarehouseId) {
    const warehouseIds = new Set(
      products
        .map((product) => product.sellerWarehouseId)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    );
    if (warehouseIds.size === 1) {
      const warehouseId = Array.from(warehouseIds)[0];
      if (warehouseId !== undefined) {
        const warehouse = await prisma.sellerWarehouse.findUnique({
          where: { id: warehouseId },
          select: { warehouseCode: true },
        });
        if (warehouse?.warehouseCode) {
          torodWarehouseId = warehouse.warehouseCode;
        }
      }
    }
  }

  if (requiresTorodShipment && !deferTorodShipment && !torodWarehouseId) {
    if (sellerIds.size !== 1) {
      throw new AppError("Warehouse is required for Torod shipping", 422);
    }
    const sellerId = Array.from(sellerIds)[0];
    if (sellerId === undefined) {
      throw new AppError("Warehouse is required for Torod shipping", 422);
    }
    const sellerWarehouse = await prisma.sellerWarehouse.findFirst({
      where: { userId: sellerId, isDefault: true },
      select: { warehouseCode: true },
    });
    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
      select: { torodWarehouseId: true },
    });
    torodWarehouseId =
      sellerWarehouse?.warehouseCode ?? sellerProfile?.torodWarehouseId ?? undefined;
    if (!torodWarehouseId) {
      throw new AppError("Warehouse is required for Torod shipping", 422);
    }
  }

  if (
    requiresTorodShipment &&
    !deferTorodShipment &&
    torodCityId &&
    torodShippingCompanyId
  ) {
    const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = normalizedItems.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      const weight = product ? resolveProductWeightKg(product) : 1;
      return sum + weight * item.quantity;
    }, 0);
    const partnersResponse = await listTorodCourierPartners({
      shipper_city_id: torodCityId,
      customer_city_id: torodCityId,
      payment: isCodPayment ? "coo" : "Prepaid",
      weight: totalWeight,
      order_total: totalAmount,
      no_of_box: Math.max(1, totalQuantity),
      type: "normal",
      filter_by: "cheapest",
      ...(torodWarehouseId ? { warehouse: torodWarehouseId } : {}),
    });
    const partners = extractList(partnersResponse);
    const matched = partners.find((partner) => {
      if (!partner || typeof partner !== "object") return false;
      const partnerId = resolvePartnerId(partner as Record<string, unknown>);
      return partnerId === String(torodShippingCompanyId);
    });

    if (!matched || typeof matched !== "object") {
      throw AppError.badRequest("Shipping company is not available for the selected city");
    }

    const partnerRaw = matched as Record<string, unknown>;
    const { supportsCod, supportsPrepaid } = resolvePaymentSupport(partnerRaw);
    if (isCodPayment && supportsCod === false) {
      throw AppError.badRequest("Selected shipping company does not support COD");
    }
    if (!isCodPayment && supportsPrepaid === false) {
      throw AppError.badRequest("Selected shipping company does not support prepaid");
    }

    const minAmount =
      toNumber(partnerRaw.min_cod_amount) ??
      toNumber(partnerRaw.min_prepaid_amount) ??
      toNumber(partnerRaw.min_order_amount) ??
      toNumber(partnerRaw.min_order_value) ??
      toNumber(partnerRaw.min_amount) ??
      toNumber(partnerRaw.min_value);
    const maxAmount =
      toNumber(partnerRaw.max_cod_amount) ??
      toNumber(partnerRaw.max_prepaid_amount) ??
      toNumber(partnerRaw.max_order_amount) ??
      toNumber(partnerRaw.max_order_value) ??
      toNumber(partnerRaw.max_amount) ??
      toNumber(partnerRaw.max_value);

    if (minAmount !== undefined && totalAmount < minAmount) {
      throw AppError.badRequest("Order total is below the shipping company minimum");
    }
    if (maxAmount !== undefined && totalAmount > maxAmount) {
      throw AppError.badRequest("Order total exceeds the shipping company maximum");
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const latestProducts = await tx.product.findMany({
      where: {
        id: { in: aggregatedItems.map((item) => item.productId) },
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        stockQuantity: true,
        status: true,
      },
    });
    assertInventoryOrThrow(latestProducts, aggregatedItems);

    const created = await tx.order.create({
      data: {
        buyerId: data.buyerId,
        status: OrderStatus.PENDING,
        paymentMethod: data.paymentMethod,
        language: orderLanguage,
        myfatoorahMethodId: isMyFatoorahPayment ? paymentMethodId ?? null : null,
        myfatoorahMethodCode: isMyFatoorahPayment
          ? data.paymentMethodCode ?? null
          : null,
        shippingMethod,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingCity: shipping.city,
        shippingRegion: shipping.region,
        shippingAddress: shipping.address,
        customerCityCode,
        customerCountry,
        subtotalAmount: new Prisma.Decimal(subtotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        shippingFee: new Prisma.Decimal(shippingFeeValue),
        totalAmount: new Prisma.Decimal(totalAmount),
        platformFee: new Prisma.Decimal(platformFee),
        couponId:
          appliedCoupon && appliedCoupons.length === 1
            ? appliedCoupon.coupon.id
            : null,
        couponCode:
          appliedCouponCodes.length > 0 ? appliedCouponCodes.join(",") : null,
        codAmount:
          codAmount !== undefined
            ? new Prisma.Decimal(codAmount)
            : null,
        codCurrency: codAmount !== undefined ? codCurrency : null,
        redboxPointId: null,
        redboxStatus: requiresTorodShipment ? "pending" : null,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: true,
      },
    });

    for (const item of normalizedItems) {
      const updateResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          stockQuantity: { gte: item.quantity },
          status: "PUBLISHED",
        },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
      if (updateResult.count === 0) {
        const latest = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            stockQuantity: true,
            status: true,
          },
        });
        if (latest) {
          assertInventoryOrThrow([latest], [
            { productId: latest.id, quantity: item.quantity },
          ]);
        }
        throw AppError.badRequest("المخزون غير كافٍ لبعض المنتجات", {
          code: "INSUFFICIENT_STOCK",
        });
      }
    }

    return created;
  });

  let shipment;
  let torodOrder;
  if (requiresTorodShipment) {
    try {
      const baseMetadata = {
        orderId: order.id,
        buyerId: data.buyerId,
      };
      const metadata =
        torodMetadata && typeof torodMetadata === "object"
          ? { ...baseMetadata, ...(torodMetadata as Record<string, unknown>) }
          : baseMetadata;

      const torodAddressType = "address_city";
      const buyer = await prisma.user.findUnique({
        where: { id: data.buyerId },
        select: { fullName: true, email: true, phone: true },
      });
      if (!buyer?.email) {
        throw AppError.badRequest("Customer email is required");
      }
      const buyerName = shipping.name?.trim() || buyer.fullName?.trim() || "";
      const buyerPhone = buyer.phone?.trim() || shipping.phone;
      const torodPhone = normalizeTorodPhone(buyerPhone);
      if (!torodPhone) {
        throw AppError.badRequest("Customer phone number is required");
      }

      const totalQuantity = normalizedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalWeight = normalizedItems.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        const weight = product ? resolveProductWeightKg(product) : 1;
        return sum + weight * item.quantity;
      }, 0);
      const torodOrderPayload: TorodOrderPayload = {
        reference: `order-${order.id}`,
        name: buyerName || shipping.name,
        email: buyer.email,
        phone_number: torodPhone,
        customer_name: buyerName || shipping.name,
        customer_phone: torodPhone,
        customer_address: shipping.address,
        customer_city: shipping.city,
        customer_region: shipping.region,
        customer_country: customerCountry,
        type: torodAddressType,
        country_id: torodCountryId,
        region_id: torodRegionId,
        city_id: torodCityId,
        address: shipping.address,
        payment: isCodPayment ? "coo" : "Prepaid",
        payment_method: isCodPayment ? "COD" : "Prepaid",
        order_total: totalAmount,
        weight: totalWeight > 0 ? totalWeight : 1,
        no_of_box: totalQuantity > 0 ? totalQuantity : 1,
        cod_amount: codAmount ?? 0,
        cod_currency: codCurrency,
        metadata,
        item_description: normalizedItems
          .map((item) => {
            const product = productMap.get(item.productId);
            const name = product?.nameEn ?? product?.nameAr ?? `Item-${item.productId}`;
            return `${name} x${item.quantity}`;
          })
          .join(", "),
        items: normalizedItems.map((item) => {
          const product = productMap.get(item.productId);
          const weight = product ? resolveProductWeightKg(product) : 1;
          if (weight <= 0) {
            throw AppError.badRequest("Item weight must be greater than zero");
          }
          return {
            name: `Item-${item.productId}`,
            quantity: item.quantity,
            price: Number(item.unitPrice),
            weight,
            sku: String(item.productId),
          };
        }),
      };

      console.log("TOROD ORDER CREATE PAYLOAD:", torodOrderPayload);
      torodOrder = await createTorodOrder(torodOrderPayload);

      if (!deferTorodShipment) {
        const shipmentPayload: Record<string, unknown> = {};
        if (torodShippingCompanyId) {
          shipmentPayload.shipping_company_id = torodShippingCompanyId;
          shipmentPayload.courier_partner_id = Number(torodShippingCompanyId);
          shipmentPayload.type = "normal";
        }
        if (torodWarehouseId) {
          shipmentPayload.warehouse_id = torodWarehouseId;
          shipmentPayload.warehouse = torodWarehouseId;
        }

        console.log("TOROD SHIP ORDER PAYLOAD:", {
          orderId: torodOrder.id,
          payload: Object.keys(shipmentPayload).length > 0 ? shipmentPayload : undefined,
        });
        shipment = await shipTorodOrder(
          torodOrder.id,
          Object.keys(shipmentPayload).length > 0 ? shipmentPayload : undefined
        );
      } else {
        console.log("TOROD SHIP ORDER SKIPPED:", {
          orderId: torodOrder.id,
          reason: "deferred",
        });
      }
    } catch (error) {
      const responsePayload =
        (error as { response?: { data?: unknown } })?.response?.data;
      if (responsePayload) {
        console.error("TOROD ORDER ERROR RESPONSE:", responsePayload);
      }
      if (error instanceof AppError && error.details) {
        console.error("TOROD ORDER ERROR DETAILS:", error.details);
      }
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, redboxStatus: "failed" },
        });
        for (const item of normalizedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      });
      const resolvedMessage =
        error instanceof AppError
          ? error.message
          : (error as { response?: { data?: { message?: string; error?: string } } })
              ?.response?.data?.message ||
            (error as { response?: { data?: { message?: string; error?: string } } })
              ?.response?.data?.error ||
            (error as { message?: string })?.message;
      if (error instanceof AppError) {
        throw new AppError(
          error.message,
          error.statusCode,
          error.details ?? error
        );
      }
      throw AppError.internal(
        resolvedMessage ||
          "تعذر إنشاء الشحنة مع شركة التوصيل، حاول مرة أخرى أو اختر طريقة شحن أخرى.",
        error
      );
    }
  }

  if (appliedCoupons.length > 0) {
    await prisma.$transaction((tx) =>
      finalizeCouponsUsage(
        tx,
        appliedCoupons.map((entry) => entry.coupon)
      )
    );
  }

  let paymentUrl: string | null = null;
  if (isMyFatoorahPayment) {
    if (!paymentMethodId) {
      throw AppError.badRequest("payment_method_id is required");
    }
    const buyer = await prisma.user.findUnique({
      where: { id: data.buyerId },
      select: { fullName: true, email: true, phone: true },
    });
    const rawInvoiceItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);
      const name = product?.nameEn ?? product?.nameAr ?? `Item-${item.productId}`;
      return {
        name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      };
    });
    const itemsTotal = rawInvoiceItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const invoiceItems =
      Math.abs(itemsTotal - totalAmount) <= 0.01 ? rawInvoiceItems : undefined;

    try {
      const paymentInput: ExecutePaymentInput = {
        paymentMethodId,
        invoiceValue: totalAmount,
        customerName: shipping.name ?? buyer?.fullName ?? "",
        customerMobile: normalizeMyFatoorahMobile(buyer?.phone ?? shipping.phone),
        customerReference: `order-${order.id}`,
      };
      if (buyer?.email) {
        paymentInput.customerEmail = buyer.email;
      }
      if (invoiceItems) {
        paymentInput.items = invoiceItems;
      }
      const payment = await executePayment(paymentInput);
      paymentUrl = payment.paymentUrl;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          myfatoorahInvoiceId: payment.invoiceId,
          myfatoorahPaymentId: payment.paymentId ?? null,
          myfatoorahPaymentUrl: payment.paymentUrl,
          myfatoorahStatus: "initiated",
        },
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, myfatoorahStatus: "failed" },
        });
        for (const item of normalizedItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      });
      const fallbackMessage =
        "تعذر بدء عملية الدفع عبر MyFatoorah، حاول مرة أخرى.";
      if (error instanceof AppError) {
        const details = error.details ?? error;
        const validationErrors = (details as { ValidationErrors?: Array<{ Name?: string; Error?: string }> })
          ?.ValidationErrors;
        const firstValidation = Array.isArray(validationErrors) ? validationErrors[0] : undefined;
        const validationMessage = firstValidation
          ? [firstValidation.Name, firstValidation.Error].filter(Boolean).join(": ")
          : undefined;
        const apiMessage =
          typeof (details as { Message?: string })?.Message === "string"
            ? (details as { Message?: string }).Message
            : undefined;
        const message = validationMessage || apiMessage || error.message || fallbackMessage;
        throw new AppError(message, error.statusCode, details);
      }
      throw AppError.internal(fallbackMessage, error);
    }
  }

  const torodOrderId = torodOrder?.id ?? order.redboxShipmentId;
  const trackingNumber =
    shipment?.trackingNumber ?? torodOrder?.trackingNumber ?? order.redboxTrackingNumber;
  const labelUrl = shipment?.labelUrl ?? order.redboxLabelUrl;
  const shipmentStatus = shipment?.status ?? torodOrder?.status ?? "created";
  const redboxShipmentId =
    torodOrderId ?? shipment?.id ?? order.redboxShipmentId;

  const updatedOrder = shipment || torodOrder
    ? await prisma.order.update({
        where: { id: order.id },
        data: {
          redboxShipmentId: redboxShipmentId,
          redboxTrackingNumber: trackingNumber ?? order.redboxTrackingNumber,
          redboxLabelUrl: labelUrl ?? order.redboxLabelUrl,
          redboxStatus: shipmentStatus ?? "created",
        },
        include: orderInclude,
      })
    : await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });

  const mapped = mapOrderToDto(updatedOrder);
  if (paymentUrl) {
    mapped.payment_url = paymentUrl;
  }

  if (!isMyFatoorahPayment) {
    void sendOrderPlacedEmail(updatedOrder.id, { paid: false }).catch((error) => {
      console.error("Failed to send order confirmation email", {
        orderId: updatedOrder.id,
        error,
      });
    });
  }
  return mapped;
};

const orderInclude = Prisma.validator<Prisma.OrderInclude>()({
  items: {
    include: {
      product: {
        include: {
          images: {
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
  },
});

const assertOrderAccess = (
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  userId: number,
  roles: string[]
) => {
  const normalizedRoles = roles.map((role) => role.toUpperCase());
  const isAdmin = normalizedRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role)
  );
  const isBuyer = order.buyerId === userId;
  const isSeller = order.items.some(
    (item) => item.product?.sellerId === userId
  );

  if (!isAdmin && !isBuyer && !isSeller) {
    throw AppError.forbidden();
  }
};

const statusToFriendly = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PENDING:
      return "pending";
    case OrderStatus.PROCESSING:
      return "seller_confirmed";
    case OrderStatus.SHIPPED:
      return "shipped";
    case OrderStatus.DELIVERED:
      return "completed";
    case OrderStatus.CANCELLED:
      return "canceled";
    case OrderStatus.REFUNDED:
      return "refunded";
    default:
      return (status as string).toLowerCase();
  }
};

const friendlyToStatus = (status: string): OrderStatus => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case "pending":
      return OrderStatus.PENDING;
    case "seller_confirmed":
    case "processing":
      return OrderStatus.PROCESSING;
    case "shipped":
      return OrderStatus.SHIPPED;
    case "completed":
    case "delivered":
      return OrderStatus.DELIVERED;
    case "canceled":
    case "cancelled":
      return OrderStatus.CANCELLED;
    case "refunded":
      return OrderStatus.REFUNDED;
    default:
      throw AppError.badRequest("Unsupported status value");
  }
};

const mapOrderToDto = (
  order: Prisma.OrderGetPayload<{
    include: typeof orderInclude;
  }>
) => {
  const items = order.items.map((item) => ({
    id: item.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: Number(item.unitPrice),
    total_price: Number(item.totalPrice),
    product: item.product ? normalizeProduct(item.product) : undefined,
  }));

  const [summaryItem] = items;

  return {
    id: order.id,
    buyer_id: order.buyerId,
    product_id: summaryItem?.product_id ?? null,
    quantity: summaryItem?.quantity ?? 0,
    unit_price: summaryItem?.unit_price ?? 0,
    total_amount: Number(order.totalAmount ?? summaryItem?.total_price ?? 0),
    payment_method: order.paymentMethod,
    shipping_address: order.shippingAddress,
    shipping_name: order.shippingName,
    shipping_phone: order.shippingPhone,
    shipping_city: order.shippingCity,
    shipping_region: order.shippingRegion,
    shipping_method: order.shippingMethod,
    shipping_fee: Number(order.shippingFee),
    discount_amount: Number(order.discountAmount ?? 0),
    coupon_code: order.couponCode ?? null,
    status: statusToFriendly(order.status),
    created_at: order.createdAt.toISOString(),
    platform_fee: Number(order.platformFee ?? 0),
    cod_amount: order.codAmount ? Number(order.codAmount) : null,
    cod_currency: order.codCurrency ?? null,
    customer_city_code: order.customerCityCode ?? null,
    customer_country: order.customerCountry ?? null,
    torod_order_id: order.redboxShipmentId ?? null,
    torod_shipment_id: order.redboxShipmentId ?? null,
    torod_tracking_number: order.redboxTrackingNumber ?? null,
    torod_label_url: order.redboxLabelUrl ?? null,
    torod_status: order.redboxStatus ?? null,
    payment_method_id: order.myfatoorahMethodId ?? null,
    payment_method_code: order.myfatoorahMethodCode ?? null,
    payment_status: order.myfatoorahStatus ?? null,
    payment_url: order.myfatoorahPaymentUrl ?? null,
    product: summaryItem?.product,
    items,
  };
};

const parseOrderIdFromReference = (reference?: string): number | null => {
  if (!reference) return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = trimmed.match(/(\d+)/g);
  if (!match) return null;
  const last = match[match.length - 1];
  const parsed = Number(last);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatusValue = (value?: string) => value?.trim().toLowerCase() ?? "";

const isPaidStatus = (invoiceStatus?: string, transactionStatus?: string) => {
  const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
  return ["paid", "success", "successful", "succss", "completed"].includes(normalized);
};

const isFailedStatus = (invoiceStatus?: string, transactionStatus?: string) => {
  const normalized = normalizeStatusValue(transactionStatus) || normalizeStatusValue(invoiceStatus);
  return ["failed", "error", "declined", "expired", "cancelled", "canceled"].includes(normalized);
};

export const syncMyFatoorahPayment = async (payload: {
  paymentId?: string;
  invoiceId?: string;
  invoiceStatus?: string;
  transactionStatus?: string;
  customerReference?: string;
  raw?: unknown;
}) => {
  const orderIdFromReference = parseOrderIdFromReference(payload.customerReference);
  let order = orderIdFromReference
    ? await prisma.order.findUnique({
        where: { id: orderIdFromReference },
        include: orderInclude,
      })
    : null;

  if (!order && payload.invoiceId) {
    order = await prisma.order.findFirst({
      where: { myfatoorahInvoiceId: payload.invoiceId },
      include: orderInclude,
    });
  }

  if (!order && payload.paymentId) {
    order = await prisma.order.findFirst({
      where: { myfatoorahPaymentId: payload.paymentId },
      include: orderInclude,
    });
  }

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  const paid = isPaidStatus(payload.invoiceStatus, payload.transactionStatus);
  const failed = isFailedStatus(payload.invoiceStatus, payload.transactionStatus);
  const statusText = payload.invoiceStatus ?? payload.transactionStatus ?? order.myfatoorahStatus ?? "pending";

  const updateData: Prisma.OrderUpdateInput = {
    myfatoorahStatus: statusText,
    ...(payload.invoiceId ? { myfatoorahInvoiceId: payload.invoiceId } : {}),
    ...(payload.paymentId ? { myfatoorahPaymentId: payload.paymentId } : {}),
  };

  if (paid && order.status === OrderStatus.PENDING) {
    updateData.status = OrderStatus.PROCESSING;
  }
  if (failed && order.status === OrderStatus.PENDING) {
    updateData.status = OrderStatus.CANCELLED;
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: updateData,
    include: orderInclude,
  });

  const transitionedToProcessing =
    paid && order.status === OrderStatus.PENDING && updated.status === OrderStatus.PROCESSING;
  if (transitionedToProcessing) {
    void sendOrderPlacedEmail(updated.id, { paid: true }).catch((error) => {
      console.error("Failed to send paid order confirmation email", {
        orderId: updated.id,
        error,
      });
    });
  }

  return {
    order: mapOrderToDto(updated),
    payment_status: paid ? "paid" : failed ? "failed" : "pending",
    raw: payload.raw ?? null,
  };
};

export const listOrdersByUser = async (userId: number) => {
  const orders = await prisma.order.findMany({
    where: { buyerId: userId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapOrderToDto);
};

export const getOrderById = async (orderId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  return mapOrderToDto(order);
};

type ListOrdersOptions = {
  status?: string;
  page?: number;
  page_size?: number;
  search?: string;
  sellerId?: number;
};

const buildOrdersSearchWhere = (search?: string): Prisma.OrderWhereInput | undefined => {
  if (!search) {
    return undefined;
  }
  const term = search.trim();
  if (!term) {
    return undefined;
  }
  const maybeId = Number(term);
  const numericFilters = Number.isNaN(maybeId)
    ? []
    : [
        { id: maybeId },
        { buyerId: maybeId },
      ];

  return {
    OR: [
      { shippingName: { contains: term } },
      { shippingPhone: { contains: term } },
      { couponCode: { contains: term } },
      {
        items: {
          some: {
            product: {
              OR: [
                { nameEn: { contains: term } },
                { nameAr: { contains: term } },
                { brand: { contains: term } },
              ],
            },
          },
        },
      },
      ...numericFilters,
    ],
  };
};

const mapOrdersForSeller = (orders: Prisma.OrderGetPayload<{ include: typeof orderInclude }>[], sellerId: number) =>
  orders.map((order) => {
    const dto = mapOrderToDto(order);
    const sellerItems = dto.items?.filter(
      (item) => item.product?.seller_id === sellerId
    );

    if (!sellerItems || sellerItems.length === 0) {
      return dto;
    }

    const [primary] = sellerItems;

    return {
      ...dto,
      product: primary?.product ?? dto.product,
      product_id: primary?.product_id ?? dto.product_id,
      quantity: sellerItems.reduce((total, item) => total + item.quantity, 0),
      unit_price: primary?.unit_price ?? dto.unit_price,
      items: sellerItems,
    };
  });

export const listOrdersWithPagination = async (options: ListOrdersOptions = {}) => {
  const { status, page = 1, page_size = 25, search, sellerId } = listOrdersSchema.parse(
    options ?? {}
  );
  const where: Prisma.OrderWhereInput = {};

  if (status) {
    where.status = friendlyToStatus(status);
  }

  if (sellerId) {
    where.items = {
      some: {
        product: { sellerId },
      },
    };
  }

  const searchWhere = buildOrdersSearchWhere(search);
  if (searchWhere) {
    Object.assign(where, searchWhere);
  }

  const countsWhere: Prisma.OrderWhereInput = {
    ...(sellerId
      ? {
          items: {
            some: {
              product: { sellerId },
            },
          },
        }
      : {}),
    ...(searchWhere ?? {}),
  };

  const [total, orders, statusCounts] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * page_size,
      take: page_size,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: countsWhere,
      _count: { status: true },
      orderBy: { status: "asc" },
    }),
  ]);

  const mapped = sellerId ? mapOrdersForSeller(orders, sellerId) : orders.map(mapOrderToDto);
  const status_counts = statusCounts.reduce<Record<string, number>>((acc, row) => {
    const count =
      typeof row._count === "object" && row._count ? row._count.status ?? 0 : 0;
    acc[statusToFriendly(row.status)] = count;
    return acc;
  }, {});

  return {
    orders: mapped,
    total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size),
    status_counts,
  };
};

export const listAllOrders = async (status?: string) => {
  const where: Prisma.OrderWhereInput = {};
  if (status) {
    where.status = friendlyToStatus(status);
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(mapOrderToDto);
};

export const listOrdersForSeller = async (sellerId: number, status?: string) => {
  const where: Prisma.OrderWhereInput = {
    items: {
      some: {
        product: {
          sellerId,
        },
      },
    },
  };

  if (status) {
    where.status = friendlyToStatus(status);
  }

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });

  return mapOrdersForSeller(orders, sellerId);
};

export const confirmOrderDelivery = async (orderId: number, buyerId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order || order.buyerId !== buyerId) {
    throw AppError.notFound("Order not found");
  }

  if (order.status === OrderStatus.DELIVERED) {
    return mapOrderToDto(order);
  }

  if (order.status !== OrderStatus.SHIPPED) {
    throw AppError.badRequest("Order is not ready to be confirmed");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DELIVERED },
    include: orderInclude,
  });

  return mapOrderToDto(updated);
};

export const listTorodPartnersForOrder = async (
  orderId: number,
  actorId: number,
  actorRoles: string[],
  payload?: {
    warehouse?: string;
    type?: string;
    filter_by?: string;
    is_insurance?: string | number;
  }
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) {
    throw AppError.notFound("Order not found");
  }
  assertOrderAccess(order, actorId, actorRoles);
  if (order.shippingMethod?.toLowerCase() !== "torod") {
    throw AppError.badRequest("Order is not a Torod shipment");
  }

  const torodOrderId = order.redboxShipmentId;
  if (!torodOrderId) {
    throw AppError.badRequest("Torod order id is missing for this order");
  }

  const normalizedRoles = actorRoles.map((role) => role.toUpperCase());
  const isAdmin = normalizedRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role)
  );
  const warehouse =
    payload?.warehouse?.trim() ||
    (isAdmin
      ? await resolveOrderWarehouseCode(order)
      : await resolveSellerWarehouseCode(actorId));
  if (!warehouse) {
    throw AppError.badRequest("Warehouse is required for Torod courier partners");
  }

  const response = await listTorodOrderCourierPartners({
    order_id: torodOrderId,
    warehouse,
    type: payload?.type ?? "normal",
    filter_by: payload?.filter_by ?? "cheapest",
    ...(payload?.is_insurance !== undefined ? { is_insurance: payload.is_insurance } : {}),
  });

  const partners = normalizeTorodPartners(response);
  return {
    order_id: torodOrderId,
    warehouse,
    partners,
  };
};

export const listTorodPartnersForCheckout = async (payload: unknown) => {
  const data = checkoutPartnersSchema.parse(payload ?? {});
  const itemIds = data.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      stockQuantity: true,
      status: true,
      sellerId: true,
      sellerWarehouseId: true,
      basePrice: true,
      sizeMl: true,
      weightKg: true,
    },
  });

  const quantityMap = new Map<number, number>();
  data.items.forEach((item) => {
    quantityMap.set(
      item.productId,
      (quantityMap.get(item.productId) ?? 0) + item.quantity
    );
  });
  const aggregatedItems = Array.from(quantityMap.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  assertInventoryOrThrow(products, aggregatedItems);

  const sellerIds = new Set(products.map((product) => product.sellerId));
  if (sellerIds.size !== 1) {
    throw AppError.badRequest("Torod checkout requires items from a single seller");
  }

  const warehouseIds = new Set(
    products
      .map((product) => product.sellerWarehouseId)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  );
  const sellerId = Array.from(sellerIds)[0];
  if (sellerId === undefined) {
    throw AppError.badRequest("Torod checkout requires items from a single seller");
  }
  const warehouse = await resolveSellerWarehouse(sellerId, warehouseIds);
  if (!warehouse?.warehouseCode) {
    throw AppError.badRequest("Warehouse is required for Torod courier partners");
  }

  const totalWeight = products.reduce((sum, product) => {
    const quantity = quantityMap.get(product.id) ?? 1;
    return sum + resolveProductWeightKg(product) * quantity;
  }, 0);

  const orderTotal =
    data.order_total ??
    products.reduce((sum, product) => {
      const quantity = quantityMap.get(product.id) ?? 1;
      return sum + product.basePrice.toNumber() * quantity;
    }, 0);

  const totalQuantity = Array.from(quantityMap.values()).reduce(
    (sum, qty) => sum + qty,
    0
  );

  const response = await listTorodCourierPartners({
    customer_city_id: data.customer_city_id,
    payment: "Prepaid",
    weight: totalWeight > 0 ? totalWeight : 1,
    order_total: orderTotal > 0 ? orderTotal : 1,
    no_of_box: Math.max(1, totalQuantity),
    type: "normal",
    filter_by: "cheapest",
    ...(warehouse.warehouseCode ? { warehouse: warehouse.warehouseCode } : {}),
    ...(warehouse.cityId ? { shipper_city_id: warehouse.cityId } : {}),
  });

  const partners = normalizeTorodPartners(response);
  return { partners };
};

export const shipTorodOrderForOrder = async (
  orderId: number,
  actorId: number,
  actorRoles: string[],
  payload: {
    courier_partner_id?: string | number;
    shipping_company_id?: string | number;
    warehouse?: string;
    type?: string;
    is_own?: string | number;
    is_insurance?: string | number;
  }
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) {
    throw AppError.notFound("Order not found");
  }
  assertOrderAccess(order, actorId, actorRoles);
  if (order.shippingMethod?.toLowerCase() !== "torod") {
    throw AppError.badRequest("Order is not a Torod shipment");
  }

  const torodOrderId = order.redboxShipmentId;
  if (!torodOrderId) {
    throw AppError.badRequest("Torod order id is missing for this order");
  }

  const normalizedRoles = actorRoles.map((role) => role.toUpperCase());
  const isAdmin = normalizedRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role)
  );
  const warehouse =
    payload.warehouse?.trim() ||
    (isAdmin
      ? await resolveOrderWarehouseCode(order)
      : await resolveSellerWarehouseCode(actorId));
  if (!warehouse) {
    throw AppError.badRequest("Warehouse is required for Torod shipment");
  }

  const courierPartnerId =
    payload.courier_partner_id ?? payload.shipping_company_id;
  const shipmentPayload: Record<string, unknown> = {
    type: payload.type ?? "normal",
    warehouse,
  };
  if (courierPartnerId) {
    shipmentPayload.courier_partner_id = courierPartnerId;
    shipmentPayload.shipping_company_id = courierPartnerId;
  }
  if (payload.is_own !== undefined) shipmentPayload.is_own = payload.is_own;
  if (payload.is_insurance !== undefined) shipmentPayload.is_insurance = payload.is_insurance;

  const shipment = await shipTorodOrder(torodOrderId, shipmentPayload);

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.SHIPPED,
      redboxTrackingNumber: shipment.trackingNumber ?? order.redboxTrackingNumber,
      redboxLabelUrl: shipment.labelUrl ?? order.redboxLabelUrl,
      redboxStatus: shipment.status ?? order.redboxStatus ?? "created",
    },
    include: orderInclude,
  });

  return mapOrderToDto(updated);
};

export const updateOrderStatus = async (
  orderId: number,
  status: string,
  actorRoles: string[]
) => {
  const allowedStatuses: Array<{ from: OrderStatus[]; to: OrderStatus }> = [
    { from: [OrderStatus.PENDING], to: OrderStatus.PROCESSING },
    { from: [OrderStatus.PROCESSING], to: OrderStatus.SHIPPED },
    { from: [OrderStatus.SHIPPED], to: OrderStatus.DELIVERED },
    { from: [OrderStatus.PENDING, OrderStatus.PROCESSING], to: OrderStatus.CANCELLED },
  ];

  const nextStatus = friendlyToStatus(status);
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  const canUpdate = allowedStatuses.some((rule) =>
    rule.to === nextStatus && rule.from.includes(order.status)
  );

  if (!canUpdate && nextStatus !== OrderStatus.CANCELLED) {
    throw AppError.badRequest("Invalid status transition");
  }

  const isAdmin = actorRoles.some((role) =>
    ["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase())
  );
  const isSeller = actorRoles.some((role) => role.toUpperCase() === "SELLER");

  if (!isAdmin && nextStatus === OrderStatus.CANCELLED) {
    throw AppError.forbidden();
  }

  if (!isAdmin && !isSeller && nextStatus !== OrderStatus.DELIVERED) {
    throw AppError.forbidden();
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    include: orderInclude,
  });

  return mapOrderToDto(updated);
};

export const getOrderLabel = async (
  orderId: number,
  actorId: number,
  actorRoles: string[]
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  assertOrderAccess(order, actorId, actorRoles);

  if (order.shippingMethod?.toLowerCase() !== "torod") {
    throw AppError.badRequest("لم يتم إصدار بوليصة الشحن لهذا الطلب بعد");
  }

  if (!order.redboxTrackingNumber && !order.redboxLabelUrl) {
    throw AppError.badRequest("لم يتم إصدار بوليصة الشحن لهذا الطلب بعد");
  }

  let shipment;
  if (order.redboxTrackingNumber) {
    try {
      shipment = await trackTorodShipment(order.redboxTrackingNumber);
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode < 400 || error.statusCode >= 500) {
        throw error;
      }
    }
  }
  const labelUrl = shipment?.labelUrl || order.redboxLabelUrl || "";

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      redboxLabelUrl: labelUrl || order.redboxLabelUrl,
      redboxTrackingNumber:
        shipment?.trackingNumber ?? order.redboxTrackingNumber,
    },
    include: orderInclude,
  });

  return {
    label_url: labelUrl || updated.redboxLabelUrl || null,
    tracking_number: updated.redboxTrackingNumber ?? null,
    order: mapOrderToDto(updated),
  };
};

export const getOrderTracking = async (
  orderId: number,
  actorId: number,
  actorRoles: string[]
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound("Order not found");
  }

  assertOrderAccess(order, actorId, actorRoles);

  if (!order.redboxTrackingNumber) {
    throw AppError.badRequest("No Torod tracking number for this order");
  }

  const shipmentStatus = await trackTorodShipment(order.redboxTrackingNumber);

  const raw = shipmentStatus.raw as { activities?: unknown[]; events?: unknown[]; history?: unknown[] } | undefined;
  const activities =
    (Array.isArray(raw?.activities) && raw?.activities) ||
    (Array.isArray(raw?.events) && raw?.events) ||
    (Array.isArray(raw?.history) && raw?.history) ||
    [];

  const statusValue =
    shipmentStatus.status ?? order.redboxStatus ?? statusToFriendly(order.status);
  const trackingNumber =
    shipmentStatus.trackingNumber ??
    order.redboxTrackingNumber;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      redboxStatus: statusValue,
      redboxTrackingNumber: trackingNumber,
    },
    include: orderInclude,
  });

  return {
    order_id: updated.id,
    shipment_id: updated.redboxShipmentId,
    tracking_number: trackingNumber,
    status: statusValue,
    activities,
    order: mapOrderToDto(updated),
  };
};
