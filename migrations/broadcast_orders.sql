-- Broadcast / Marketplace Orders (drop-shipping style)
-- Customer creates ONE order broadcast to all tenants. First to accept wins.

CREATE TABLE IF NOT EXISTS `broadcast_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `broadcast_token` VARCHAR(64) NOT NULL UNIQUE,
  `customer_name` TEXT NOT NULL,
  `customer_phone` TEXT NOT NULL,
  `customer_email` TEXT NULL,
  `customer_address` TEXT NULL,
  `customer_lat` DECIMAL(10,7) NULL,
  `customer_lng` DECIMAL(10,7) NULL,
  `items` JSON NOT NULL,
  `notes` TEXT NULL,
  `estimated_total` DECIMAL(10,2) DEFAULT 0,
  `payment_method` TEXT NOT NULL,
  `status` TEXT NOT NULL,
  `claimed_by_tenant_id` INT NULL,
  `claimed_at` TIMESTAMP NULL,
  `online_order_id` INT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `cancelled_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_broadcast_claimed_tenant` FOREIGN KEY (`claimed_by_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL,
  INDEX `idx_broadcast_status_expires` (`status`(20), `expires_at`),
  INDEX `idx_broadcast_claimed_tenant` (`claimed_by_tenant_id`),
  INDEX `idx_broadcast_token` (`broadcast_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broadcast_order_recipients` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `broadcast_order_id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` INT NOT NULL,
  `response` TEXT NULL,
  `responded_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_broadcast_recipient_order` FOREIGN KEY (`broadcast_order_id`) REFERENCES `broadcast_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_broadcast_recipient_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uniq_broadcast_tenant` (`broadcast_order_id`, `tenant_id`),
  INDEX `idx_recipient_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
