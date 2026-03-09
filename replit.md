# Barmagly Smart POS

## Overview

Barmagly Smart POS is a production-ready, tablet-optimized Point of Sale and Mini-ERP system designed for pharmacies, retail stores, cafes, and small businesses. It is branded under the Barmagly company (www.barmagly.tech, Egypt-based). Default currency is **Swiss Franc (CHF)**.

The application is built as an Expo (React Native) frontend with a Node.js/Express backend, backed by a PostgreSQL database. It targets web, iOS, and Android platforms with a dark-mode-first UI featuring a Blue → Purple → Teal gradient brand identity (accent color: #2FD3C6).

## Architecture

### Multi-Tenant System
- **Tenant isolation**: Each store (tenant) has fully isolated data. All database queries filter by `tenantId` or `branchId` at the SQL level.
- **License-based activation**: Stores are activated via license keys (format: `BARMAGLY-XXXX-XXXX-XXXX-XXXX`).
- **API security**: All tenant-scoped API routes are protected by `tenantAuthMiddleware` (`server/tenantAuth.ts`) which validates the `x-license-key` header against the claimed `tenantId`.
- **Cascade deletes**: All tenant-related tables have `onDelete: 'cascade'` foreign key constraints.

### Role-Based Access Control

| Role | POS | Products | Reports | Customers | Settings | Employees | Branches |
|------|-----|----------|---------|-----------|----------|-----------|----------|
| Admin/Owner | ✅ | ✅ Full | ✅ | ✅ Full | ✅ Full | ✅ Manage | ✅ Manage |
| Manager | ✅ | ✅ Full | ✅ | ✅ + Delete | ✅ Operations | ❌ | ❌ |
| Cashier | ✅ | 👁 View-only | ❌ Hidden | ✅ Add only | 🔒 Language/Logout only | ❌ | ❌ |

Permission helpers in `lib/auth-context.tsx`:
- `isAdmin`, `isManager`, `isCashier`, `canManage`
- `canAccessReports`, `canManageProducts`, `canManageEmployees`, `canManageSettings`, `canDeleteCustomers`

### Web Routes

| Route | Description |
|-------|-------------|
| `/landing` | Marketing landing page with subscription signup |
| `/super_admin` | Super admin dashboard (redirects to login if unauthenticated) |
| `/super_admin/login` | Super admin login page |
| `/dashboard` | Store admin dashboard |
| `/store/:tenantId` | Public store website/menu for online ordering |

### API Routes

- `/api/license/*` — License validation (public)
- `/api/landing/subscribe` — Store registration (public)
- `/api/store/:tenantId/menu` — Public store menu (no auth)
- `/api/*` — Tenant-scoped routes (require `x-license-key` header)
- `/api/super-admin/*` — Platform admin routes (require super admin JWT)
- `/api/online-orders/public` — Public order submission

## Tech Stack

### Frontend
- **Framework**: Expo SDK 54 (React Native) with `expo-router` file-based routing
- **State**: TanStack React Query v5 (server state), React Context (Auth, Cart, Language, License)
- **UI**: `react-native-reanimated`, `expo-linear-gradient`, `expo-blur`, Ionicons

### Backend
- **Server**: Node.js with Express v5
- **ORM**: Drizzle ORM with PostgreSQL
- **Auth**: PIN-based employee login, JWT for super admin, license key middleware for API
- **Payments**: Stripe integration (optional — falls back gracefully when not configured)

### Database
- **PostgreSQL** via `DATABASE_URL` environment variable
- **Schema**: `shared/schema.ts` (Drizzle pgTable definitions)
- **Migrations**: `drizzle-kit push`

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Main tab navigation
    index.tsx           # POS screen
    products.tsx        # Product management (read-only for cashiers)
    customers.tsx       # Customer CRM
    reports.tsx         # Analytics (admin/manager only)
    online-orders.tsx   # Online order management
    settings.tsx        # Role-gated settings
  index.tsx             # Entry point (routing logic)
  intro.tsx             # Language selection onboarding
  login.tsx             # Employee PIN login
  license-gate.tsx      # Store activation
server/
  index.ts              # Express app setup, static serving, route config
  routes.ts             # Tenant-scoped API endpoints
  storage.ts            # Data access layer (Drizzle queries)
  superAdminRoutes.ts   # Super admin API endpoints
  superAdminAuth.ts     # JWT auth for super admin
  tenantAuth.ts         # License key middleware for tenant API security
  templates/
    landing-page.html   # Marketing/subscription page
    super-admin-dashboard.html  # Platform admin UI
    super-admin-login.html      # Super admin login
    dashboard.html      # Store admin dashboard
    restaurant-store.html       # Public store/menu page
shared/
  schema.ts             # Database schema (Drizzle + Zod)
lib/
  auth-context.tsx      # Employee auth + role permissions
  license-context.tsx   # License/tenant activation
  language-context.tsx  # i18n (EN, AR, DE)
  i18n.ts               # Translation strings
  query-client.ts       # API client with auth headers
```

## Key Features

- **POS Interface**: Cart, modifiers/toppings, multi-payment (Cash, Card, Mobile, QR), receipts with QR codes
- **Inventory**: Batch tracking with expiry dates (pharmacy-ready), warehouse management, low stock alerts
- **Multi-branch**: Branch-level stats, cross-branch dashboard
- **Online Ordering**: Public store pages, WebSocket order notifications
- **Super Admin**: Tenant management, subscription control, license generation, backup/restore, analytics
- **Backup System**: Automated daily backups, manual backup/restore per tenant
- **PWA Support**: Service worker, manifest.json for "Install App" prompt
- **Internationalization**: English, Arabic (RTL), German

## Development

- **Backend**: `npm run server:dev` (port 5000)
- **Frontend**: `npm run expo:dev` (port 8081, mapped to external port 80)
- **DB Push**: `npm run db:push`

## Production Build

- **Build**: `npm run expo:static:build && npm run server:build`
- **Run**: `npm run server:prod` — serves bundled server + static Expo build

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `EXPO_PUBLIC_DOMAIN` — Domain for API requests from frontend
- `REPLIT_DEV_DOMAIN` — CORS and Expo proxy config (auto-set on Replit)
