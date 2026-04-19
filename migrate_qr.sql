-- Create table_qr_codes table for QR code management
CREATE TABLE IF NOT EXISTS `table_qr_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `table_id` INT NOT NULL,
  `branch_id` INT,
  `qr_token` VARCHAR(64) NOT NULL UNIQUE,
  `table_name` TEXT NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `scanned_count` INT DEFAULT 0,
  `last_scanned_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add dine-in columns to online_orders
ALTER TABLE `online_orders` ADD COLUMN `table_number` TEXT DEFAULT NULL;
ALTER TABLE `online_orders` ADD COLUMN `table_qr_token` VARCHAR(64) DEFAULT NULL;
