-- AlterTable
ALTER TABLE `Order` ADD COLUMN `coupon_code` VARCHAR(191) NULL,
    ADD COLUMN `coupon_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `Coupon` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `discount_type` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `expires_at` DATETIME(3) NULL,
    `max_usage` INTEGER NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Coupon_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Order_coupon_id_idx` ON `Order`(`coupon_id`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
