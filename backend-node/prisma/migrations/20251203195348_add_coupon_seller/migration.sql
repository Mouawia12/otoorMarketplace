-- AlterTable
ALTER TABLE `Coupon` ADD COLUMN `seller_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Coupon_seller_id_idx` ON `Coupon`(`seller_id`);

-- AddForeignKey
ALTER TABLE `Coupon` ADD CONSTRAINT `Coupon_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
