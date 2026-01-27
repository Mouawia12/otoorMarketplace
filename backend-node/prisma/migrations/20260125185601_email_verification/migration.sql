-- AlterTable
ALTER TABLE `User` ADD COLUMN `email_verification_sent_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token_expires_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token_hash` VARCHAR(191) NULL,
    ADD COLUMN `email_verified` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable (guarded for environments where manual_shipments isn't created yet)
SET @manual_shipments_exists := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'manual_shipments'
);
SET @manual_shipments_sql := IF(
  @manual_shipments_exists > 0,
  'ALTER TABLE `manual_shipments` MODIFY `label_url` VARCHAR(191) NULL, MODIFY `address` VARCHAR(191) NOT NULL, MODIFY `weight` DOUBLE NOT NULL, MODIFY `item_description` VARCHAR(191) NULL',
  'SELECT 1'
);
PREPARE manual_shipments_stmt FROM @manual_shipments_sql;
EXECUTE manual_shipments_stmt;
DEALLOCATE PREPARE manual_shipments_stmt;
