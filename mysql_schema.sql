SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `super_admins` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `email` VARCHAR(500) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `role` TEXT DEFAULT 'super_admin',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `super_admins_email_unique` (`email`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `business_name` TEXT NOT NULL,
  `owner_name` TEXT NOT NULL,
  `owner_email` VARCHAR(500) NOT NULL,
  `owner_phone` TEXT,
  `password_hash` TEXT,
  `address` TEXT,
  `logo` TEXT,
  `status` TEXT DEFAULT 'active',
  `max_branches` INT DEFAULT 1,
  `max_employees` INT DEFAULT 5,
  `store_type` TEXT DEFAULT 'supermarket',
  `metadata` JSON,
  `setup_completed` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `tenants_owner_email_unique` (`owner_email`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `branches` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `address` TEXT,
  `phone` TEXT,
  `email` TEXT,
  `logo` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_main` TINYINT(1) DEFAULT 0,
  `currency` TEXT DEFAULT 'CHF',
  `tax_rate` DECIMAL(5,2) DEFAULT 0,
  `delivery_fee` DECIMAL(10,2) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `email` TEXT,
  `phone` TEXT,
  `pin` TEXT NOT NULL,
  `role` TEXT NOT NULL DEFAULT 'cashier',
  `branch_id` INT,
  `is_active` TINYINT(1) DEFAULT 1,
  `hourly_rate` DECIMAL(10,2),
  `commission_rate` DECIMAL(5,2) DEFAULT 0,
  `avatar` TEXT,
  `permissions` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `name_ar` TEXT,
  `color` TEXT DEFAULT '#7C3AED',
  `icon` TEXT DEFAULT 'grid',
  `image` TEXT,
  `parent_id` INT,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `name_ar` TEXT,
  `description` TEXT,
  `sku` VARCHAR(500),
  `barcode` TEXT,
  `category_id` INT,
  `price` DECIMAL(10,2) NOT NULL,
  `cost_price` DECIMAL(10,2),
  `image` TEXT,
  `unit` TEXT DEFAULT 'piece',
  `taxable` TINYINT(1) DEFAULT 1,
  `track_inventory` TINYINT(1) DEFAULT 1,
  `is_active` TINYINT(1) DEFAULT 1,
  `expiry_date` DATETIME,
  `modifiers` JSON,
  `variants` JSON,
  `is_addon` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `products_sku_unique` (`sku`(255)),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `quantity` INT DEFAULT 0,
  `low_stock_threshold` INT DEFAULT 10,
  `reorder_point` INT DEFAULT 5,
  `reorder_quantity` INT DEFAULT 20,
  `last_restocked` DATETIME,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `email` TEXT,
  `phone` TEXT,
  `address` TEXT,
  `loyalty_points` INT DEFAULT 0,
  `total_spent` DECIMAL(12,2) DEFAULT 0,
  `visit_count` INT DEFAULT 0,
  `notes` TEXT,
  `credit_balance` DECIMAL(10,2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `customer_nr` INT,
  `salutation` TEXT,
  `first_name` TEXT,
  `last_name` TEXT,
  `street` TEXT,
  `street_nr` TEXT,
  `house_nr` TEXT,
  `city` TEXT,
  `postal_code` TEXT,
  `company` TEXT,
  `zhd` TEXT,
  `how_to_go` TEXT,
  `screen_info` TEXT,
  `source` TEXT,
  `first_order_date` TEXT,
  `last_order_date` TEXT,
  `legacy_total_spent` DECIMAL(12,2) DEFAULT 0,
  `average_order_value` DECIMAL(10,2) DEFAULT 0,
  `order_count` INT DEFAULT 0,
  `legacy_ref` TEXT,
  `quadrat` TEXT,
  `r1` TEXT,
  `r3` TEXT,
  `r4` TEXT,
  `r5` TEXT,
  `r8` TEXT,
  `r9` TEXT,
  `r10` TEXT,
  `r14` DECIMAL(12,2),
  `r15` DECIMAL(12,2),
  `r16` TINYINT(1) DEFAULT 0,
  `r17` TINYINT(1) DEFAULT 0,
  `r18` TINYINT(1) DEFAULT 0,
  `r19` TINYINT(1) DEFAULT 0,
  `r20` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `name` TEXT NOT NULL,
  `contact_name` TEXT,
  `email` TEXT,
  `phone` TEXT,
  `address` TEXT,
  `payment_terms` TEXT,
  `balance` DECIMAL(12,2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `receipt_number` VARCHAR(500) NOT NULL,
  `branch_id` INT,
  `employee_id` INT,
  `customer_id` INT,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `tax_amount` DECIMAL(10,2) DEFAULT 0,
  `service_fee_amount` DECIMAL(10,2) DEFAULT 0,
  `discount_amount` DECIMAL(10,2) DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `payment_method` TEXT NOT NULL DEFAULT 'cash',
  `payment_status` TEXT DEFAULT 'completed',
  `status` TEXT DEFAULT 'completed',
  `notes` TEXT,
  `tip_amount` DECIMAL(10,2) DEFAULT 0,
  `change_amount` DECIMAL(10,2) DEFAULT 0,
  `table_number` TEXT,
  `order_type` TEXT DEFAULT 'dine_in',
  `vehicle_id` INT,
  `payment_details` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `sales_receipt_number_unique` (`receipt_number`(255)),
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT,
  `product_name` TEXT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  `modifiers` JSON,
  `notes` TEXT,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `calls` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `branch_id` INT,
  `phone_number` TEXT NOT NULL,
  `customer_id` INT,
  `status` TEXT NOT NULL DEFAULT 'missed',
  `sale_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(500) NOT NULL,
  `supplier_id` INT NOT NULL,
  `branch_id` INT,
  `status` TEXT DEFAULT 'pending',
  `total_amount` DECIMAL(12,2) DEFAULT 0,
  `notes` TEXT,
  `expected_date` DATETIME,
  `received_date` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `purchase_orders_order_number_unique` (`order_number`(255)),
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `purchase_order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(10,2) NOT NULL,
  `received_quantity` INT DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `branch_id` INT,
  `start_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `end_time` DATETIME,
  `expected_duration_hours` DECIMAL(4,1) DEFAULT 8,
  `opening_cash` DECIMAL(10,2) DEFAULT 0,
  `closing_cash` DECIMAL(10,2),
  `total_sales` DECIMAL(12,2) DEFAULT 0,
  `total_transactions` INT DEFAULT 0,
  `total_returns` INT DEFAULT 0,
  `total_discounts` DECIMAL(10,2) DEFAULT 0,
  `status` TEXT DEFAULT 'open',
  `notes` TEXT,
  `break_minutes` INT DEFAULT 0,
  `overtime_minutes` INT DEFAULT 0,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `recipient_id` INT NOT NULL,
  `sender_id` INT,
  `type` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `entity_type` TEXT,
  `entity_id` INT,
  `is_read` TINYINT(1) DEFAULT 0,
  `priority` TEXT DEFAULT 'normal',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`recipient_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `branch_id` INT,
  `category` TEXT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `description` TEXT,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `employee_id` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tables` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT,
  `name` TEXT NOT NULL,
  `capacity` INT DEFAULT 4,
  `status` TEXT DEFAULT 'available',
  `current_order_id` INT,
  `pos_x` INT DEFAULT 0,
  `pos_y` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kitchen_orders` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `branch_id` INT,
  `table_number` TEXT,
  `status` TEXT DEFAULT 'pending',
  `items` JSON,
  `priority` TEXT DEFAULT 'normal',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscription_plans` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `interval` TEXT DEFAULT 'monthly',
  `features` JSON,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `plan_id` INT NOT NULL,
  `status` TEXT DEFAULT 'active',
  `start_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `end_date` DATETIME,
  `next_billing_date` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `action` TEXT NOT NULL,
  `entity_type` TEXT,
  `entity_id` INT,
  `details` TEXT,
  `metadata` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `returns` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `original_sale_id` INT NOT NULL,
  `employee_id` INT,
  `reason` TEXT,
  `type` TEXT DEFAULT 'refund',
  `total_amount` DECIMAL(12,2) NOT NULL,
  `return_grace_days` INT DEFAULT 30,
  `refund_method` TEXT,
  `approved_by` INT,
  `branch_id` INT,
  `status` TEXT DEFAULT 'completed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`original_sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `return_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` TEXT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sync_queue` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `entity_type` TEXT NOT NULL,
  `entity_id` INT NOT NULL,
  `action` TEXT NOT NULL,
  `data` JSON,
  `status` TEXT DEFAULT 'pending',
  `retry_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cash_drawer_operations` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `shift_id` INT,
  `employee_id` INT NOT NULL,
  `type` TEXT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `expected_amount` DECIMAL(10,2),
  `actual_amount` DECIMAL(10,2),
  `difference` DECIMAL(10,2),
  `reason` TEXT,
  `approved_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `warehouses` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `branch_id` INT NOT NULL,
  `address` TEXT,
  `is_default` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `warehouse_transfers` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `from_warehouse_id` INT NOT NULL,
  `to_warehouse_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `employee_id` INT,
  `status` TEXT DEFAULT 'completed',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_batches` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `batch_number` TEXT NOT NULL,
  `quantity` INT DEFAULT 0,
  `expiry_date` DATETIME,
  `cost_price` DECIMAL(10,2),
  `branch_id` INT,
  `supplier_id` INT,
  `received_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `branch_id` INT,
  `type` TEXT NOT NULL,
  `quantity` INT NOT NULL,
  `previous_quantity` INT,
  `new_quantity` INT,
  `reference_type` TEXT,
  `reference_id` INT,
  `batch_number` TEXT,
  `employee_id` INT,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_counts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `branch_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `status` TEXT DEFAULT 'in_progress',
  `approved_by` INT,
  `total_items` INT DEFAULT 0,
  `discrepancies` INT DEFAULT 0,
  `notes` TEXT,
  `completed_at` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_count_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `stock_count_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `system_quantity` INT NOT NULL,
  `actual_quantity` INT,
  `difference` INT,
  `notes` TEXT,
  FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `supplier_contracts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NOT NULL,
  `discount_rate` DECIMAL(5,2) DEFAULT 0,
  `payment_terms` TEXT,
  `min_order_amount` DECIMAL(10,2),
  `start_date` DATETIME,
  `end_date` DATETIME,
  `is_active` TINYINT(1) DEFAULT 1,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employee_commissions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `sale_id` INT NOT NULL,
  `commission_rate` DECIMAL(5,2) NOT NULL,
  `commission_amount` DECIMAL(10,2) NOT NULL,
  `status` TEXT DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_subscriptions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `plan_type` TEXT NOT NULL DEFAULT 'trial',
  `plan_name` TEXT NOT NULL,
  `price` DECIMAL(10,2) DEFAULT 0,
  `status` TEXT DEFAULT 'active',
  `start_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `end_date` DATETIME,
  `trial_ends_at` DATETIME,
  `auto_renew` TINYINT(1) DEFAULT 0,
  `payment_method` TEXT,
  `last_payment_date` DATETIME,
  `next_payment_date` DATETIME,
  `cancelled_at` DATETIME,
  `cancellation_reason` TEXT,
  `features` JSON,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `license_keys` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `license_key` VARCHAR(500) NOT NULL,
  `tenant_id` INT NOT NULL,
  `subscription_id` INT,
  `status` TEXT DEFAULT 'active',
  `activated_at` DATETIME,
  `expires_at` DATETIME,
  `last_validated_at` DATETIME,
  `device_info` TEXT,
  `max_activations` INT DEFAULT 3,
  `current_activations` INT DEFAULT 0,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `license_keys_key_unique` (`license_key`(255)),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subscription_id`) REFERENCES `tenant_subscriptions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `type` TEXT NOT NULL,
  `title` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `priority` TEXT DEFAULT 'normal',
  `is_read` TINYINT(1) DEFAULT 0,
  `is_dismissed` TINYINT(1) DEFAULT 0,
  `action_url` TEXT,
  `action_label` TEXT,
  `expires_at` DATETIME,
  `sent_by` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sent_by`) REFERENCES `super_admins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(500) NOT NULL,
  `value` TEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `platform_settings_key_unique` (`key`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `platform_commissions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `order_id` INT,
  `sale_total` DECIMAL(12,2) NOT NULL,
  `commission_rate` DECIMAL(5,2) NOT NULL,
  `commission_amount` DECIMAL(12,2) NOT NULL,
  `status` TEXT DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `online_orders` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `order_number` TEXT NOT NULL,
  `customer_name` TEXT NOT NULL,
  `customer_phone` TEXT NOT NULL,
  `customer_address` TEXT,
  `customer_email` TEXT,
  `items` JSON NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tax_amount` DECIMAL(10,2) DEFAULT 0,
  `delivery_fee` DECIMAL(10,2) DEFAULT 0,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `payment_method` TEXT NOT NULL DEFAULT 'cash',
  `payment_status` TEXT NOT NULL DEFAULT 'pending',
  `stripe_payment_intent_id` TEXT,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `order_type` TEXT NOT NULL DEFAULT 'delivery',
  `notes` TEXT,
  `estimated_time` INT,
  `language` TEXT DEFAULT 'en',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `landing_page_config` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `slug` VARCHAR(500) NOT NULL,
  `hero_title` TEXT,
  `hero_subtitle` TEXT,
  `hero_image` TEXT,
  `about_text` TEXT,
  `about_image` TEXT,
  `primary_color` TEXT DEFAULT '#2FD3C6',
  `accent_color` TEXT DEFAULT '#6366F1',
  `enable_online_ordering` TINYINT(1) DEFAULT 1,
  `enable_delivery` TINYINT(1) DEFAULT 1,
  `enable_pickup` TINYINT(1) DEFAULT 1,
  `accept_card` TINYINT(1) DEFAULT 1,
  `accept_mobile` TINYINT(1) DEFAULT 1,
  `accept_cash` TINYINT(1) DEFAULT 1,
  `min_order_amount` DECIMAL(10,2) DEFAULT 0,
  `estimated_delivery_time` INT DEFAULT 30,
  `footer_text` TEXT,
  `social_facebook` TEXT,
  `social_instagram` TEXT,
  `social_whatsapp` TEXT,
  `phone` TEXT,
  `email` TEXT,
  `address` TEXT,
  `opening_hours` TEXT,
  `delivery_radius` TEXT,
  `custom_css` TEXT,
  `is_published` TINYINT(1) DEFAULT 1,
  `language` TEXT DEFAULT 'en',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `landing_page_config_tenant_id_unique` (`tenant_id`),
  UNIQUE KEY `landing_page_config_slug_unique` (`slug`(255)),
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT,
  `branch_id` INT,
  `license_plate` TEXT NOT NULL,
  `make` TEXT,
  `model` TEXT,
  `color` TEXT,
  `driver_name` TEXT,
  `driver_phone` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `printer_configs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `branch_id` INT,
  `receipt_type` TEXT NOT NULL,
  `printer_1` TEXT,
  `printer_1_copy` TINYINT(1) DEFAULT 0,
  `printer_2` TEXT,
  `printer_2_copy` TINYINT(1) DEFAULT 0,
  `paper_size` TEXT DEFAULT '80mm',
  `is_active` TINYINT(1) DEFAULT 1,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_closings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `branch_id` INT,
  `employee_id` INT,
  `closing_date` VARCHAR(10) NOT NULL,
  `total_sales` DECIMAL(12,2) DEFAULT 0,
  `total_cash` DECIMAL(12,2) DEFAULT 0,
  `total_card` DECIMAL(12,2) DEFAULT 0,
  `total_mobile` DECIMAL(12,2) DEFAULT 0,
  `total_transactions` INT DEFAULT 0,
  `total_returns` DECIMAL(12,2) DEFAULT 0,
  `total_discounts` DECIMAL(12,2) DEFAULT 0,
  `opening_cash` DECIMAL(12,2) DEFAULT 0,
  `closing_cash` DECIMAL(12,2) DEFAULT 0,
  `notes` TEXT,
  `status` TEXT DEFAULT 'closed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `monthly_closings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT NOT NULL,
  `branch_id` INT,
  `employee_id` INT,
  `closing_month` VARCHAR(7) NOT NULL,
  `total_sales` DECIMAL(12,2) DEFAULT 0,
  `total_cash` DECIMAL(12,2) DEFAULT 0,
  `total_card` DECIMAL(12,2) DEFAULT 0,
  `total_mobile` DECIMAL(12,2) DEFAULT 0,
  `total_transactions` INT DEFAULT 0,
  `total_returns` DECIMAL(12,2) DEFAULT 0,
  `total_discounts` DECIMAL(12,2) DEFAULT 0,
  `total_expenses` DECIMAL(12,2) DEFAULT 0,
  `net_revenue` DECIMAL(12,2) DEFAULT 0,
  `notes` TEXT,
  `status` TEXT DEFAULT 'closed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_sequences` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `scope_key` VARCHAR(255) NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `counter` INT NOT NULL DEFAULT 0,
  UNIQUE KEY `daily_seq_scope_date_unique` (`scope_key`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
