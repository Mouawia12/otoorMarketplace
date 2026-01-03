/*
  Warnings:

  - You are about to alter the column `file_path` on the `perfume_import_jobs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(1024)` to `VarChar(191)`.
  - You are about to alter the column `error_file_path` on the `perfume_import_jobs` table. The data in that column could be lost. The data in that column will be cast from `VarChar(1024)` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `perfume_import_jobs` MODIFY `file_path` VARCHAR(191) NOT NULL,
    MODIFY `error_file_path` VARCHAR(191) NULL;
