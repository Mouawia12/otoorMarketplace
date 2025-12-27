import fs from "fs";
import path from "path";
import { Prisma, PerfumeImportMode, PerfumeImportStatus, RoleName } from "@prisma/client";
import { parse as parseCsv } from "csv-parse/sync";
import * as xlsx from "xlsx";
import axios from "axios";

import { prisma } from "../prisma/client";
import { AppError } from "../utils/errors";
import { getUploadRoot, buildPublicUploadPath } from "../utils/uploads";

const IMPORT_DIR = path.join(getUploadRoot(), "perfume-imports");
const ERROR_DIR = path.join(IMPORT_DIR, "errors");
const IMAGE_DIR = path.join(getUploadRoot(), "perfume-images");
const BATCH_SIZE = 500;
const ERROR_SAMPLE_LIMIT = 20;
const RETRY_DELAY_MS = 150;
const ROW_RETRY_COUNT = 1;

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(IMPORT_DIR);
ensureDir(ERROR_DIR);
ensureDir(IMAGE_DIR);

const parseList = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized
    .split(/\s*\|\s*/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeString = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/[٬,]/g, "").replace(/٫/g, ".");
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeInteger = (value: unknown) => {
  const num = normalizeNumber(value);
  if (num === null) return null;
  const intValue = Math.round(num);
  return Number.isFinite(intValue) ? intValue : null;
};

const getFileExtension = (filename: string) => path.extname(filename).toLowerCase();

const parseFile = async (filePath: string) => {
  const ext = getFileExtension(filePath);
  if (ext === ".xlsx") {
    const workbook = xlsx.readFile(filePath, { cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
  }

  const content = await fs.promises.readFile(filePath, "utf8");
  return parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: false,
  }) as Record<string, unknown>[];
};

const mapRowToTemplate = (row: Record<string, unknown>) => {
  const sourceUrl = normalizeString(row.SourceURL);
  const nameEn = normalizeString(row.Name) ?? normalizeString(row.Name_ar);
  const nameAr = normalizeString(row.Name_ar);
  const brand = normalizeString(row.Brand) ?? normalizeString(row.Brand_ar);
  const ingredients = parseList(normalizeString(row.Ingredients) ?? "");
  const ingredientsAr = parseList(normalizeString(row.Ingredients_ar) ?? "");
  const family = normalizeString(row.Family);
  const subFamily = normalizeString(row.SubFamily);
  const descriptionEn = normalizeString(row.Description);
  const descriptionAr = normalizeString(row.Description_ar);
  const perfumeClass = normalizeString(row.Class);
  const price = normalizeNumber(row.Price);
  const imageLink = normalizeString(row.ImageLink);
  const imageName = normalizeString(row.ImageName);

  if (!nameEn) {
    throw new Error("Missing name");
  }
  if (!brand) {
    throw new Error("Missing brand");
  }

  const fallbackDescEn =
    descriptionEn ??
    (ingredients && ingredients.length > 0 ? ingredients.join(", ") : null) ??
    nameEn;
  const fallbackDescAr =
    descriptionAr ??
    (ingredientsAr && ingredientsAr.length > 0 ? ingredientsAr.join("، ") : null) ??
    nameAr ??
    nameEn;

  return {
    sourceUrl,
    nameEn,
    nameAr,
    brand,
    category: family ?? subFamily ?? "Perfume",
    descriptionEn: fallbackDescEn,
    descriptionAr: fallbackDescAr,
    productType: perfumeClass ?? "EDP",
    concentration: perfumeClass ?? "EDP",
    basePrice: price ?? 0,
    sizeMl: 100,
    imageLink,
    imageName,
  };
};

const downloadImage = async (url: string, filename: string | null) => {
  const safeName = filename
    ? filename.replace(/[^a-z0-9\-.]+/gi, "-").toLowerCase()
    : `perfume-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(url.split("?")[0]) || ".jpg";
  const storedName = `${safeName}${ext}`;
  const targetPath = path.join(IMAGE_DIR, storedName);

  const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer", timeout: 20000 });
  await fs.promises.writeFile(targetPath, Buffer.from(response.data));

  return buildPublicUploadPath(`perfume-images/${storedName}`);
};

const writeErrorRow = (stream: fs.WriteStream, rowNumber: number, reason: string) => {
  const safeReason = reason.replace(/\r?\n/g, " ").replace(/"/g, "\"\"");
  stream.write(`${rowNumber},"${safeReason}"\n`);
};

const withRetry = async <T>(fn: () => Promise<T>, retries = ROW_RETRY_COUNT): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return withRetry(fn, retries - 1);
  }
};

const resolveCreatedById = async (jobId: number) => {
  const job = await prisma.perfumeImportJob.findUnique({
    where: { id: jobId },
    select: { createdById: true },
  });

  if (job?.createdById) return job.createdById;

  const adminUser = await prisma.user.findFirst({
    where: {
      roles: {
        some: {
          role: { name: { in: [RoleName.ADMIN, RoleName.SUPER_ADMIN] } },
        },
      },
    },
    select: { id: true },
  });

  if (!adminUser) {
    throw new Error("No admin user available to own templates");
  }

  return adminUser.id;
};

const updateJob = async (
  jobId: number,
  data: Partial<{
    status: PerfumeImportStatus;
    totalRows: number;
    processedRows: number;
    insertedRows: number;
    updatedRows: number;
    skippedRows: number;
    failedRows: number;
    errorCount: number;
    errorSamples: Array<{ row: number; reason: string }>;
    errorFilePath: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>
) => {
  await prisma.perfumeImportJob.update({
    where: { id: jobId },
    data: {
      status: data.status,
      totalRows: data.totalRows,
      processedRows: data.processedRows,
      insertedRows: data.insertedRows,
      updatedRows: data.updatedRows,
      skippedRows: data.skippedRows,
      failedRows: data.failedRows,
      errorCount: data.errorCount,
      errorSamples: data.errorSamples as Prisma.JsonArray | undefined,
      errorFilePath: data.errorFilePath ?? undefined,
      startedAt: data.startedAt ?? undefined,
      finishedAt: data.finishedAt ?? undefined,
    },
  });
};

const runningJobs = new Set<number>();

export const enqueuePerfumeImport = async (jobId: number) => {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);
  setImmediate(async () => {
    try {
      await processPerfumeImport(jobId);
    } finally {
      runningJobs.delete(jobId);
    }
  });
};

export const resumePendingPerfumeImports = async () => {
  const jobs = await prisma.perfumeImportJob.findMany({
    where: {
      status: { in: [PerfumeImportStatus.QUEUED, PerfumeImportStatus.PROCESSING] },
    },
    select: { id: true },
  });

  jobs.forEach((job) => enqueuePerfumeImport(job.id));
};

export const createPerfumeImportJob = async (params: {
  storedFilename: string;
  filePath: string;
  originalFilename: string;
  mode: PerfumeImportMode;
  downloadImages: boolean;
  createdById?: number | null;
}) => {
  const job = await prisma.perfumeImportJob.create({
    data: {
      status: PerfumeImportStatus.QUEUED,
      mode: params.mode,
      storedFilename: params.storedFilename,
      filePath: params.filePath,
      originalFilename: params.originalFilename,
      downloadImages: params.downloadImages,
      createdById: params.createdById ?? null,
    },
  });

  enqueuePerfumeImport(job.id);
  return job;
};

export const getPerfumeImportStatus = async (jobId: number) => {
  const job = await prisma.perfumeImportJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    throw AppError.notFound("Import job not found");
  }

  return {
    jobId: job.id,
    status: job.status.toLowerCase(),
    mode: job.mode.toLowerCase(),
    total_rows: job.totalRows,
    processed_rows: job.processedRows,
    inserted_rows: job.insertedRows,
    updated_rows: job.updatedRows,
    skipped_rows: job.skippedRows,
    failed_rows: job.failedRows,
    error_count: job.errorCount,
    error_samples: job.errorSamples ?? [],
    started_at: job.startedAt,
    finished_at: job.finishedAt,
    errors_ready: Boolean(job.errorFilePath && job.errorCount > 0),
  };
};

export const getPerfumeImportErrorsPath = async (jobId: number) => {
  const job = await prisma.perfumeImportJob.findUnique({
    where: { id: jobId },
    select: { errorFilePath: true, errorCount: true },
  });

  if (!job || !job.errorFilePath || job.errorCount === 0) {
    throw AppError.notFound("No errors available for this import");
  }

  return job.errorFilePath;
};

const processPerfumeImport = async (jobId: number) => {
  const job = await prisma.perfumeImportJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (!fs.existsSync(job.filePath)) {
    await updateJob(jobId, {
      status: PerfumeImportStatus.FAILED,
      finishedAt: new Date(),
      errorCount: job.errorCount + 1,
      errorSamples: [{ row: 0, reason: "Import file not found" }],
    });
    return;
  }

  const startedAt = new Date();
  await updateJob(jobId, { status: PerfumeImportStatus.PROCESSING, startedAt });

  const errorFilePath = path.join(ERROR_DIR, `perfume-import-${jobId}.csv`);
  const errorStream = fs.createWriteStream(errorFilePath, { encoding: "utf8" });
  errorStream.write("row,reason\n");
  await updateJob(jobId, { errorFilePath });

  let totalRows = 0;
  let processedRows = 0;
  let insertedRows = 0;
  let updatedRows = 0;
  let skippedRows = 0;
  let failedRows = 0;
  let errorCount = 0;
  const errorSamples: Array<{ row: number; reason: string }> = [];

  try {
    const rows = await parseFile(job.filePath);
    totalRows = rows.length;
    await updateJob(jobId, { totalRows, errorFilePath });

    if (job.mode === PerfumeImportMode.REPLACE) {
      await prisma.productTemplate.deleteMany({});
    }

    const createdById = await resolveCreatedById(jobId);

    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const batch = rows.slice(start, start + BATCH_SIZE);

      if (job.mode === PerfumeImportMode.INSERT_ONLY || job.mode === PerfumeImportMode.REPLACE) {

        for (let index = 0; index < batch.length; index += 1) {
          const raw = batch[index];
          const rowNumber = start + index + 2;
          try {
            const mapped = mapRowToTemplate(raw);
            let imageLink = mapped.imageLink;

            if (job.downloadImages && mapped.imageLink) {
              try {
                imageLink = await downloadImage(mapped.imageLink, mapped.imageName ?? null);
              } catch (error) {
                console.warn("Image download failed", error);
              }
            }

            const existing = await prisma.productTemplate.findFirst({
              where: {
                nameEn: mapped.nameEn,
                brand: mapped.brand,
              },
              select: { id: true },
            });

            if (existing) {
              skippedRows += 1;
              continue;
            }

            await withRetry(() =>
              prisma.productTemplate.create({
                data: {
                  nameEn: mapped.nameEn,
                  nameAr: mapped.nameAr ?? mapped.nameEn,
                  brand: mapped.brand,
                  productType: mapped.productType,
                  category: mapped.category,
                  basePrice: new Prisma.Decimal(mapped.basePrice),
                  sizeMl: mapped.sizeMl,
                  concentration: mapped.concentration,
                  descriptionEn: mapped.descriptionEn,
                  descriptionAr: mapped.descriptionAr,
                  createdById,
                  images: imageLink
                    ? {
                        create: [
                          {
                            url: imageLink,
                            sortOrder: 0,
                          },
                        ],
                      }
                    : undefined,
                },
              })
            );
            insertedRows += 1;
          } catch (error: any) {
            failedRows += 1;
            errorCount += 1;
            const reason = error?.message ?? "Invalid row";
            writeErrorRow(errorStream, rowNumber, reason);
            if (errorSamples.length < ERROR_SAMPLE_LIMIT) {
              errorSamples.push({ row: rowNumber, reason });
            }
          }
        }

        processedRows += batch.length;
      } else {
        for (let index = 0; index < batch.length; index += 1) {
          const raw = batch[index];
          const rowNumber = start + index + 2;
          try {
            const mapped = mapRowToTemplate(raw);
            let imageLink = mapped.imageLink;

            if (job.downloadImages && mapped.imageLink) {
              try {
                imageLink = await downloadImage(mapped.imageLink, mapped.imageName ?? null);
              } catch (error) {
                console.warn("Image download failed", error);
              }
            }

            const existing = await prisma.productTemplate.findFirst({
              where: {
                nameEn: mapped.nameEn,
                brand: mapped.brand,
              },
              select: { id: true },
            });

            if (existing) {
              await withRetry(() =>
                prisma.productTemplate.update({
                  where: { id: existing.id },
                  data: {
                    nameEn: mapped.nameEn,
                    nameAr: mapped.nameAr ?? mapped.nameEn,
                    brand: mapped.brand,
                    productType: mapped.productType,
                    category: mapped.category,
                    basePrice: new Prisma.Decimal(mapped.basePrice),
                    sizeMl: mapped.sizeMl,
                    concentration: mapped.concentration,
                    descriptionEn: mapped.descriptionEn,
                    descriptionAr: mapped.descriptionAr,
                    images: imageLink
                      ? {
                          deleteMany: {},
                          create: [
                            {
                              url: imageLink,
                              sortOrder: 0,
                            },
                          ],
                        }
                      : undefined,
                  },
                })
              );
              updatedRows += 1;
            } else {
              await withRetry(() =>
                prisma.productTemplate.create({
                  data: {
                    nameEn: mapped.nameEn,
                    nameAr: mapped.nameAr ?? mapped.nameEn,
                    brand: mapped.brand,
                    productType: mapped.productType,
                    category: mapped.category,
                    basePrice: new Prisma.Decimal(mapped.basePrice),
                    sizeMl: mapped.sizeMl,
                    concentration: mapped.concentration,
                    descriptionEn: mapped.descriptionEn,
                    descriptionAr: mapped.descriptionAr,
                    createdById,
                    images: imageLink
                      ? {
                          create: [
                            {
                              url: imageLink,
                              sortOrder: 0,
                            },
                          ],
                        }
                      : undefined,
                  },
                })
              );
              insertedRows += 1;
            }
          } catch (error: any) {
            failedRows += 1;
            errorCount += 1;
            const reason = error?.message ?? "Failed to import row";
            writeErrorRow(errorStream, rowNumber, reason);
            if (errorSamples.length < ERROR_SAMPLE_LIMIT) {
              errorSamples.push({ row: rowNumber, reason });
            }
          } finally {
            processedRows += 1;
          }
        }
      }

      await updateJob(jobId, {
        processedRows,
        insertedRows,
        updatedRows,
        skippedRows,
        failedRows,
        errorCount,
        errorSamples,
      });
    }

    await updateJob(jobId, {
      status: PerfumeImportStatus.COMPLETED,
      processedRows,
      insertedRows,
      updatedRows,
      skippedRows,
      failedRows,
      errorCount,
      errorSamples,
      finishedAt: new Date(),
    });
  } catch (error) {
    console.error("Perfume import failed", error);
    if (errorCount === 0) {
      const reason = error instanceof Error ? error.message : "Import failed";
      failedRows = Math.max(failedRows, 1);
      errorCount = Math.max(errorCount, 1);
      writeErrorRow(errorStream, 0, reason);
      if (errorSamples.length < ERROR_SAMPLE_LIMIT) {
        errorSamples.push({ row: 0, reason });
      }
    }
    await updateJob(jobId, {
      status: PerfumeImportStatus.FAILED,
      failedRows,
      errorCount: Math.max(errorCount, failedRows),
      errorSamples,
      finishedAt: new Date(),
    });
  } finally {
    await new Promise((resolve) => errorStream.end(resolve));
  }
};
