"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listManualShipments = exports.createManualShipment = exports.listManualShipmentPartners = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const password_1 = require("../utils/password");
const torodService_1 = require("./torodService");
const orderService_1 = require("./orderService");
const externalOrderSchema = zod_1.z.object({
    warehouse_id: zod_1.z.coerce.number().int().positive().optional(),
    warehouse_code: zod_1.z.string().trim().optional(),
    shipper_city_id: zod_1.z.coerce.number().int().positive().optional(),
    customer_name: zod_1.z.string().trim().min(1),
    customer_phone: zod_1.z.string().trim().min(5),
    customer_email: zod_1.z.string().trim().email().optional(),
    customer_city: zod_1.z.string().trim().optional(),
    customer_region: zod_1.z.string().trim().optional(),
    customer_country: zod_1.z.string().trim().optional(),
    country_id: zod_1.z.coerce.number().int().positive(),
    region_id: zod_1.z.coerce.number().int().positive(),
    city_id: zod_1.z.coerce.number().int().positive(),
    district_id: zod_1.z.coerce.number().int().positive().optional(),
    address: zod_1.z.string().trim().min(3),
    weight: zod_1.z.coerce.number().positive().optional(),
    no_of_box: zod_1.z.coerce.number().int().positive().optional(),
    order_total: zod_1.z.coerce.number().positive().optional(),
    item_description: zod_1.z.string().trim().min(3).optional(),
    product_id: zod_1.z.coerce.number().int().positive(),
    quantity: zod_1.z.coerce.number().int().positive(),
    courier_partner_id: zod_1.z.coerce.number().int().positive(),
    type: zod_1.z.enum(["normal", "address_city", "latlong"]).default("address_city"),
    locate_address: zod_1.z.string().trim().optional(),
    latitude: zod_1.z.coerce.number().optional(),
    longitude: zod_1.z.coerce.number().optional(),
});
const partnerRequestSchema = zod_1.z.object({
    warehouse_id: zod_1.z.coerce.number().int().positive().optional(),
    warehouse_code: zod_1.z.string().trim().optional(),
    shipper_city_id: zod_1.z.coerce.number().int().positive().optional(),
    customer_city_id: zod_1.z.coerce.number().int().positive(),
    payment: zod_1.z.string().trim().min(1),
    weight: zod_1.z.coerce.number().positive(),
    order_total: zod_1.z.coerce.number().positive(),
    no_of_box: zod_1.z.coerce.number().int().positive(),
    type: zod_1.z.string().trim().min(1),
    filter_by: zod_1.z.string().trim().min(1).default("cheapest"),
    show_all: zod_1.z.coerce.boolean().optional(),
});
const normalizeTorodPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
        return "";
    }
    if (digits.startsWith("966")) {
        const rest = digits.slice(3).replace(/^0+/, "");
        return `966${rest}`;
    }
    return digits.replace(/^0+/, "");
};
const generateExternalEmail = () => `external-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@otor.market`;
const ensureBuyerRole = async (userId) => {
    const buyerRole = await client_2.prisma.role.findUnique({
        where: { name: client_1.RoleName.BUYER },
        select: { id: true },
    });
    if (!buyerRole) {
        throw errors_1.AppError.internal("Buyer role is missing");
    }
    const existing = await client_2.prisma.userRole.findFirst({
        where: { userId, roleId: buyerRole.id },
        select: { id: true },
    });
    if (!existing) {
        await client_2.prisma.userRole.create({
            data: { userId, roleId: buyerRole.id },
        });
    }
};
const findOrCreateExternalBuyer = async (input) => {
    const email = input.email?.trim() || undefined;
    const phone = input.phone?.trim() || undefined;
    const user = (email
        ? await client_2.prisma.user.findUnique({
            where: { email },
            include: { roles: { include: { role: true } } },
        })
        : null) ||
        (phone
            ? await client_2.prisma.user.findUnique({
                where: { phone },
                include: { roles: { include: { role: true } } },
            })
            : null);
    if (user) {
        await ensureBuyerRole(user.id);
        return user;
    }
    const resolvedEmail = email ?? generateExternalEmail();
    const passwordHash = await (0, password_1.hashPassword)(Math.random().toString(36).slice(2) + Date.now().toString(36));
    const created = await client_2.prisma.user.create({
        data: {
            email: resolvedEmail,
            passwordHash,
            fullName: input.fullName,
            phone: phone ?? null,
            requiresPasswordReset: true,
            roles: {
                create: [
                    {
                        role: {
                            connect: { name: client_1.RoleName.BUYER },
                        },
                    },
                ],
            },
        },
        include: { roles: { include: { role: true } } },
    });
    return created;
};
const extractList = (payload) => {
    if (Array.isArray(payload))
        return payload;
    if (payload && typeof payload === "object") {
        const data = payload;
        if (Array.isArray(data.data))
            return data.data;
        if (Array.isArray(data.result))
            return data.result;
        if (data.data && typeof data.data === "object") {
            const nested = data.data;
            if (Array.isArray(nested.data))
                return nested.data;
            if (Array.isArray(nested.items))
                return nested.items;
        }
        if (Array.isArray(data.items))
            return data.items;
    }
    return [];
};
const toNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return undefined;
};
const resolvePartnerId = (partner) => {
    const raw = partner.id ??
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
const normalizePartners = (payload) => {
    const partners = extractList(payload);
    return partners
        .map((partner) => {
        if (!partner || typeof partner !== "object")
            return null;
        const record = partner;
        const id = resolvePartnerId(record);
        if (!id)
            return null;
        return {
            id,
            name: record.title ??
                record.title_en ??
                record.company_name ??
                record.name ??
                record.method ??
                record.carrier_name ??
                record.service_name ??
                id,
            name_ar: record.title_arabic ??
                record.title_ar ??
                record.company_name_ar ??
                record.name_ar ??
                record.name_arabic ??
                null,
            rate: toNumber(record.rate) ??
                toNumber(record.total_amount) ??
                toNumber(record.amount) ??
                toNumber(record.price) ??
                toNumber(record.cost) ??
                null,
            currency: record.currency ??
                record.currency_code ??
                record.currency_iso ??
                null,
            eta: record.eta ??
                record.delivery_time ??
                record.estimated_days ??
                record.estimated_time ??
                null,
        };
    })
        .filter(Boolean);
};
const resolveWarehouse = async (userId, roles, warehouseId, warehouseCode) => {
    const isAdmin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase()));
    if (warehouseId) {
        const warehouse = await client_2.prisma.sellerWarehouse.findFirst({
            where: isAdmin ? { id: warehouseId } : { id: warehouseId, userId },
        });
        if (!warehouse) {
            throw errors_1.AppError.badRequest("Warehouse not found");
        }
        return warehouse;
    }
    if (warehouseCode) {
        const warehouse = await client_2.prisma.sellerWarehouse.findFirst({
            where: isAdmin ? { warehouseCode } : { warehouseCode, userId },
        });
        if (!warehouse) {
            throw errors_1.AppError.badRequest("Warehouse not found");
        }
        return warehouse;
    }
    return null;
};
const resolveProductWeightKg = (product) => {
    const rawWeight = typeof product.weightKg === "number"
        ? product.weightKg
        : product.weightKg instanceof client_1.Prisma.Decimal
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
const listManualShipmentPartners = async (userId, roles, payload) => {
    const data = partnerRequestSchema.parse(payload ?? {});
    const warehouse = await resolveWarehouse(userId, roles, data.warehouse_id, data.warehouse_code);
    const warehouseCode = warehouse?.warehouseCode ?? data.warehouse_code;
    const shipperCityId = warehouse?.cityId ?? data.shipper_city_id;
    if (!warehouseCode) {
        throw errors_1.AppError.badRequest("Warehouse code is required");
    }
    if (!shipperCityId) {
        throw errors_1.AppError.badRequest("Shipper city is required");
    }
    if (data.show_all) {
        const response = await (0, torodService_1.listAllCourierPartners)(1);
        return {
            partners: normalizePartners(response),
            warehouse_code: warehouseCode,
            shipper_city_id: shipperCityId,
        };
    }
    const response = await (0, torodService_1.listCourierPartners)({
        shipper_city_id: shipperCityId,
        customer_city_id: data.customer_city_id,
        payment: data.payment,
        weight: data.weight,
        order_total: data.order_total,
        no_of_box: data.no_of_box,
        type: data.type,
        filter_by: data.filter_by,
        warehouse: warehouseCode,
    });
    return {
        partners: normalizePartners(response),
        warehouse_code: warehouseCode,
        shipper_city_id: shipperCityId,
    };
};
exports.listManualShipmentPartners = listManualShipmentPartners;
const createManualShipment = async (userId, roles, payload) => {
    const data = externalOrderSchema.parse(payload ?? {});
    const warehouse = await resolveWarehouse(userId, roles, data.warehouse_id, data.warehouse_code);
    const warehouseCode = warehouse?.warehouseCode ?? data.warehouse_code;
    const shipperCityId = warehouse?.cityId ?? data.shipper_city_id;
    if (!warehouseCode) {
        throw errors_1.AppError.badRequest("Warehouse code is required");
    }
    if (!shipperCityId) {
        throw errors_1.AppError.badRequest("Shipper city is required");
    }
    const normalizedPhone = normalizeTorodPhone(data.customer_phone);
    if (!normalizedPhone) {
        throw errors_1.AppError.badRequest("Customer phone number is required");
    }
    const product = await client_2.prisma.product.findFirst({
        where: {
            id: data.product_id,
            sellerId: userId,
            ...(warehouse?.id ? { sellerWarehouseId: warehouse.id } : {}),
        },
        select: {
            id: true,
            nameEn: true,
            nameAr: true,
            basePrice: true,
            sizeMl: true,
            weightKg: true,
        },
    });
    if (!product) {
        throw errors_1.AppError.badRequest("Product not found");
    }
    const totalQuantity = data.quantity ?? data.no_of_box ?? 1;
    const unitPrice = product.basePrice.toNumber();
    const orderTotal = typeof data.order_total === "number" && Number.isFinite(data.order_total)
        ? data.order_total
        : unitPrice * totalQuantity;
    const totalWeight = typeof data.weight === "number" && Number.isFinite(data.weight)
        ? data.weight
        : Math.max(1, resolveProductWeightKg(product) * totalQuantity);
    const itemDescription = data.item_description ?? product.nameEn ?? product.nameAr ?? "Product";
    if (!orderTotal || !totalWeight || !itemDescription) {
        throw errors_1.AppError.badRequest("Shipment details are incomplete");
    }
    const buyer = await findOrCreateExternalBuyer({
        ...(data.customer_email ? { email: data.customer_email } : {}),
        fullName: data.customer_name,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    });
    const created = await (0, orderService_1.createOrder)({
        buyerId: buyer.id,
        paymentMethod: "prepaid",
        shipping: {
            name: data.customer_name,
            phone: normalizedPhone,
            city: data.customer_city ?? String(data.city_id),
            region: data.customer_region ?? String(data.region_id),
            address: data.address,
            type: "torod",
            customerCityCode: data.customer_city ?? String(data.city_id),
            customerCountry: data.customer_country ?? "SA",
            codCurrency: "SAR",
            torodWarehouseId: warehouseCode,
            torodCountryId: data.country_id,
            torodRegionId: data.region_id,
            torodCityId: data.city_id,
            torodDistrictId: data.district_id,
            torodShippingCompanyId: data.courier_partner_id,
            torodMetadata: {
                source: "external",
            },
        },
        items: [
            {
                productId: data.product_id,
                quantity: totalQuantity,
            },
        ],
    });
    await client_2.prisma.order.update({
        where: { id: created.id },
        data: { status: client_1.OrderStatus.PENDING },
    });
    const order = await (0, orderService_1.getOrderById)(created.id);
    return {
        order,
    };
};
exports.createManualShipment = createManualShipment;
const listManualShipments = async (userId, roles) => {
    const isAdmin = roles.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase()));
    const query = {
        orderBy: { createdAt: "desc" },
    };
    if (!isAdmin) {
        query.where = { userId };
    }
    const shipments = await client_2.prisma.manualShipment.findMany(query);
    return { shipments };
};
exports.listManualShipments = listManualShipments;
//# sourceMappingURL=manualShipmentService.js.map