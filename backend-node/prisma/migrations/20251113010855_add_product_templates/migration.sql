-- AlterTable
ALTER TABLE `Order` ADD COLUMN `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `shipping_method` VARCHAR(191) NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE `product_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_ar` VARCHAR(191) NOT NULL,
    `name_en` VARCHAR(191) NOT NULL,
    `description_ar` VARCHAR(191) NOT NULL,
    `description_en` VARCHAR(191) NOT NULL,
    `product_type` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `size_ml` INTEGER NOT NULL,
    `concentration` VARCHAR(191) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_template_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_id` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_template_images_template_id_idx`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_templates` ADD CONSTRAINT `product_templates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_template_images` ADD CONSTRAINT `product_template_images_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `product_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
