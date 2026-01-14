"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPerfumeImportErrorsPath = exports.getPerfumeImportStatus = exports.createPerfumeImportJob = exports.resumePendingPerfumeImports = exports.enqueuePerfumeImport = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const sync_1 = require("csv-parse/sync");
const xlsx = __importStar(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const client_2 = require("../prisma/client");
const errors_1 = require("../utils/errors");
const uploads_1 = require("../utils/uploads");
const IMPORT_DIR = path_1.default.join((0, uploads_1.getUploadRoot)(), "perfume-imports");
const ERROR_DIR = path_1.default.join(IMPORT_DIR, "errors");
const IMAGE_DIR = path_1.default.join((0, uploads_1.getUploadRoot)(), "perfume-images");
const BATCH_SIZE = 500;
const ERROR_SAMPLE_LIMIT = 20;
const RETRY_DELAY_MS = 150;
const ROW_RETRY_COUNT = 1;
const ensureDir = (dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
ensureDir(IMPORT_DIR);
ensureDir(ERROR_DIR);
ensureDir(IMAGE_DIR);
const parseList = (value) => {
    if (!value)
        return null;
    const normalized = value.trim();
    if (!normalized)
        return null;
    return normalized
        .split(/\s*\|\s*/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
};
const normalizeString = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number")
        return value.toString();
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    return null;
};
const normalizeNumber = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        const normalized = trimmed.replace(/[٬,]/g, "").replace(/٫/g, ".");
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};
const normalizeInteger = (value) => {
    const num = normalizeNumber(value);
    if (num === null)
        return null;
    const intValue = Math.round(num);
    return Number.isFinite(intValue) ? intValue : null;
};
const getFileExtension = (filename) => path_1.default.extname(filename).toLowerCase();
const parseFile = async (filePath) => {
    const ext = getFileExtension(filePath);
    if (ext === ".xlsx") {
        const workbook = xlsx.readFile(filePath, { cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            return [];
        }
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) {
            return [];
        }
        return xlsx.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });
    }
    const content = await fs_1.default.promises.readFile(filePath, "utf8");
    return (0, sync_1.parse)(content, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
        trim: false,
    });
};
const mapRowToTemplate = (row) => {
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
    const fallbackDescEn = descriptionEn ??
        (ingredients && ingredients.length > 0 ? ingredients.join(", ") : null) ??
        nameEn;
    const fallbackDescAr = descriptionAr ??
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
const downloadImage = async (url, filename) => {
    const safeName = filename
        ? filename.replace(/[^a-z0-9\-.]+/gi, "-").toLowerCase()
        : `perfume-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const baseUrl = url.split("?")[0] ?? url;
    const ext = path_1.default.extname(baseUrl) || ".jpg";
    const storedName = `${safeName}${ext}`;
    const targetPath = path_1.default.join(IMAGE_DIR, storedName);
    const response = await axios_1.default.get(url, { responseType: "arraybuffer", timeout: 20000 });
    await fs_1.default.promises.writeFile(targetPath, Buffer.from(response.data));
    return (0, uploads_1.buildPublicUploadPath)(`perfume-images/${storedName}`);
};
const writeErrorRow = (stream, rowNumber, reason) => {
    const safeReason = reason.replace(/\r?\n/g, " ").replace(/"/g, "\"\"");
    stream.write(`${rowNumber},"${safeReason}"\n`);
};
const withRetry = async (fn, retries = ROW_RETRY_COUNT) => {
    try {
        return await fn();
    }
    catch (error) {
        if (retries <= 0)
            throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return withRetry(fn, retries - 1);
    }
};
const resolveCreatedById = async (jobId) => {
    const job = await client_2.prisma.perfumeImportJob.findUnique({
        where: { id: jobId },
        select: { createdById: true },
    });
    if (job?.createdById)
        return job.createdById;
    const adminUser = await client_2.prisma.user.findFirst({
        where: {
            roles: {
                some: {
                    role: { name: { in: [client_1.RoleName.ADMIN, client_1.RoleName.SUPER_ADMIN] } },
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
const updateJob = async (jobId, data) => {
    const updateData = {};
    if (data.status !== undefined)
        updateData.status = data.status;
    if (data.totalRows !== undefined)
        updateData.totalRows = data.totalRows;
    if (data.processedRows !== undefined)
        updateData.processedRows = data.processedRows;
    if (data.insertedRows !== undefined)
        updateData.insertedRows = data.insertedRows;
    if (data.updatedRows !== undefined)
        updateData.updatedRows = data.updatedRows;
    if (data.skippedRows !== undefined)
        updateData.skippedRows = data.skippedRows;
    if (data.failedRows !== undefined)
        updateData.failedRows = data.failedRows;
    if (data.errorCount !== undefined)
        updateData.errorCount = data.errorCount;
    if (data.errorSamples !== undefined) {
        updateData.errorSamples = data.errorSamples;
    }
    if (data.errorFilePath !== undefined)
        updateData.errorFilePath = data.errorFilePath;
    if (data.startedAt !== undefined)
        updateData.startedAt = data.startedAt;
    if (data.finishedAt !== undefined)
        updateData.finishedAt = data.finishedAt;
    await client_2.prisma.perfumeImportJob.update({
        where: { id: jobId },
        data: updateData,
    });
};
const runningJobs = new Set();
const enqueuePerfumeImport = async (jobId) => {
    if (runningJobs.has(jobId))
        return;
    runningJobs.add(jobId);
    setImmediate(async () => {
        try {
            await processPerfumeImport(jobId);
        }
        finally {
            runningJobs.delete(jobId);
        }
    });
};
exports.enqueuePerfumeImport = enqueuePerfumeImport;
const resumePendingPerfumeImports = async () => {
    const jobs = await client_2.prisma.perfumeImportJob.findMany({
        where: {
            status: { in: [client_1.PerfumeImportStatus.QUEUED, client_1.PerfumeImportStatus.PROCESSING] },
        },
        select: { id: true },
    });
    jobs.forEach((job) => (0, exports.enqueuePerfumeImport)(job.id));
};
exports.resumePendingPerfumeImports = resumePendingPerfumeImports;
const createPerfumeImportJob = async (params) => {
    const job = await client_2.prisma.perfumeImportJob.create({
        data: {
            status: client_1.PerfumeImportStatus.QUEUED,
            mode: params.mode,
            storedFilename: params.storedFilename,
            filePath: params.filePath,
            originalFilename: params.originalFilename,
            downloadImages: params.downloadImages,
            createdById: params.createdById ?? null,
        },
    });
    (0, exports.enqueuePerfumeImport)(job.id);
    return job;
};
exports.createPerfumeImportJob = createPerfumeImportJob;
const getPerfumeImportStatus = async (jobId) => {
    const job = await client_2.prisma.perfumeImportJob.findUnique({
        where: { id: jobId },
    });
    if (!job) {
        throw errors_1.AppError.notFound("Import job not found");
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
exports.getPerfumeImportStatus = getPerfumeImportStatus;
const getPerfumeImportErrorsPath = async (jobId) => {
    const job = await client_2.prisma.perfumeImportJob.findUnique({
        where: { id: jobId },
        select: { errorFilePath: true, errorCount: true },
    });
    if (!job || !job.errorFilePath || job.errorCount === 0) {
        throw errors_1.AppError.notFound("No errors available for this import");
    }
    return job.errorFilePath;
};
exports.getPerfumeImportErrorsPath = getPerfumeImportErrorsPath;
const processPerfumeImport = async (jobId) => {
    const job = await client_2.prisma.perfumeImportJob.findUnique({ where: { id: jobId } });
    if (!job)
        return;
    if (!fs_1.default.existsSync(job.filePath)) {
        await updateJob(jobId, {
            status: client_1.PerfumeImportStatus.FAILED,
            finishedAt: new Date(),
            errorCount: job.errorCount + 1,
            errorSamples: [{ row: 0, reason: "Import file not found" }],
        });
        return;
    }
    const startedAt = new Date();
    await updateJob(jobId, { status: client_1.PerfumeImportStatus.PROCESSING, startedAt });
    const errorFilePath = path_1.default.join(ERROR_DIR, `perfume-import-${jobId}.csv`);
    const errorStream = fs_1.default.createWriteStream(errorFilePath, { encoding: "utf8" });
    errorStream.write("row,reason\n");
    await updateJob(jobId, { errorFilePath });
    let totalRows = 0;
    let processedRows = 0;
    let insertedRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;
    let errorCount = 0;
    const errorSamples = [];
    try {
        const rows = await parseFile(job.filePath);
        totalRows = rows.length;
        await updateJob(jobId, { totalRows, errorFilePath });
        if (job.mode === client_1.PerfumeImportMode.REPLACE) {
            await client_2.prisma.productTemplate.deleteMany({});
        }
        const createdById = await resolveCreatedById(jobId);
        for (let start = 0; start < rows.length; start += BATCH_SIZE) {
            const batch = rows.slice(start, start + BATCH_SIZE);
            if (job.mode === client_1.PerfumeImportMode.INSERT_ONLY || job.mode === client_1.PerfumeImportMode.REPLACE) {
                for (let index = 0; index < batch.length; index += 1) {
                    const raw = batch[index];
                    if (!raw) {
                        continue;
                    }
                    const rowNumber = start + index + 2;
                    try {
                        const mapped = mapRowToTemplate(raw);
                        let imageLink = mapped.imageLink;
                        if (job.downloadImages && mapped.imageLink) {
                            try {
                                imageLink = await downloadImage(mapped.imageLink, mapped.imageName ?? null);
                            }
                            catch (error) {
                                console.warn("Image download failed", error);
                            }
                        }
                        const existing = await client_2.prisma.productTemplate.findFirst({
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
                        await withRetry(() => {
                            const data = {
                                nameEn: mapped.nameEn,
                                nameAr: mapped.nameAr ?? mapped.nameEn,
                                brand: mapped.brand,
                                productType: mapped.productType,
                                category: mapped.category,
                                basePrice: new client_1.Prisma.Decimal(mapped.basePrice),
                                sizeMl: mapped.sizeMl,
                                concentration: mapped.concentration,
                                descriptionEn: mapped.descriptionEn,
                                descriptionAr: mapped.descriptionAr,
                                createdBy: { connect: { id: createdById } },
                            };
                            if (imageLink) {
                                data.images = {
                                    create: [
                                        {
                                            url: imageLink,
                                            sortOrder: 0,
                                        },
                                    ],
                                };
                            }
                            return client_2.prisma.productTemplate.create({ data });
                        });
                        insertedRows += 1;
                    }
                    catch (error) {
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
            }
            else {
                for (let index = 0; index < batch.length; index += 1) {
                    const raw = batch[index];
                    if (!raw) {
                        continue;
                    }
                    const rowNumber = start + index + 2;
                    try {
                        const mapped = mapRowToTemplate(raw);
                        let imageLink = mapped.imageLink;
                        if (job.downloadImages && mapped.imageLink) {
                            try {
                                imageLink = await downloadImage(mapped.imageLink, mapped.imageName ?? null);
                            }
                            catch (error) {
                                console.warn("Image download failed", error);
                            }
                        }
                        const existing = await client_2.prisma.productTemplate.findFirst({
                            where: {
                                nameEn: mapped.nameEn,
                                brand: mapped.brand,
                            },
                            select: { id: true },
                        });
                        if (existing) {
                            await withRetry(() => {
                                const data = {
                                    nameEn: mapped.nameEn,
                                    nameAr: mapped.nameAr ?? mapped.nameEn,
                                    brand: mapped.brand,
                                    productType: mapped.productType,
                                    category: mapped.category,
                                    basePrice: new client_1.Prisma.Decimal(mapped.basePrice),
                                    sizeMl: mapped.sizeMl,
                                    concentration: mapped.concentration,
                                    descriptionEn: mapped.descriptionEn,
                                    descriptionAr: mapped.descriptionAr,
                                };
                                if (imageLink) {
                                    data.images = {
                                        deleteMany: {},
                                        create: [
                                            {
                                                url: imageLink,
                                                sortOrder: 0,
                                            },
                                        ],
                                    };
                                }
                                return client_2.prisma.productTemplate.update({
                                    where: { id: existing.id },
                                    data,
                                });
                            });
                            updatedRows += 1;
                        }
                        else {
                            await withRetry(() => {
                                const data = {
                                    nameEn: mapped.nameEn,
                                    nameAr: mapped.nameAr ?? mapped.nameEn,
                                    brand: mapped.brand,
                                    productType: mapped.productType,
                                    category: mapped.category,
                                    basePrice: new client_1.Prisma.Decimal(mapped.basePrice),
                                    sizeMl: mapped.sizeMl,
                                    concentration: mapped.concentration,
                                    descriptionEn: mapped.descriptionEn,
                                    descriptionAr: mapped.descriptionAr,
                                    createdBy: { connect: { id: createdById } },
                                };
                                if (imageLink) {
                                    data.images = {
                                        create: [
                                            {
                                                url: imageLink,
                                                sortOrder: 0,
                                            },
                                        ],
                                    };
                                }
                                return client_2.prisma.productTemplate.create({ data });
                            });
                            insertedRows += 1;
                        }
                    }
                    catch (error) {
                        failedRows += 1;
                        errorCount += 1;
                        const reason = error?.message ?? "Failed to import row";
                        writeErrorRow(errorStream, rowNumber, reason);
                        if (errorSamples.length < ERROR_SAMPLE_LIMIT) {
                            errorSamples.push({ row: rowNumber, reason });
                        }
                    }
                    finally {
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
            status: client_1.PerfumeImportStatus.COMPLETED,
            processedRows,
            insertedRows,
            updatedRows,
            skippedRows,
            failedRows,
            errorCount,
            errorSamples,
            finishedAt: new Date(),
        });
    }
    catch (error) {
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
            status: client_1.PerfumeImportStatus.FAILED,
            failedRows,
            errorCount: Math.max(errorCount, failedRows),
            errorSamples,
            finishedAt: new Date(),
        });
    }
    finally {
        await new Promise((resolve) => errorStream.end(resolve));
    }
};
//# sourceMappingURL=perfumeImportService.js.map