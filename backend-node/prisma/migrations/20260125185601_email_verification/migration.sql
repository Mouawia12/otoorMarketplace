-- AlterTable
ALTER TABLE `User` ADD COLUMN `email_verification_sent_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token_expires_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token_hash` VARCHAR(191) NULL,
    ADD COLUMN `email_verified` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `manual_shipments` MODIFY `label_url` VARCHAR(191) NULL,
    MODIFY `address` VARCHAR(191) NOT NULL,
    MODIFY `weight` DOUBLE NOT NULL,
    MODIFY `item_description` VARCHAR(191) NULL;
