-- CreateTable
CREATE TABLE `Promotion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('HERO', 'STRIP', 'FLOATING') NOT NULL DEFAULT 'HERO',
    `title_en` VARCHAR(191) NOT NULL,
    `title_ar` VARCHAR(191) NOT NULL,
    `subtitle_en` VARCHAR(191) NULL,
    `subtitle_ar` VARCHAR(191) NULL,
    `description_en` VARCHAR(191) NULL,
    `description_ar` VARCHAR(191) NULL,
    `badge_text_en` VARCHAR(191) NULL,
    `badge_text_ar` VARCHAR(191) NULL,
    `button_text_en` VARCHAR(191) NULL,
    `button_text_ar` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,
    `link_url` VARCHAR(191) NULL,
    `background_color` VARCHAR(191) NULL DEFAULT '#0f172a',
    `text_color` VARCHAR(191) NULL DEFAULT '#ffffff',
    `floating_position` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `start_at` DATETIME(3) NULL,
    `end_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
