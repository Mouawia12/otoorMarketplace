-- AlterTable
ALTER TABLE `Post` MODIFY `description` TEXT NOT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `description_ar` TEXT NOT NULL,
    MODIFY `description_en` TEXT NOT NULL;
