SET @order_language_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'Order'
    AND column_name = 'language'
);
SET @order_language_sql := IF(
  @order_language_exists = 0,
  'ALTER TABLE `Order` ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT ''ar''',
  'SELECT 1'
);
PREPARE order_language_stmt FROM @order_language_sql;
EXECUTE order_language_stmt;
DEALLOCATE PREPARE order_language_stmt;
