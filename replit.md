# Barmagly Smart POS

## Overview

Barmagly Smart POS is a production-ready, tablet-optimized Point of Sale and Mini-ERP system designed for pharmacies, retail stores, cafes, and small businesses. It is branded under the Barmagly company (www.barmagly.tech, Egypt-based).

The application is built as an Expo (React Native) frontend with a Node.js/Express backend, backed by a PostgreSQL database. It targets web, iOS, and Android platforms with a dark-mode-first UI featuring a Blue → Purple → Teal gradient brand identity (accent color: #2FD3C6).

Key functional areas include:
- **POS Interface** – Tablet-friendly product browsing, cart management, checkout with customer selection, discount controls, and multiple payment methods (Cash, Card, Mobile, QR Pay)
- **Multi-User Login** – Employee selection grid with PIN-based authentication, role-coded badges (admin/cashier/manager/owner), Quick Start option
- **QR Code Receipts** – Digital receipt generation with QR codes after each sale, full itemized breakdown
- **Product & Category Management** – CRUD for products and categories with search and barcode display
- **Customer Management** – Customer records with search, loyalty points tracking, selection at POS
- **Employee Management** – PIN-based authentication, role-based access, attendance tracking, commission rates
- **Returns & Refunds** – Full return processing (refund/exchange/store credit) with automatic inventory adjustment
- **Cash Drawer Management** – Opening/closing cash, withdrawals, deposits, cash counts tied to shifts
- **Advanced Inventory** – Product batches with expiry tracking (pharmacy-ready), warehouse management, inventory movement log, stock counts
- **Financial Reports** – Profit by product analysis, cashier performance metrics, slow-moving product detection
- **Smart Analytics** – Revenue projections (daily/monthly/yearly), stock reorder alerts, trend-based insights
- **Professional Reports** – 6-tab reporting (Overview, Sales, Inventory, Returns, Finance, Activity) with CSV export for all report types
- **Web Admin Dashboard** – Comprehensive multi-page admin dashboard at /dashboard route with sidebar navigation, multi-branch monitoring, subscription management, revenue analytics with charts, payment donut charts, employee/customer management views, inventory alerts per branch, smart reports with revenue projections, and full data export (served by Express on port 5000). Uses Lucide icons and auto-refreshes every 30s. Pages: Overview, Branches, Sales & Revenue, Inventory, Employees, Customers, Subscriptions, Reports
- **Settings & Admin** – Branch management, suppliers, purchase orders, expenses, shifts, warehouses, product batches
- **Admin Shift Monitoring** – Real-time active shift tracking with elapsed time, progress bars, overtime detection, force-close capability, shift history, configurable shift duration
- **In-App Notifications** – Bell icon with unread badge, auto-notifications for shift start/end, sales, returns, cash drawer operations, mark read/unread, priority levels
- **Stripe Payment Gateway** – Working Stripe integration with payment intent creation, webhook handling, automatic data sync via stripe-replit-sync
- **Multi-branch support** – Branch-level data isolation
- **Subscription billing** – Monthly/yearly subscription plan support (schema-level)
- **Role-Based Permissions** – Differentiated access for admin/owner (full access), manager (management without employee/branch editing), and cashier (POS-only with 10% max discount cap)

## Role-Based Access Control

### Role Hierarchy
- **Admin/Owner**: Full access to all features, unlimited discounts, all settings
- **Manager**: Management access (products, customers, reports, most settings), unlimited discounts, cannot manage employees or branches
- **Cashier**: POS-only access, 10% maximum discount cap, limited settings (language, receipt printer, cash drawer only), no access to Reports tab

### Auth Context Helpers (lib/auth-context.tsx)
- `isAdmin` – true for admin/owner roles
- `isManager` – true for manager role
- `isCashier` – true for cashier role
- `canManage` – true for admin/owner/manager (shorthand for management-level access)

### Tab Restrictions
- Reports tab: Hidden from tab bar for cashiers; shows "Access Restricted" if navigated to directly
- Products/Customers: Read-only for cashiers (add/edit/delete buttons hidden)
- Settings: Cashiers only see language, receipt printer, and cash drawer sections

### POS Discount Cap
- Cashiers capped at 10% maximum discount (both fixed amount and percentage modes)
- Warning text displayed in discount modal for cashiers

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with expo-router v6 (file-based routing with typed routes)
- **State Management**: React Context for auth (`auth-context.tsx`) and cart (`cart-context.tsx`), TanStack React Query v5 for server state
- **Navigation**: Tab-based layout under `app/(tabs)/` with screens for POS, Products, Customers, Reports, and Settings. Login screen is a separate route.
- **UI**: Dark mode by default. Uses `expo-linear-gradient`, `expo-blur`, `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated`, and `react-native-keyboard-controller`. Custom `Colors` constants define the full brand palette.
- **API Communication**: Centralized in `lib/query-client.ts`. Uses `apiRequest()` helper for all fetch calls to the Express backend. Base URL derived from `EXPO_PUBLIC_DOMAIN` environment variable.
- **Offline Storage**: `@react-native-async-storage/async-storage` used for persisting auth state. The schema includes a `syncQueue` table for offline-first sync capability.
- **Platform Targeting**: Supports web, iOS, and Android. Platform-specific code guards (e.g., haptics only on native, blur only on iOS).

### Backend (Express / Node.js)
- **Server**: Express v5 application in `server/index.ts`, with CORS configured for Replit development/deployment domains and localhost.
- **Routes**: Defined in `server/routes.ts`. RESTful API endpoints covering all entities: branches, employees, categories, products, inventory, customers, sales, sale items, suppliers, purchase orders, shifts, expenses, tables, kitchen orders, subscriptions, analytics, and a seed endpoint. Includes analytics routes: `/api/analytics/top-products`, `/api/analytics/sales-by-payment`, `/api/analytics/sales-range`.
- **Storage Layer**: `server/storage.ts` provides a data access object using Drizzle ORM queries directly. Includes enhanced methods: `getDashboardStats()` (returns comprehensive analytics with revenue, profit, top products, payment breakdown), `seedInitialData()` (auto-seeds on first run), `getExpensesByDateRange()`, `receivePurchaseOrder()`, `getEmployeeAttendance()`, `getSalesByDateRange()`, `getTopProducts()`, `getSalesByPaymentMethod()`.
- **Authentication**: Simple PIN-based login via `POST /api/employees/login`. No session/token middleware — the employee object is returned directly and stored client-side.
- **Auto-Seed**: Server automatically seeds initial data (branch, employees, categories, products, customers, suppliers, tables) on first run if no branches exist. Default admin PIN: 1234, cashier PIN: 0000.
- **Build**: Server can be bundled with esbuild for production (`server:build` script). Development uses `tsx` for TypeScript execution.

### Database (PostgreSQL + Drizzle ORM)
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` helpers. Validation schemas generated with `drizzle-zod`.
- **Connection**: `pg.Pool` in `server/db.ts`, configured via `DATABASE_URL` environment variable
- **Migration**: Uses `drizzle-kit push` for schema synchronization (config in `drizzle.config.ts`)
- **Tables**: `branches`, `employees`, `categories`, `products`, `inventory`, `customers`, `sales`, `saleItems`, `suppliers`, `purchaseOrders`, `purchaseOrderItems`, `shifts`, `expenses`, `tables`, `kitchenOrders`, `subscriptionPlans`, `subscriptions`, `syncQueue`

### Shared Code
- The `shared/` directory contains `schema.ts` which is imported by both the server (for DB operations) and potentially the frontend (for types). Path alias `@shared/*` is configured in `tsconfig.json`.

### Build & Deployment
- **Development**: Two processes run concurrently — Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production**: Expo static build via custom `scripts/build.js`, Express server bundled with esbuild
- **Static Serving**: In production, the Express server serves the built Expo web assets and a landing page template

## External Dependencies

### Database
- **PostgreSQL** – Primary data store, connected via `DATABASE_URL` environment variable. Must be provisioned before the app can run.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** – ORM and migration tooling for PostgreSQL
- **drizzle-zod** – Auto-generates Zod validation schemas from Drizzle table definitions
- **@tanstack/react-query** – Server state management and caching
- **expo-router** – File-based routing for the React Native app
- **express** – HTTP server framework
- **pg** – PostgreSQL client for Node.js
- **@react-native-async-storage/async-storage** – Local key-value storage for auth persistence
- **qrcode** – QR code generation for digital receipts (web platform)

### Expo Modules Used
- expo-blur, expo-constants, expo-font, expo-haptics, expo-image, expo-image-picker, expo-linear-gradient, expo-linking, expo-location, expo-router, expo-splash-screen, expo-status-bar, expo-symbols, expo-system-ui, expo-web-browser, expo-glass-effect

### Environment Variables Required
- `DATABASE_URL` – PostgreSQL connection string (required for server and migrations)
- `EXPO_PUBLIC_DOMAIN` – Domain for API requests from the frontend (set automatically on Replit)
- `REPLIT_DEV_DOMAIN` – Used for CORS and Expo proxy configuration
- `REPLIT_DOMAINS` – Additional allowed CORS origins