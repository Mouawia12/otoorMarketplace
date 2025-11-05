import { Prisma } from "@prisma/client";

const isDecimal = (value: unknown): value is Prisma.Decimal => {
  return value instanceof Prisma.Decimal;
};

export const toPlainObject = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => toPlainObject(item)) as T;
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>).map(
      ([key, value]) => {
        if (isDecimal(value)) {
          return [key, value.toNumber()];
        }

        if (value instanceof Date) {
          return [key, value.toISOString()];
        }

        return [key, toPlainObject(value)];
      }
    );

    return Object.fromEntries(entries) as T;
  }

  return data;
};
