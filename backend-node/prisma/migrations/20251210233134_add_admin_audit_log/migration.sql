-- AlterTable
ALTER TABLE `admin_audit_logs` ADD COLUMN `actor_type` VARCHAR(191) NOT NULL DEFAULT 'admin';
