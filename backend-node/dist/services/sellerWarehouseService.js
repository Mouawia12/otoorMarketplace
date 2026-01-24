"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSellerWarehouse = exports.updateSellerWarehouse = exports.createSellerWarehouse = exports.transferWarehouseProducts = exports.listSellerWarehouses = void 0;
const client_1 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const torodService_1 = require("./torodService");
const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};
const toBoolean = (value) => {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized))
            return true;
        if (["false", "0", "no", "n"].includes(normalized))
            return false;
    }
    return undefined;
};
const extractAddressId = (payload) => {
    const raw = payload.id ?? payload.address_id ?? payload.addressId ?? payload.data;
    if (typeof raw === "string" || typeof raw === "number")
        return raw;
    return undefined;
};
const extractWarehouseCode = (payload) => {
    const raw = payload.warehouse ?? payload.warehouse_code ?? payload.code ?? payload.data;
    if (typeof raw === "string" || typeof raw === "number")
        return raw;
    return undefined;
};
const extractList = (payload) => {
    if (!payload || typeof payload !== "object")
        return [];
    const record = payload;
    const data = record.data ?? record.result ?? record.items;
    if (Array.isArray(data))
        return data;
    if (data && typeof data === "object") {
        const nested = data.data;
        if (Array.isArray(nested))
            return nested;
    }
    return [];
};
const extractWarehouse = (payload) => {
    const code = payload.warehouse ??
        payload.warehouse_code ??
        payload.code ??
        payload.warehouseCode ??
        payload.warehouse_id;
    const name = payload.warehouse_name ?? payload.name ?? payload.title ?? code;
    if (!code)
        return null;
    return { code: String(code), name: String(name) };
};
const normalizeType = (value) => {
    if (typeof value !== "string")
        return "normal";
    const normalized = value.trim().toLowerCase();
    if (["normal", "address_city", "latlong"].includes(normalized))
        return normalized;
    return "normal";
};
const normalizePhone = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("966"))
        return digits;
    if (digits.startsWith("0") && digits.length >= 9) {
        return `966${digits.slice(1)}`;
    }
    if (digits.length === 9)
        return digits;
    return digits;
};
const isValidWarehouseCode = (value) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]+$/.test(value);
const isDistrictMismatchError = (error) => {
    const details = error.details;
    if (!details || typeof details !== "object")
        return false;
    const record = details;
    const message = record.message;
    if (typeof message === "string") {
        return message.toLowerCase().includes("district");
    }
    if (message && typeof message === "object") {
        const locate = message.locate_address;
        if (typeof locate === "string") {
            return locate.toLowerCase().includes("district");
        }
    }
    return false;
};
const ensureRequired = (condition, message) => {
    if (!condition) {
        throw errors_1.AppError.badRequest(message);
    }
};
const listSellerWarehouses = async (userId) => {
    return client_1.prisma.sellerWarehouse.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
};
exports.listSellerWarehouses = listSellerWarehouses;
const transferWarehouseProducts = async (userId, sourceWarehouseId, targetWarehouseId, productIds) => {
    if (!productIds.length) {
        throw errors_1.AppError.badRequest("product_ids are required");
    }
    if (sourceWarehouseId === targetWarehouseId) {
        throw errors_1.AppError.badRequest("Target warehouse must be different");
    }
    const [source, target] = await Promise.all([
        client_1.prisma.sellerWarehouse.findFirst({ where: { id: sourceWarehouseId, userId } }),
        client_1.prisma.sellerWarehouse.findFirst({ where: { id: targetWarehouseId, userId } }),
    ]);
    if (!source || !target) {
        throw errors_1.AppError.badRequest("Warehouse not found");
    }
    const updateResult = await client_1.prisma.product.updateMany({
        where: {
            id: { in: productIds },
            sellerId: userId,
            sellerWarehouseId: sourceWarehouseId,
        },
        data: { sellerWarehouseId: targetWarehouseId },
    });
    return {
        moved: updateResult.count,
        sourceWarehouseId,
        targetWarehouseId,
    };
};
exports.transferWarehouseProducts = transferWarehouseProducts;
const resolveDefaultUpdates = async (userId, warehouseId) => {
    await client_1.prisma.sellerWarehouse.updateMany({
        where: { userId, id: { not: warehouseId } },
        data: { isDefault: false },
    });
};
const resolveReturnDefaultUpdates = async (userId, warehouseId) => {
    await client_1.prisma.sellerWarehouse.updateMany({
        where: { userId, id: { not: warehouseId } },
        data: { isReturnDefault: false },
    });
};
const createSellerWarehouse = async (userId, payload) => {
    const warehouseName = payload.warehouse_name?.trim();
    const warehouseCode = payload.warehouse?.trim();
    const contactName = payload.contact_name?.trim();
    const phoneNumber = payload.phone_number?.trim();
    const email = payload.email?.trim();
    const type = normalizeType(payload.type);
    let storedType = type;
    ensureRequired(!!warehouseName, "warehouse_name is required");
    ensureRequired(!!warehouseCode, "warehouse is required");
    ensureRequired(!!contactName, "contact_name is required");
    ensureRequired(!!phoneNumber, "phone_number is required");
    ensureRequired(!!email, "email is required");
    ensureRequired(isValidWarehouseCode(warehouseCode ?? ""), "warehouse must include letters and numbers");
    const safeWarehouseCode = warehouseCode ?? "";
    const safeContactName = contactName ?? "";
    const safeEmail = email ?? "";
    const safePhoneNumber = phoneNumber ?? "";
    const countryId = toNumber(payload.country_id);
    const regionId = toNumber(payload.region_id);
    const cityId = toNumber(payload.city_id);
    const districtId = toNumber(payload.district_id);
    const latitude = toNumber(payload.latitude);
    const longitude = toNumber(payload.longitude);
    const address = payload.address?.trim();
    const locateAddress = payload.locate_address?.trim();
    if (type === "normal") {
        ensureRequired(!!cityId, "city_id is required for normal address");
        ensureRequired(!!districtId, "district_id is required for normal address");
        ensureRequired(!!locateAddress, "locate_address is required for normal address");
    }
    if (type === "address_city") {
        ensureRequired(!!cityId, "city_id is required for address_city");
        ensureRequired(!!address, "address is required for address_city");
    }
    if (type === "latlong") {
        ensureRequired(latitude !== undefined, "latitude is required for latlong");
        ensureRequired(longitude !== undefined, "longitude is required for latlong");
    }
    const existing = await client_1.prisma.sellerWarehouse.findFirst({
        where: { userId, warehouseCode: safeWarehouseCode },
    });
    if (existing) {
        throw errors_1.AppError.badRequest("Warehouse code already exists");
    }
    const normalizedPhone = normalizePhone(safePhoneNumber);
    const addressPayload = {
        warehouse_name: warehouseName,
        warehouse: safeWarehouseCode,
        contact_name: safeContactName,
        phone_number: normalizedPhone,
        email: safeEmail,
        type,
        country_id: countryId,
        region_id: regionId,
        city_id: cityId,
        district_id: districtId,
        address: address ?? locateAddress,
        locate_address: locateAddress,
        latitude,
        longitude,
        zip_code: payload.zip_code?.trim(),
        short_address: payload.short_address?.trim(),
    };
    console.log("TOROD ADDRESS CREATE PAYLOAD:", addressPayload);
    let torodResponse;
    try {
        torodResponse = await (0, torodService_1.createAddress)(addressPayload);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            console.log("TOROD ADDRESS CREATE ERROR:", {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details,
            });
            if (error.statusCode === 422 && type === "normal" && isDistrictMismatchError(error)) {
                const fallbackPayload = {
                    ...addressPayload,
                    type: "address_city",
                    address: addressPayload.address ?? addressPayload.locate_address,
                    locate_address: undefined,
                    district_id: undefined,
                };
                storedType = "address_city";
                torodResponse = await (0, torodService_1.createAddress)(fallbackPayload);
            }
            else if (error.statusCode === 504) {
                const addressList = await (0, torodService_1.listAddresses)(1);
                const matches = extractList(addressList);
                const matched = matches.find((item) => {
                    const entry = extractWarehouse(item);
                    return entry?.code?.toLowerCase() === safeWarehouseCode.toLowerCase();
                });
                if (matched) {
                    torodResponse = matched;
                }
                else {
                    throw error;
                }
            }
            else {
                throw error;
            }
        }
        else {
            throw error;
        }
    }
    const torodRecord = (torodResponse ?? {});
    const torodAddressId = extractAddressId(torodRecord);
    const torodWarehouseCode = extractWarehouseCode(torodRecord);
    const finalWarehouseCode = torodWarehouseCode
        ? String(torodWarehouseCode)
        : safeWarehouseCode;
    const isDefault = toBoolean(payload.is_default) ?? false;
    const isReturnDefault = toBoolean(payload.is_return_default) ?? false;
    const created = await client_1.prisma.sellerWarehouse.create({
        data: {
            userId,
            torodAddressId: torodAddressId ? String(torodAddressId) : null,
            warehouseCode: finalWarehouseCode,
            warehouseName: warehouseName ?? safeWarehouseCode,
            type: storedType,
            countryId: countryId ?? null,
            regionId: regionId ?? null,
            cityId: cityId ?? null,
            districtId: storedType === "normal" ? districtId ?? null : null,
            address: address ?? null,
            locateAddress: locateAddress ?? null,
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            contactName: safeContactName,
            phoneNumber: safePhoneNumber,
            email: safeEmail,
            zipCode: payload.zip_code?.trim() || null,
            shortAddress: payload.short_address?.trim() || null,
            isDefault,
            isReturnDefault,
        },
    });
    if (created.isDefault) {
        await resolveDefaultUpdates(userId, created.id);
        await client_1.prisma.sellerProfile.updateMany({
            where: { userId },
            data: { torodWarehouseId: created.warehouseCode },
        });
    }
    if (created.isReturnDefault) {
        await resolveReturnDefaultUpdates(userId, created.id);
    }
    return created;
};
exports.createSellerWarehouse = createSellerWarehouse;
const updateSellerWarehouse = async (userId, warehouseId, payload) => {
    const existing = await client_1.prisma.sellerWarehouse.findFirst({
        where: { id: warehouseId, userId },
    });
    if (!existing) {
        throw errors_1.AppError.notFound("Warehouse not found");
    }
    const updates = {
        warehouseName: payload.warehouse_name?.trim() || existing.warehouseName,
        type: payload.type ? normalizeType(payload.type) : existing.type,
        countryId: toNumber(payload.country_id) ?? existing.countryId,
        regionId: toNumber(payload.region_id) ?? existing.regionId,
        cityId: toNumber(payload.city_id) ?? existing.cityId,
        districtId: toNumber(payload.district_id) ?? existing.districtId,
        address: payload.address?.trim() ?? existing.address,
        locateAddress: payload.locate_address?.trim() ?? existing.locateAddress,
        latitude: toNumber(payload.latitude) ?? existing.latitude,
        longitude: toNumber(payload.longitude) ?? existing.longitude,
        contactName: payload.contact_name?.trim() ?? existing.contactName,
        phoneNumber: payload.phone_number?.trim() ?? existing.phoneNumber,
        email: payload.email?.trim() ?? existing.email,
        zipCode: payload.zip_code?.trim() ?? existing.zipCode,
        shortAddress: payload.short_address?.trim() ?? existing.shortAddress,
    };
    const isDefault = toBoolean(payload.is_default);
    const isReturnDefault = toBoolean(payload.is_return_default);
    if (isDefault !== undefined) {
        updates.isDefault = isDefault;
    }
    if (isReturnDefault !== undefined) {
        updates.isReturnDefault = isReturnDefault;
    }
    const updated = await client_1.prisma.sellerWarehouse.update({
        where: { id: existing.id },
        data: updates,
    });
    if (isDefault) {
        await resolveDefaultUpdates(userId, updated.id);
        await client_1.prisma.sellerProfile.updateMany({
            where: { userId },
            data: { torodWarehouseId: updated.warehouseCode },
        });
    }
    if (isReturnDefault) {
        await resolveReturnDefaultUpdates(userId, updated.id);
    }
    return updated;
};
exports.updateSellerWarehouse = updateSellerWarehouse;
const deleteSellerWarehouse = async (userId, warehouseId) => {
    const existing = await client_1.prisma.sellerWarehouse.findFirst({
        where: { id: warehouseId, userId },
    });
    if (!existing) {
        throw errors_1.AppError.notFound("Warehouse not found");
    }
    await client_1.prisma.sellerWarehouse.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
        const nextDefault = await client_1.prisma.sellerWarehouse.findFirst({
            where: { userId },
            orderBy: [{ createdAt: "desc" }],
        });
        await client_1.prisma.sellerProfile.updateMany({
            where: { userId },
            data: { torodWarehouseId: nextDefault?.warehouseCode ?? null },
        });
        if (nextDefault) {
            await client_1.prisma.sellerWarehouse.update({
                where: { id: nextDefault.id },
                data: { isDefault: true },
            });
        }
    }
    return { success: true };
};
exports.deleteSellerWarehouse = deleteSellerWarehouse;
//# sourceMappingURL=sellerWarehouseService.js.map