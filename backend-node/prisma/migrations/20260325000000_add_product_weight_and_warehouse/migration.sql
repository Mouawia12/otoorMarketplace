ALTER TABLE `Product`
  ADD COLUMN `seller_warehouse_id` INT NULL,
  ADD COLUMN `weight_kg` DECIMAL(10,3) NULL,
  ADD INDEX `Product_seller_warehouse_id_idx` (`seller_warehouse_id`),
  ADD CONSTRAINT `Product_seller_warehouse_id_fkey`
    FOREIGN KEY (`seller_warehouse_id`) REFERENCES `seller_warehouses` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
