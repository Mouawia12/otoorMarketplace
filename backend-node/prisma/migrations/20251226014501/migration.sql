/*
  Warnings:

  - You are about to alter the column `redbox_label_url` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(500)` to `VarChar(191)`.
  - You are about to alter the column `file_path` on the `perfume_import_jobs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(1024)` to `VarChar(191)`.
  - You are about to alter the column `error_file_path` on the `perfume_import_jobs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(1024)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `Order` MODIFY `customer_country` VARCHAR(191) NULL,
    MODIFY `cod_currency` VARCHAR(191) NULL,
    MODIFY `redbox_label_url` VARCHAR(191) NULL,
    MODIFY `redbox_status` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `perfume_import_jobs` MODIFY `file_path` VARCHAR(191) NOT NULL,
    MODIFY `error_file_path` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Order_redbox_shipment_id_idx` ON `Order`(`redbox_shipment_id`);

-- CreateIndex
CREATE INDEX `Order_redbox_tracking_number_idx` ON `Order`(`redbox_tracking_number`);
