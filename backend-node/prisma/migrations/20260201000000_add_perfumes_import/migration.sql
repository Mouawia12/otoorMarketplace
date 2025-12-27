-- CreateTable
CREATE TABLE `perfumes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_url` VARCHAR(191) NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `name_ar` VARCHAR(191) NULL,
    `brand` VARCHAR(191) NOT NULL,
    `brand_ar` VARCHAR(191) NULL,
    `ingredients` JSON NULL,
    `ingredients_ar` JSON NULL,
    `family` VARCHAR(191) NULL,
    `family_ar` VARCHAR(191) NULL,
    `sub_family` VARCHAR(191) NULL,
    `sub_family_ar` VARCHAR(191) NULL,
    `description_en` TEXT NULL,
    `description_ar` TEXT NULL,
    `class` VARCHAR(191) NULL,
    `perfumer` VARCHAR(191) NULL,
    `price` DECIMAL(10, 2) NULL,
    `origin` VARCHAR(191) NULL,
    `origin_ar` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `gender_ar` VARCHAR(191) NULL,
    `year` INTEGER NULL,
    `concepts` JSON NULL,
    `concepts_ar` JSON NULL,
    `image_link` VARCHAR(191) NULL,
    `image_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `perfumes_source_url_key`(`source_url`),
    UNIQUE INDEX `perfumes_name_en_brand_year_key`(`name_en`, `brand`, `year`),
    INDEX `perfumes_name_en_idx`(`name_en`),
    INDEX `perfumes_brand_idx`(`brand`),
    INDEX `perfumes_gender_idx`(`gender`),
    INDEX `perfumes_family_idx`(`family`),
    INDEX `perfumes_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfume_import_jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `mode` ENUM('INSERT_ONLY', 'UPSERT', 'REPLACE') NOT NULL,
    `original_filename` VARCHAR(191) NOT NULL,
    `stored_filename` VARCHAR(191) NOT NULL,
    `file_path` VARCHAR(1024) NOT NULL,
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `processed_rows` INTEGER NOT NULL DEFAULT 0,
    `inserted_rows` INTEGER NOT NULL DEFAULT 0,
    `updated_rows` INTEGER NOT NULL DEFAULT 0,
    `skipped_rows` INTEGER NOT NULL DEFAULT 0,
    `failed_rows` INTEGER NOT NULL DEFAULT 0,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `error_file_path` VARCHAR(1024) NULL,
    `error_samples` JSON NULL,
    `download_images` BOOLEAN NOT NULL DEFAULT false,
    `created_by_id` INTEGER NULL,
    `started_at` DATETIME(3) NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `perfume_import_jobs_status_idx`(`status`),
    INDEX `perfume_import_jobs_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `perfume_import_jobs` ADD CONSTRAINT `perfume_import_jobs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
