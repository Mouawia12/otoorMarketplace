-- AlterTable
ALTER TABLE `User` ADD COLUMN `requires_password_reset` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `FooterPage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `draft_content` JSON NOT NULL,
    `published_content` JSON NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `published_at` DATETIME(3) NULL,
    `updated_by_id` INTEGER NULL,
    `published_by_id` INTEGER NULL,

    UNIQUE INDEX `FooterPage_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FooterPage` ADD CONSTRAINT `FooterPage_updated_by_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FooterPage` ADD CONSTRAINT `FooterPage_published_by_id_fkey` FOREIGN KEY (`published_by_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
