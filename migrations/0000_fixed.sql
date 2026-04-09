CREATE TABLE `activity_log` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`employee_id` int NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` int,
	`details` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`logo` text,
	`is_active` boolean DEFAULT true,
	`is_main` boolean DEFAULT false,
	`currency` text DEFAULT ('CHF'),
	`tax_rate` decimal(5,2) DEFAULT '0',
	`delivery_fee` decimal(10,2) DEFAULT '0',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`branch_id` int,
	`phone_number` text NOT NULL,
	`customer_id` int,
	`status` text NOT NULL DEFAULT ('missed'),
	`sale_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `calls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_drawer_operations` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`shift_id` int,
	`employee_id` int NOT NULL,
	`type` text NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`expected_amount` decimal(10,2),
	`actual_amount` decimal(10,2),
	`difference` decimal(10,2),
	`reason` text,
	`approved_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `cash_drawer_operations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`name_ar` text,
	`color` text DEFAULT ('#7C3AED'),
	`icon` text DEFAULT ('grid'),
	`image` text,
	`parent_id` int,
	`sort_order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_addresses` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`customer_id` int NOT NULL,
	`tenant_id` int NOT NULL,
	`label` text NOT NULL DEFAULT ('Home'),
	`street` text NOT NULL,
	`building_name` text,
	`floor` text,
	`city` text NOT NULL,
	`postal_code` text,
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`notes` text,
	`is_default` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `customer_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`customer_id` int NOT NULL,
	`tenant_id` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`device_info` text,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`loyalty_points` int DEFAULT 0,
	`total_spent` decimal(12,2) DEFAULT '0',
	`visit_count` int DEFAULT 0,
	`notes` text,
	`credit_balance` decimal(10,2) DEFAULT '0',
	`is_active` boolean DEFAULT true,
	`customer_nr` int,
	`salutation` text,
	`first_name` text,
	`last_name` text,
	`street` text,
	`street_nr` text,
	`house_nr` text,
	`city` text,
	`postal_code` text,
	`company` text,
	`zhd` text,
	`how_to_go` text,
	`screen_info` text,
	`source` text,
	`first_order_date` text,
	`last_order_date` text,
	`legacy_total_spent` decimal(12,2) DEFAULT '0',
	`average_order_value` decimal(10,2) DEFAULT '0',
	`order_count` int DEFAULT 0,
	`legacy_ref` text,
	`quadrat` text,
	`r1` text,
	`r3` text,
	`r4` text,
	`r5` text,
	`r8` text,
	`r9` text,
	`r10` text,
	`r14` decimal(12,2),
	`r15` decimal(12,2),
	`r16` boolean DEFAULT false,
	`r17` boolean DEFAULT false,
	`r18` boolean DEFAULT false,
	`r19` boolean DEFAULT false,
	`r20` boolean DEFAULT false,
	`has_account` boolean DEFAULT false,
	`password_hash` text,
	`date_of_birth` text,
	`gender` text,
	`preferred_language` text DEFAULT ('en'),
	`wallet_balance` decimal(10,2) DEFAULT '0',
	`total_orders_delivery` int DEFAULT 0,
	`total_orders_pickup` int DEFAULT 0,
	`referral_code` varchar(16),
	`referred_by_code` varchar(16),
	`fcm_token` text,
	`loyalty_tier` text DEFAULT ('bronze'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_closings` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`branch_id` int,
	`employee_id` int,
	`closing_date` text NOT NULL,
	`total_sales` decimal(12,2) DEFAULT '0',
	`total_cash` decimal(12,2) DEFAULT '0',
	`total_card` decimal(12,2) DEFAULT '0',
	`total_mobile` decimal(12,2) DEFAULT '0',
	`total_transactions` int DEFAULT 0,
	`total_returns` decimal(12,2) DEFAULT '0',
	`total_discounts` decimal(12,2) DEFAULT '0',
	`opening_cash` decimal(12,2) DEFAULT '0',
	`closing_cash` decimal(12,2) DEFAULT '0',
	`notes` text,
	`status` text DEFAULT ('closed'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `daily_closings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_sequences` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`scope_key` text NOT NULL,
	`date` text NOT NULL,
	`counter` int NOT NULL DEFAULT 0,
	CONSTRAINT `daily_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_seq_scope_date_unique` UNIQUE(`scope_key`,`date`)
);
--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`branch_id` int,
	`name` text NOT NULL,
	`name_ar` text,
	`polygon` json,
	`center_lat` decimal(10,7),
	`center_lng` decimal(10,7),
	`radius_km` decimal(5,2),
	`delivery_fee` decimal(10,2) DEFAULT '0',
	`min_order_amount` decimal(10,2) DEFAULT '0',
	`estimated_minutes` int DEFAULT 30,
	`is_active` boolean DEFAULT true,
	`sort_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `delivery_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_locations` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`vehicle_id` int NOT NULL,
	`order_id` int,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(10,7) NOT NULL,
	`speed` decimal(5,2),
	`heading` int,
	`recorded_at` timestamp DEFAULT (now()),
	CONSTRAINT `driver_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employee_commissions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`employee_id` int NOT NULL,
	`sale_id` int NOT NULL,
	`commission_rate` decimal(5,2) NOT NULL,
	`commission_amount` decimal(10,2) NOT NULL,
	`status` text DEFAULT ('pending'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `employee_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`pin` text NOT NULL,
	`role` text NOT NULL DEFAULT ('cashier'),
	`branch_id` int,
	`is_active` boolean DEFAULT true,
	`hourly_rate` decimal(10,2),
	`commission_rate` decimal(5,2) DEFAULT '0',
	`avatar` text,
	`permissions` json DEFAULT ('[]'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`branch_id` int,
	`category` text NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` text,
	`date` timestamp DEFAULT (now()),
	`employee_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`product_id` int NOT NULL,
	`branch_id` int NOT NULL,
	`quantity` int DEFAULT 0,
	`low_stock_threshold` int DEFAULT 10,
	`reorder_point` int DEFAULT 5,
	`reorder_quantity` int DEFAULT 20,
	`last_restocked` timestamp,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`product_id` int NOT NULL,
	`branch_id` int,
	`type` text NOT NULL,
	`quantity` int NOT NULL,
	`previous_quantity` int,
	`new_quantity` int,
	`reference_type` text,
	`reference_id` int,
	`batch_number` text,
	`employee_id` int,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kitchen_orders` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`sale_id` int NOT NULL,
	`branch_id` int,
	`table_number` text,
	`status` text DEFAULT ('pending'),
	`items` json DEFAULT ('[]'),
	`priority` text DEFAULT ('normal'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `kitchen_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_page_config` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`slug` text NOT NULL,
	`hero_title` text,
	`hero_subtitle` text,
	`hero_image` text,
	`about_text` text,
	`about_image` text,
	`primary_color` text DEFAULT ('#2FD3C6'),
	`accent_color` text DEFAULT ('#6366F1'),
	`enable_online_ordering` boolean DEFAULT true,
	`enable_delivery` boolean DEFAULT true,
	`enable_pickup` boolean DEFAULT true,
	`accept_card` boolean DEFAULT true,
	`accept_mobile` boolean DEFAULT true,
	`accept_cash` boolean DEFAULT true,
	`min_order_amount` decimal(10,2) DEFAULT '0',
	`estimated_delivery_time` int DEFAULT 30,
	`footer_text` text,
	`social_facebook` text,
	`social_instagram` text,
	`social_whatsapp` text,
	`phone` text,
	`email` text,
	`address` text,
	`opening_hours` text,
	`delivery_radius` text,
	`custom_css` text,
	`is_published` boolean DEFAULT true,
	`language` text DEFAULT ('en'),
	`banner_images` json DEFAULT ('[]'),
	`featured_category_ids` json DEFAULT ('[]'),
	`promo_text` text,
	`delivery_zones_json` json DEFAULT ('[]'),
	`min_delivery_time` int DEFAULT 20,
	`max_delivery_time` int DEFAULT 45,
	`loyalty_points_per_unit` decimal(5,2) DEFAULT '1.00',
	`loyalty_redemption_rate` decimal(5,2) DEFAULT '0.01',
	`enable_loyalty` boolean DEFAULT true,
	`enable_scheduled_orders` boolean DEFAULT true,
	`enable_promos` boolean DEFAULT true,
	`enable_wallet` boolean DEFAULT false,
	`meta_title` text,
	`meta_description` text,
	`google_analytics_id` text,
	`support_phone` text,
	`logomark` text,
	`header_bg_image` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `landing_page_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `landing_page_config_tenant_id_unique` UNIQUE(`tenant_id`),
	CONSTRAINT `landing_page_config_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `license_keys` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`license_key` text NOT NULL,
	`tenant_id` int NOT NULL,
	`subscription_id` int,
	`status` text DEFAULT ('active'),
	`activated_at` timestamp,
	`expires_at` timestamp,
	`last_validated_at` timestamp,
	`device_info` text,
	`max_activations` int DEFAULT 3,
	`current_activations` int DEFAULT 0,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `license_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `license_keys_license_key_unique` UNIQUE(`license_key`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`customer_id` int NOT NULL,
	`tenant_id` int NOT NULL,
	`order_id` int,
	`type` text NOT NULL,
	`points` int NOT NULL,
	`balance_before` int NOT NULL,
	`balance_after` int NOT NULL,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_closings` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`branch_id` int,
	`employee_id` int,
	`closing_month` text NOT NULL,
	`total_sales` decimal(12,2) DEFAULT '0',
	`total_cash` decimal(12,2) DEFAULT '0',
	`total_card` decimal(12,2) DEFAULT '0',
	`total_mobile` decimal(12,2) DEFAULT '0',
	`total_transactions` int DEFAULT 0,
	`total_returns` decimal(12,2) DEFAULT '0',
	`total_discounts` decimal(12,2) DEFAULT '0',
	`total_expenses` decimal(12,2) DEFAULT '0',
	`net_revenue` decimal(12,2) DEFAULT '0',
	`notes` text,
	`status` text DEFAULT ('closed'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `monthly_closings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`recipient_id` int NOT NULL,
	`sender_id` int,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` int,
	`is_read` boolean DEFAULT false,
	`priority` text DEFAULT ('normal'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `online_orders` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_address` text,
	`customer_email` text,
	`items` json NOT NULL DEFAULT ('[]'),
	`subtotal` decimal(10,2) NOT NULL,
	`tax_amount` decimal(10,2) DEFAULT '0',
	`delivery_fee` decimal(10,2) DEFAULT '0',
	`total_amount` decimal(10,2) NOT NULL,
	`payment_method` text NOT NULL DEFAULT ('cash'),
	`payment_status` text NOT NULL DEFAULT ('pending'),
	`stripe_payment_intent_id` text,
	`status` text NOT NULL DEFAULT ('pending'),
	`order_type` text NOT NULL DEFAULT ('delivery'),
	`notes` text,
	`estimated_time` int,
	`language` text DEFAULT ('en'),
	`driver_id` int,
	`scheduled_at` timestamp,
	`promo_code_id` int,
	`discount_amount` decimal(10,2) DEFAULT '0',
	`driver_lat` decimal(10,7),
	`driver_lng` decimal(10,7),
	`customer_lat` decimal(10,7),
	`customer_lng` decimal(10,7),
	`rider_picked_up_at` timestamp,
	`rider_delivered_at` timestamp,
	`rating` int,
	`rating_comment` text,
	`tracking_token` varchar(64),
	`source_channel` text DEFAULT ('web'),
	`floor` text,
	`building_name` text,
	`address_notes` text,
	`saved_address_id` int,
	`wallet_amount_used` decimal(10,2) DEFAULT '0',
	`loyalty_points_used` int DEFAULT 0,
	`loyalty_points_earned` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `online_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_ratings` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`order_id` int NOT NULL,
	`customer_id` int,
	`driver_id` int,
	`food_rating` int,
	`delivery_rating` int,
	`overall_rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `order_ratings_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_ratings_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `otp_verifications` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`phone` varchar(32) NOT NULL,
	`tenant_id` int NOT NULL,
	`otp` varchar(8) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`attempts` int DEFAULT 0,
	`verified` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `otp_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_commissions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`order_id` int,
	`sale_total` decimal(12,2) NOT NULL,
	`commission_rate` decimal(5,2) NOT NULL,
	`commission_amount` decimal(12,2) NOT NULL,
	`status` text DEFAULT ('pending'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `platform_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `printer_configs` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`branch_id` int,
	`receipt_type` text NOT NULL,
	`printer_1` text,
	`printer_1_copy` boolean DEFAULT false,
	`printer_2` text,
	`printer_2_copy` boolean DEFAULT false,
	`paper_size` text DEFAULT ('80mm'),
	`is_active` boolean DEFAULT true,
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `printer_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_batches` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`product_id` int NOT NULL,
	`batch_number` text NOT NULL,
	`quantity` int DEFAULT 0,
	`expiry_date` timestamp,
	`cost_price` decimal(10,2),
	`branch_id` int,
	`supplier_id` int,
	`received_date` timestamp DEFAULT (now()),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `product_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`name_ar` text,
	`description` text,
	`sku` text,
	`barcode` text,
	`category_id` int,
	`price` decimal(10,2) NOT NULL,
	`cost_price` decimal(10,2),
	`image` text,
	`unit` text DEFAULT ('piece'),
	`taxable` boolean DEFAULT true,
	`track_inventory` boolean DEFAULT true,
	`is_active` boolean DEFAULT true,
	`expiry_date` timestamp,
	`modifiers` json DEFAULT ('[]'),
	`variants` json DEFAULT ('[]'),
	`is_addon` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `promo_code_usages` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`promo_code_id` int NOT NULL,
	`customer_id` int,
	`order_id` int,
	`discount_applied` decimal(10,2) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `promo_code_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`description` text,
	`discount_type` text NOT NULL DEFAULT ('percent'),
	`discount_value` decimal(10,2) NOT NULL,
	`min_order_amount` decimal(10,2) DEFAULT '0',
	`max_discount_cap` decimal(10,2),
	`usage_limit` int,
	`usage_count` int DEFAULT 0,
	`per_customer_limit` int DEFAULT 1,
	`valid_from` timestamp,
	`valid_until` timestamp,
	`is_active` boolean DEFAULT true,
	`applicable_order_types` json DEFAULT ('["delivery","pickup"]'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_tenant_code` UNIQUE(`tenant_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`purchase_order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`unit_cost` decimal(10,2) NOT NULL,
	`received_quantity` int DEFAULT 0,
	`total` decimal(10,2) NOT NULL,
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`order_number` text NOT NULL,
	`supplier_id` int NOT NULL,
	`branch_id` int,
	`status` text DEFAULT ('pending'),
	`total_amount` decimal(12,2) DEFAULT '0',
	`notes` text,
	`expected_date` timestamp,
	`received_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`return_id` int NOT NULL,
	`product_id` int NOT NULL,
	`product_name` text NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	CONSTRAINT `return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`original_sale_id` int NOT NULL,
	`employee_id` int,
	`reason` text,
	`type` text DEFAULT ('refund'),
	`total_amount` decimal(12,2) NOT NULL,
	`return_grace_days` int DEFAULT 30,
	`refund_method` text,
	`approved_by` int,
	`branch_id` int,
	`status` text DEFAULT ('completed'),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`sale_id` int NOT NULL,
	`product_id` int,
	`product_name` text NOT NULL,
	`quantity` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`modifiers` json DEFAULT ('[]'),
	`notes` text,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`receipt_number` text NOT NULL,
	`branch_id` int,
	`employee_id` int,
	`customer_id` int,
	`subtotal` decimal(12,2) NOT NULL,
	`tax_amount` decimal(10,2) DEFAULT '0',
	`service_fee_amount` decimal(10,2) DEFAULT '0',
	`discount_amount` decimal(10,2) DEFAULT '0',
	`total_amount` decimal(12,2) NOT NULL,
	`payment_method` text NOT NULL DEFAULT ('cash'),
	`payment_status` text DEFAULT ('completed'),
	`status` text DEFAULT ('completed'),
	`notes` text,
	`tip_amount` decimal(10,2) DEFAULT '0',
	`change_amount` decimal(10,2) DEFAULT '0',
	`table_number` text,
	`order_type` text DEFAULT ('dine_in'),
	`vehicle_id` int,
	`payment_details` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_receipt_number_unique` UNIQUE(`receipt_number`)
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`employee_id` int NOT NULL,
	`branch_id` int,
	`start_time` timestamp DEFAULT (now()),
	`end_time` timestamp,
	`expected_duration_hours` decimal(4,1) DEFAULT '8',
	`opening_cash` decimal(10,2) DEFAULT '0',
	`closing_cash` decimal(10,2),
	`total_sales` decimal(12,2) DEFAULT '0',
	`total_transactions` int DEFAULT 0,
	`total_returns` int DEFAULT 0,
	`total_discounts` decimal(10,2) DEFAULT '0',
	`status` text DEFAULT ('open'),
	`notes` text,
	`break_minutes` int DEFAULT 0,
	`overtime_minutes` int DEFAULT 0,
	CONSTRAINT `shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_count_items` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`stock_count_id` int NOT NULL,
	`product_id` int NOT NULL,
	`system_quantity` int NOT NULL,
	`actual_quantity` int,
	`difference` int,
	`notes` text,
	CONSTRAINT `stock_count_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_counts` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`branch_id` int NOT NULL,
	`employee_id` int NOT NULL,
	`status` text DEFAULT ('in_progress'),
	`approved_by` int,
	`total_items` int DEFAULT 0,
	`discrepancies` int DEFAULT 0,
	`notes` text,
	`completed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `stock_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` text NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`interval` text DEFAULT ('monthly'),
	`features` json DEFAULT ('[]'),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`customer_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`status` text DEFAULT ('active'),
	`start_date` timestamp DEFAULT (now()),
	`end_date` timestamp,
	`next_billing_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `super_admins` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT ('super_admin'),
	`is_active` boolean DEFAULT true,
	`last_login` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `super_admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `supplier_contracts` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`supplier_id` int NOT NULL,
	`discount_rate` decimal(5,2) DEFAULT '0',
	`payment_terms` text,
	`min_order_amount` decimal(10,2),
	`start_date` timestamp,
	`end_date` timestamp,
	`is_active` boolean DEFAULT true,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `supplier_contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`name` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`address` text,
	`payment_terms` text,
	`balance` decimal(12,2) DEFAULT '0',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`entity_type` text NOT NULL,
	`entity_id` int NOT NULL,
	`action` text NOT NULL,
	`data` json,
	`status` text DEFAULT ('pending'),
	`retry_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`processed_at` timestamp,
	CONSTRAINT `sync_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`branch_id` int,
	`name` text NOT NULL,
	`capacity` int DEFAULT 4,
	`status` text DEFAULT ('available'),
	`current_order_id` int,
	`pos_x` int DEFAULT 0,
	`pos_y` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_notifications` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`priority` text DEFAULT ('normal'),
	`is_read` boolean DEFAULT false,
	`is_dismissed` boolean DEFAULT false,
	`action_url` text,
	`action_label` text,
	`expires_at` timestamp,
	`sent_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `tenant_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_subscriptions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int NOT NULL,
	`plan_type` text NOT NULL DEFAULT ('trial'),
	`plan_name` text NOT NULL,
	`price` decimal(10,2) DEFAULT '0',
	`status` text DEFAULT ('active'),
	`start_date` timestamp DEFAULT (now()),
	`end_date` timestamp,
	`trial_ends_at` timestamp,
	`auto_renew` boolean DEFAULT false,
	`payment_method` text,
	`last_payment_date` timestamp,
	`next_payment_date` timestamp,
	`cancelled_at` timestamp,
	`cancellation_reason` text,
	`features` json DEFAULT ('[]'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `tenant_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`business_name` text NOT NULL,
	`owner_name` text NOT NULL,
	`owner_email` text NOT NULL,
	`owner_phone` text,
	`password_hash` text,
	`address` text,
	`logo` text,
	`status` text DEFAULT ('active'),
	`max_branches` int DEFAULT 1,
	`max_employees` int DEFAULT 5,
	`store_type` text DEFAULT ('supermarket'),
	`metadata` json,
	`setup_completed` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_owner_email_unique` UNIQUE(`owner_email`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`tenant_id` int,
	`branch_id` int,
	`license_plate` text NOT NULL,
	`make` text,
	`model` text,
	`color` text,
	`driver_name` text,
	`driver_phone` text,
	`is_active` boolean DEFAULT true,
	`notes` text,
	`employee_id` int,
	`current_lat` decimal(10,7),
	`current_lng` decimal(10,7),
	`location_updated_at` timestamp,
	`driver_status` text DEFAULT ('offline'),
	`driver_rating` decimal(3,2) DEFAULT '5.00',
	`total_deliveries` int DEFAULT 0,
	`active_order_id` int,
	`device_token` text,
	`driver_access_token` varchar(64),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`customer_id` int NOT NULL,
	`tenant_id` int NOT NULL,
	`order_id` int,
	`type` text NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balance_before` decimal(10,2) NOT NULL,
	`balance_after` decimal(10,2) NOT NULL,
	`stripe_payment_intent_id` text,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_transfers` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`from_warehouse_id` int NOT NULL,
	`to_warehouse_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`employee_id` int,
	`status` text DEFAULT ('completed'),
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `warehouse_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	`name` text NOT NULL,
	`branch_id` int NOT NULL,
	`address` text,
	`is_default` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_log` ADD CONSTRAINT `activity_log_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branches` ADD CONSTRAINT `branches_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calls` ADD CONSTRAINT `calls_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calls` ADD CONSTRAINT `calls_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calls` ADD CONSTRAINT `calls_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calls` ADD CONSTRAINT `calls_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawer_operations` ADD CONSTRAINT `cash_drawer_operations_shift_id_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawer_operations` ADD CONSTRAINT `cash_drawer_operations_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_drawer_operations` ADD CONSTRAINT `cash_drawer_operations_approved_by_employees_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_zones` ADD CONSTRAINT `delivery_zones_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_zones` ADD CONSTRAINT `delivery_zones_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_order_id_online_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `online_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_commissions` ADD CONSTRAINT `employee_commissions_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_commissions` ADD CONSTRAINT `employee_commissions_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `landing_page_config` ADD CONSTRAINT `landing_page_config_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_keys` ADD CONSTRAINT `license_keys_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `license_keys` ADD CONSTRAINT `license_keys_subscription_id_tenant_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `tenant_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_order_id_online_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `online_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_closings` ADD CONSTRAINT `monthly_closings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_closings` ADD CONSTRAINT `monthly_closings_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_closings` ADD CONSTRAINT `monthly_closings_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_id_employees_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_sender_id_employees_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `online_orders` ADD CONSTRAINT `online_orders_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_ratings` ADD CONSTRAINT `order_ratings_order_id_online_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `online_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_ratings` ADD CONSTRAINT `order_ratings_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_ratings` ADD CONSTRAINT `order_ratings_driver_id_vehicles_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `vehicles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `otp_verifications` ADD CONSTRAINT `otp_verifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_commissions` ADD CONSTRAINT `platform_commissions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `printer_configs` ADD CONSTRAINT `printer_configs_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `printer_configs` ADD CONSTRAINT `printer_configs_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_batches` ADD CONSTRAINT `product_batches_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_code_usages` ADD CONSTRAINT `promo_code_usages_promo_code_id_promo_codes_id_fk` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_code_usages` ADD CONSTRAINT `promo_code_usages_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_code_usages` ADD CONSTRAINT `promo_code_usages_order_id_online_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `online_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promo_codes` ADD CONSTRAINT `promo_codes_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_return_id_returns_id_fk` FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_original_sale_id_sales_id_fk` FOREIGN KEY (`original_sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_approved_by_employees_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shifts` ADD CONSTRAINT `shifts_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_stock_count_id_stock_counts_id_fk` FOREIGN KEY (`stock_count_id`) REFERENCES `stock_counts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_counts` ADD CONSTRAINT `stock_counts_approved_by_employees_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_subscription_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_contracts` ADD CONSTRAINT `supplier_contracts_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tables` ADD CONSTRAINT `tables_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_notifications` ADD CONSTRAINT `tenant_notifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_notifications` ADD CONSTRAINT `tenant_notifications_sent_by_super_admins_id_fk` FOREIGN KEY (`sent_by`) REFERENCES `super_admins`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenant_subscriptions` ADD CONSTRAINT `tenant_subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_order_id_online_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `online_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_from_warehouse_id_warehouses_id_fk` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_to_warehouse_id_warehouses_id_fk` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_transfers` ADD CONSTRAINT `warehouse_transfers_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;