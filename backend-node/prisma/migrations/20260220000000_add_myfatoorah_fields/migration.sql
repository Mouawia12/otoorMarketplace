-- Add MyFatoorah payment fields to orders
ALTER TABLE `Order`
  ADD COLUMN `myfatoorah_method_id` INT NULL AFTER `payment_method`,
  ADD COLUMN `myfatoorah_method_code` VARCHAR(191) NULL AFTER `myfatoorah_method_id`,
  ADD COLUMN `myfatoorah_invoice_id` VARCHAR(191) NULL AFTER `myfatoorah_method_code`,
  ADD COLUMN `myfatoorah_payment_id` VARCHAR(191) NULL AFTER `myfatoorah_invoice_id`,
  ADD COLUMN `myfatoorah_payment_url` VARCHAR(600) NULL AFTER `myfatoorah_payment_id`,
  ADD COLUMN `myfatoorah_status` VARCHAR(191) NULL AFTER `myfatoorah_payment_url`;

CREATE INDEX `Order_myfatoorah_invoice_id_idx` ON `Order`(`myfatoorah_invoice_id`);
CREATE INDEX `Order_myfatoorah_payment_id_idx` ON `Order`(`myfatoorah_payment_id`);
