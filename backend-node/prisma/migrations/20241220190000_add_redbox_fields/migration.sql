-- Add RedBox / COD fields to orders
ALTER TABLE `orders`
  ADD COLUMN `customer_city_code` VARCHAR(191) NULL AFTER `shipping_address`,
  ADD COLUMN `customer_country` VARCHAR(10) NULL AFTER `customer_city_code`,
  ADD COLUMN `platform_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER `total_amount`,
  ADD COLUMN `cod_amount` DECIMAL(10, 2) NULL AFTER `platform_fee`,
  ADD COLUMN `cod_currency` VARCHAR(10) NULL AFTER `cod_amount`,
  ADD COLUMN `redbox_point_id` VARCHAR(191) NULL AFTER `cod_currency`,
  ADD COLUMN `redbox_shipment_id` VARCHAR(191) NULL AFTER `redbox_point_id`,
  ADD COLUMN `redbox_tracking_number` VARCHAR(191) NULL AFTER `redbox_shipment_id`,
  ADD COLUMN `redbox_label_url` VARCHAR(500) NULL AFTER `redbox_tracking_number`,
  ADD COLUMN `redbox_status` VARCHAR(100) NULL AFTER `redbox_label_url`;
