import { Prisma } from "@prisma/client";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { createAddress, listAddresses } from "./torodService";

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return undefined;
};

const extractAddressId = (payload: Record<string, unknown>) => {
  const raw = payload.id ?? payload.address_id ?? payload.addressId ?? payload.data;
  if (typeof raw === "string" || typeof raw === "number") return raw;
  return undefined;
};

const extractWarehouseCode = (payload: Record<string, unknown>) => {
  const raw = payload.warehouse ?? payload.warehouse_code ?? payload.code ?? payload.data;
  if (typeof raw === "string" || typeof raw === "number") return raw;
  return undefined;
};

const extractList = (payload: unknown): Array<Record<string, unknown>> => {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const data = record.data ?? record.result ?? record.items;
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).data;
    if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>;
  }
  return [];
};

const extractWarehouse = (payload: Record<string, unknown>) => {
  const code =
    payload.warehouse ??
    payload.warehouse_code ??
    payload.code ??
    payload.warehouseCode ??
    payload.warehouse_id;
  const name = payload.warehouse_name ?? payload.name ?? payload.title ?? code;
  if (!code) return null;
  return { code: String(code), name: String(name) };
};

const normalizeType = (value: unknown) => {
  if (typeof value !== "string") return "normal";
  const normalized = value.trim().toLowerCase();
  if (["normal", "address_city", "latlong"].includes(normalized)) return normalized;
  return "normal";
};

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0") && digits.length >= 9) {
    return `966${digits.slice(1)}`;
  }
  if (digits.length === 9) return digits;
  return digits;
};

const isValidWarehouseCode = (value: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]+$/.test(value);

const isDistrictMismatchError = (error: AppError) => {
  const details = error.details;
  if (!details || typeof details !== "object") return false;
  const record = details as Record<string, unknown>;
  const message = record.message;
  if (typeof message === "string") {
    return message.toLowerCase().includes("district");
  }
  if (message && typeof message === "object") {
    const locate = (message as Record<string, unknown>).locate_address;
    if (typeof locate === "string") {
      return locate.toLowerCase().includes("district");
    }
  }
  return false;
};

const ensureRequired = (condition: boolean, message: string) => {
  if (!condition) {
    throw AppError.badRequest(message);
  }
};

export type SellerWarehousePayload = {
  warehouse_name?: string;
  warehouse?: string;
  contact_name?: string;
  phone_number?: string;
  email?: string;
  type?: string;
  country_id?: number;
  region_id?: number;
  city_id?: number;
  district_id?: number;
  address?: string;
  locate_address?: string;
  latitude?: number;
  longitude?: number;
  zip_code?: string;
  short_address?: string;
  is_default?: boolean;
  is_return_default?: boolean;
};

export const listSellerWarehouses = async (userId: number) => {
  return prisma.sellerWarehouse.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
};

export const transferWarehouseProducts = async (
  userId: number,
  sourceWarehouseId: number,
  targetWarehouseId: number,
  productIds: number[]
) => {
  if (!productIds.length) {
    throw AppError.badRequest("product_ids are required");
  }
  if (sourceWarehouseId === targetWarehouseId) {
    throw AppError.badRequest("Target warehouse must be different");
  }

  const [source, target] = await Promise.all([
    prisma.sellerWarehouse.findFirst({ where: { id: sourceWarehouseId, userId } }),
    prisma.sellerWarehouse.findFirst({ where: { id: targetWarehouseId, userId } }),
  ]);

  if (!source || !target) {
    throw AppError.badRequest("Warehouse not found");
  }

  const updateResult = await prisma.product.updateMany({
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

const resolveDefaultUpdates = async (userId: number, warehouseId: number) => {
  await prisma.sellerWarehouse.updateMany({
    where: { userId, id: { not: warehouseId } },
    data: { isDefault: false },
  });
};

const resolveReturnDefaultUpdates = async (userId: number, warehouseId: number) => {
  await prisma.sellerWarehouse.updateMany({
    where: { userId, id: { not: warehouseId } },
    data: { isReturnDefault: false },
  });
};

export const createSellerWarehouse = async (userId: number, payload: SellerWarehousePayload) => {
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
  ensureRequired(
    isValidWarehouseCode(warehouseCode ?? ""),
    "warehouse must include letters and numbers"
  );

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

  const existing = await prisma.sellerWarehouse.findFirst({
    where: { userId, warehouseCode: safeWarehouseCode },
  });
  if (existing) {
    throw AppError.badRequest("Warehouse code already exists");
  }

  const normalizedPhone = normalizePhone(safePhoneNumber);

  const addressPayload: Record<string, unknown> = {
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
  let torodResponse: unknown;
  try {
    torodResponse = await createAddress(addressPayload);
  } catch (error) {
    if (error instanceof AppError) {
      console.log("TOROD ADDRESS CREATE ERROR:", {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details,
      });
      if (error.statusCode === 422 && type === "normal" && isDistrictMismatchError(error)) {
        const fallbackPayload: Record<string, unknown> = {
          ...addressPayload,
          type: "address_city",
          address: addressPayload.address ?? addressPayload.locate_address,
          locate_address: undefined,
          district_id: undefined,
        };
        storedType = "address_city";
        torodResponse = await createAddress(fallbackPayload);
      } else if (error.statusCode === 504) {
        const addressList = await listAddresses(1);
        const matches = extractList(addressList);
        const matched = matches.find((item) => {
          const entry = extractWarehouse(item);
          return entry?.code?.toLowerCase() === safeWarehouseCode.toLowerCase();
        });
        if (matched) {
          torodResponse = matched;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
  const torodRecord = (torodResponse ?? {}) as Record<string, unknown>;
  const torodAddressId = extractAddressId(torodRecord);
  const torodWarehouseCode = extractWarehouseCode(torodRecord);
  const finalWarehouseCode = torodWarehouseCode
    ? String(torodWarehouseCode)
    : safeWarehouseCode;

  const isDefault = toBoolean(payload.is_default) ?? false;
  const isReturnDefault = toBoolean(payload.is_return_default) ?? false;

  const created = await prisma.sellerWarehouse.create({
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
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { torodWarehouseId: created.warehouseCode },
    });
  }

  if (created.isReturnDefault) {
    await resolveReturnDefaultUpdates(userId, created.id);
  }

  return created;
};

export const updateSellerWarehouse = async (
  userId: number,
  warehouseId: number,
  payload: SellerWarehousePayload
) => {
  const existing = await prisma.sellerWarehouse.findFirst({
    where: { id: warehouseId, userId },
  });
  if (!existing) {
    throw AppError.notFound("Warehouse not found");
  }

  const updates: Prisma.SellerWarehouseUpdateInput = {
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

  const updated = await prisma.sellerWarehouse.update({
    where: { id: existing.id },
    data: updates,
  });

  if (isDefault) {
    await resolveDefaultUpdates(userId, updated.id);
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { torodWarehouseId: updated.warehouseCode },
    });
  }

  if (isReturnDefault) {
    await resolveReturnDefaultUpdates(userId, updated.id);
  }

  return updated;
};

export const deleteSellerWarehouse = async (userId: number, warehouseId: number) => {
  const existing = await prisma.sellerWarehouse.findFirst({
    where: { id: warehouseId, userId },
  });
  if (!existing) {
    throw AppError.notFound("Warehouse not found");
  }

  await prisma.sellerWarehouse.delete({ where: { id: existing.id } });

  if (existing.isDefault) {
    const nextDefault = await prisma.sellerWarehouse.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
    });
    await prisma.sellerProfile.updateMany({
      where: { userId },
      data: { torodWarehouseId: nextDefault?.warehouseCode ?? null },
    });
    if (nextDefault) {
      await prisma.sellerWarehouse.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }

  return { success: true };
};
