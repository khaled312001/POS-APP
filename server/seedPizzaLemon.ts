import { db } from "./db";
import { eq, sql, inArray } from "drizzle-orm";
import {
    branches, employees, categories, products, inventory,
    tenants, tenantSubscriptions, licenseKeys, tenantNotifications,
    warehouses, tables,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { addYears } from "date-fns";

// ─── Pizza Lemon Store Credentials ────────────────────────────────────────────
// Tenant login:  admin@pizzalemon.ch  /  pizzalemon123
// License key:   PIZZALEMON-MAIN-2024-LMNA-B001
// Admin PIN:     1234
// Cashier PIN:   5678
// ─────────────────────────────────────────────────────────────────────────────

const STORE_EMAIL    = "admin@pizzalemon.ch";
const STORE_PASSWORD = "pizzalemon123";
const LICENSE_KEY    = "PIZZALEMON-MAIN-2024-LMNA-B001";
const BUSINESS_NAME  = "Pizza Lemon";

// Category definitions
const PIZZA_LEMON_CATEGORIES = [
    { name: "Pizza",               color: "#E53E3E", icon: "pizza"      },
    { name: "Calzone",             color: "#D69E2E", icon: "pizza"      },
    { name: "Döner & Fingerfood",  color: "#805AD5", icon: "fast-food"  },
    { name: "Pide",                color: "#2B6CB0", icon: "restaurant" },
    { name: "Tellergerichte",      color: "#276749", icon: "restaurant" },
    { name: "Lahmacun",            color: "#C05621", icon: "pizza"      },
    { name: "Salat",               color: "#2F855A", icon: "leaf"       },
    { name: "Dessert",             color: "#B7791F", icon: "ice-cream"  },
    { name: "Softgetränke",        color: "#2C7A7B", icon: "cafe"       },
    { name: "Alkoholische Getränke", color: "#6B46C1", icon: "wine"    },
];

// Size modifier for pizzas
function sizeModifier() {
    return [
        {
            name: "Grösse",
            required: true,
            options: [
                { label: "33cm Normal", price: "0.00" },
                { label: "45cm Gross",  price: "5.00" },
            ],
        },
    ];
}

interface MenuItem { name: string; description: string; price: number; }

const PIZZAS: MenuItem[] = [
    { name: "Margherita",          description: "Tomatensauce, Mozzarella, Oregano",                                                           price: 14.00 },
    { name: "Profumata",           description: "Tomaten, Mozzarella, Zwiebeln, Knoblauch, Oregano",                                           price: 14.00 },
    { name: "Funghi",              description: "Tomatensauce, Mozzarella, Pilze",                                                             price: 15.00 },
    { name: "Spinat",              description: "Tomatensauce, Mozzarella, Spinat",                                                            price: 15.00 },
    { name: "Gorgonzola",          description: "Tomatensauce, Mozzarella, Gorgonzola",                                                        price: 16.00 },
    { name: "Prosciutto",          description: "Tomatensauce, Mozzarella, Schinken",                                                          price: 16.00 },
    { name: "Salami",              description: "Tomatensauce, Mozzarella, scharfe Salami",                                                    price: 16.00 },
    { name: "Arrabiata",           description: "Tomatensauce, Mozzarella, Oliven, Pilze, scharf",                                             price: 17.00 },
    { name: "Diavola",             description: "Tomatensauce, Mozzarella, scharfe Salami, Oliven, Zwiebeln",                                  price: 17.00 },
    { name: "Hawaii",              description: "Tomatensauce, Mozzarella, Schinken, Ananas",                                                  price: 17.00 },
    { name: "Prosciutto e Funghi", description: "Tomatensauce, Mozzarella, Pilze, Schinken",                                                   price: 17.00 },
    { name: "Siciliana",           description: "Tomatensauce, Mozzarella, Schinken, Sardellen, Kapern",                                       price: 17.00 },
    { name: "Tonno",               description: "Tomatensauce, Mozzarella, Thon, Zwiebeln",                                                    price: 17.00 },
    { name: "Fiorentina",          description: "Tomaten, Mozzarella, Spinat, Parmesan, Ei, Oregano",                                          price: 18.00 },
    { name: "Napoli",              description: "Tomatensauce, Mozzarella, Sardellen, Oliven, Kapern",                                         price: 18.00 },
    { name: "Piccante",            description: "Tomatensauce, Mozzarella, Peperoni, Peperoncini, Zwiebeln, Knoblauch, Oregano",               price: 18.00 },
    { name: "Pizzaiolo",           description: "Tomatensauce, Mozzarella, Speck, Knoblauch, Pilze",                                          price: 18.00 },
    { name: "Raclette",            description: "Tomatensauce, Mozzarella, Raclettekäse",                                                      price: 18.00 },
    { name: "A'Casa",              description: "Tomatensauce, Mozzarella, Geflügelgeschnetzeltes, Peperoni, Ei, Oregano",                     price: 19.00 },
    { name: "Carbonara",           description: "Tomatensauce, Mozzarella, Speck, Ei, Zwiebeln",                                              price: 19.00 },
    { name: "Frutti di Mare",      description: "Tomatensauce, Mozzarella, Meeresfrüchte, Oregano",                                           price: 19.00 },
    { name: "Gamberetti",          description: "Tomatensauce, Mozzarella, Crevetten, Knoblauch",                                             price: 19.00 },
    { name: "Kebab Pizza",         description: "Tomatensauce, Mozzarella, Kebabfleisch",                                                      price: 19.00 },
    { name: "Porcini",             description: "Tomaten, Mozzarella, Steinpilze, Zwiebeln, Oregano",                                          price: 19.00 },
    { name: "Poulet",              description: "Tomatensauce, Mozzarella, Poulet",                                                            price: 19.00 },
    { name: "Quattro Formaggi",    description: "Tomatensauce, Mozzarella, 4 Käsesorten, Mascarpone",                                         price: 19.00 },
    { name: "Quattro Stagioni",    description: "Tomatensauce, Mozzarella, Schinken, Pilze, Artischocken, Peperoni",                           price: 19.00 },
    { name: "Verdura",             description: "Tomatensauce, Mozzarella, Gemüse",                                                            price: 19.00 },
    { name: "Spezial",             description: "Tomatensauce, Mozzarella, Kalbfleisch, Knoblauch, Scharf, Kräuterbutter, Oregano",           price: 19.00 },
    { name: "Italiano",            description: "Tomatensauce, Mozzarella, Rohschinken, Mascarpone, Rucola",                                  price: 20.00 },
    { name: "Lemon Pizza",         description: "Tomatensauce, Mozzarella, Lammfleisch, Knoblauch, Zwiebeln, Peperoncini, Scharf",            price: 20.00 },
    { name: "Padrone",             description: "Tomatensauce, Mozzarella, Gorgonzola, Pilze",                                                price: 20.00 },
    { name: "Schloss Pizza",       description: "Tomatensauce, Mozzarella, Schinken, Speck, scharfe Salami",                                  price: 20.00 },
    { name: "Americano",           description: "Tomatensauce, Mozzarella, Speck, Mais, Zwiebeln",                                            price: 21.00 },
    { name: "Wunschpizza",         description: "Ihre Wunschpizza – wählen Sie Ihre Zutaten selbst",                                          price: 19.00 },
];

const CALZONES: MenuItem[] = [
    { name: "Calzone",         description: "Tomatensauce, Mozzarella, Schinken, Pilze, Ei",  price: 20.00 },
    { name: "Calzone Kebab",   description: "Tomatensauce, Mozzarella, Kebabfleisch, Ei",      price: 20.00 },
    { name: "Calzone Verdura", description: "Tomatensauce, Mozzarella, Saisongemüse",          price: 20.00 },
];

const DONER: MenuItem[] = [
    { name: "Döner Box",      description: "Döner im Fladenbrot mit Salat und Sauce",      price: 13.00 },
    { name: "Extra Kebap",    description: "Extra Kebabfleisch als Beilage",                price: 5.00  },
    { name: "Döner Teller",   description: "Kebabfleisch mit Beilagen auf dem Teller",     price: 15.00 },
    { name: "Lahmacun Döner", description: "Lahmacun mit Döner gefüllt",                   price: 12.00 },
];

const PIDE: MenuItem[] = [
    { name: "Wunschpide",    description: "Pide mit Ihrer Wahl an Zutaten",          price: 16.00 },
    { name: "Käse Pide",     description: "Pide mit Schafskäse",                     price: 14.00 },
    { name: "Fleisch Pide",  description: "Pide mit Hackfleisch und Tomaten",        price: 16.00 },
    { name: "Spinat Pide",   description: "Pide mit Spinat und Schafskäse",          price: 15.00 },
];

const TELLER: MenuItem[] = [
    { name: "Kebab Teller",  description: "Kebabfleisch mit Reis, Salat und Sauce",  price: 18.00 },
    { name: "Pita Teller",   description: "Gefülltes Pita mit Salat und Sauce",      price: 15.00 },
];

const LAHMACUN: MenuItem[] = [
    { name: "Lahmacun",       description: "Türkische Minipizza mit Hackfleisch",    price: 4.50  },
    { name: "Lahmacun 3er",   description: "3x Lahmacun mit Salat",                 price: 12.00 },
];

const SALATE: MenuItem[] = [
    { name: "Gemischter Salat",   description: "Frischer gemischter Salat",                       price: 8.00  },
    { name: "Griechischer Salat", description: "Tomaten, Gurken, Oliven, Feta",                   price: 9.50  },
    { name: "Caesar Salat",       description: "Römersalat, Croutons, Parmesan, Caesar Dressing", price: 10.00 },
];

const DESSERTS: MenuItem[] = [
    { name: "Tiramisu",          description: "Klassisches italienisches Tiramisu",           price: 6.00 },
    { name: "Pannacotta",        description: "Cremige Pannacotta mit Fruchtsoße",           price: 6.00 },
    { name: "Schokoladenkuchen", description: "Warmer Schokoladenkuchen mit Vanilleeis",     price: 7.00 },
];

const SOFT: MenuItem[] = [
    { name: "Coca-Cola 0.5l",     description: "Coca-Cola, 0.5l",        price: 3.50 },
    { name: "Fanta 0.5l",         description: "Fanta, 0.5l",             price: 3.50 },
    { name: "Sprite 0.5l",        description: "Sprite, 0.5l",            price: 3.50 },
    { name: "Eistee 0.5l",        description: "Nestea Eistee, 0.5l",     price: 3.50 },
    { name: "Mineralwasser 0.5l", description: "Mineralwasser, 0.5l",    price: 2.50 },
    { name: "Orangensaft 0.3l",   description: "Frischer Orangensaft",    price: 4.00 },
];

const ALKOHOL: MenuItem[] = [
    { name: "Heineken 0.33l",  description: "Heineken Bier, 0.33l",     price: 4.50 },
    { name: "Corona 0.33l",    description: "Corona Bier, 0.33l",       price: 4.50 },
    { name: "Wein Rot 0.2l",   description: "Hauswein Rot, 0.2l",       price: 5.00 },
    { name: "Wein Weiss 0.2l", description: "Hauswein Weiss, 0.2l",     price: 5.00 },
    { name: "Prosecco 0.1l",   description: "Prosecco, 0.1l",           price: 5.50 },
];

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function seedPizzaLemon() {
    console.log("[PIZZA LEMON] Checking if Pizza Lemon store is properly configured...");

    // ── Phase 1: Ensure the license key exists ─────────────────────────────────
    const [existingKey] = await db.select().from(licenseKeys)
        .where(eq(licenseKeys.licenseKey, LICENSE_KEY));

    if (existingKey) {
        console.log("[PIZZA LEMON] License key already present – store is configured. ✅");
        return;
    }

    // ── Phase 2: Find or create the Pizza Lemon tenant ────────────────────────
    let tenant: typeof tenants.$inferSelect | undefined;

    // Check if any Pizza Lemon tenant exists (by name or old email)
    const pizzaLemonTenants = await db.select().from(tenants)
        .where(sql`LOWER(${tenants.businessName}) = 'pizza lemon'`);

    if (pizzaLemonTenants.length > 0) {
        // Use the first one – update it to the official credentials
        tenant = pizzaLemonTenants[0];
        console.log(`[PIZZA LEMON] Found existing store (ID ${tenant.id}, ${tenant.ownerEmail}). Upgrading credentials...`);

        const hash = await bcrypt.hash(STORE_PASSWORD, 10);
        await db.update(tenants).set({
            ownerEmail:   STORE_EMAIL,
            passwordHash: hash,
            status:       "active",
            storeType:    "restaurant",
            maxBranches:  3,
            maxEmployees: 20,
        }).where(eq(tenants.id, tenant.id));

        console.log(`[PIZZA LEMON] Credentials updated → email: ${STORE_EMAIL} / password: ${STORE_PASSWORD}`);
    } else {
        // No Pizza Lemon store at all – create one from scratch
        console.log("[PIZZA LEMON] No Pizza Lemon store found. Creating new store...");
        const hash = await bcrypt.hash(STORE_PASSWORD, 10);
        const [newTenant] = await db.insert(tenants).values({
            businessName:  BUSINESS_NAME,
            ownerName:     "Pizza Lemon Owner",
            ownerEmail:    STORE_EMAIL,
            ownerPhone:    "+41443103814",
            passwordHash:  hash,
            status:        "active",
            maxBranches:   3,
            maxEmployees:  20,
            storeType:     "restaurant",
        }).returning();
        tenant = newTenant;
    }

    // ── Phase 3: Ensure an active subscription ────────────────────────────────
    const subs = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenant.id));
    const activeSub = subs.find(s => s.status === "active");
    let subId: number;

    if (activeSub) {
        subId = activeSub.id;
        console.log("[PIZZA LEMON] Using existing active subscription.");
    } else {
        const endDate = addYears(new Date(), 2);
        const [newSub] = await db.insert(tenantSubscriptions).values({
            tenantId:  tenant.id,
            planType:  "yearly",
            planName:  "Professional",
            price:     "79.00",
            status:    "active",
            startDate: new Date(),
            endDate,
            autoRenew: true,
        }).returning();
        subId = newSub.id;
        console.log("[PIZZA LEMON] Created new subscription.");
    }

    // ── Phase 4: Add the fixed license key ───────────────────────────────────
    const endDate = addYears(new Date(), 2);
    await db.insert(licenseKeys).values({
        licenseKey:          LICENSE_KEY,
        tenantId:            tenant.id,
        subscriptionId:      subId,
        status:              "active",
        activatedAt:         new Date(),
        expiresAt:           endDate,
        maxActivations:      5,
        currentActivations:  0,
    });
    console.log(`[PIZZA LEMON] License key added: ${LICENSE_KEY}`);

    // ── Phase 5: Ensure branch exists ─────────────────────────────────────────
    let tenantBranches = await db.select().from(branches)
        .where(eq(branches.tenantId, tenant.id));

    let branchId: number;
    if (tenantBranches.length > 0) {
        branchId = tenantBranches[0].id;
        console.log(`[PIZZA LEMON] Using existing branch ID ${branchId}`);
    } else {
        const [branch] = await db.insert(branches).values({
            tenantId:  tenant.id,
            name:      "Pizza Lemon – Hauptfiliale",
            address:   "Zürich, Schweiz",
            phone:     "+41443103814",
            email:     STORE_EMAIL,
            isActive:  true,
            isMain:    true,
            currency:  "CHF",
            taxRate:   "7.70",
        }).returning();
        branchId = branch.id;

        await db.insert(warehouses).values({ name: "Hauptlager", branchId, isDefault: true, isActive: true });

        for (let i = 1; i <= 8; i++) {
            await db.insert(tables).values({ branchId, name: `Tisch ${i}`, capacity: i <= 4 ? 2 : 4, status: "available" });
        }
        console.log(`[PIZZA LEMON] Created branch, warehouse, 8 tables.`);
    }

    // ── Phase 6: Ensure admin & cashier employees ─────────────────────────────
    const existingEmps = await db.select().from(employees)
        .where(eq(employees.branchId, branchId));

    const hasAdmin   = existingEmps.some(e => e.role === "admin"   && e.pin === "1234");
    const hasCashier = existingEmps.some(e => e.role === "cashier" && e.pin === "5678");

    if (!hasAdmin) {
        await db.insert(employees).values({ name: "Admin", email: "admin.emp@pizzalemon.ch", pin: "1234", role: "admin", branchId, isActive: true });
        console.log("[PIZZA LEMON] Admin employee created (PIN: 1234)");
    }
    if (!hasCashier) {
        await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
        console.log("[PIZZA LEMON] Cashier employee created (PIN: 5678)");
    }

    // ── Phase 7: Ensure categories and products ───────────────────────────────
    const existingProds = await db.select().from(products)
        .where(eq(products.tenantId, tenant.id));

    if (existingProds.length < 10) {
        console.log("[PIZZA LEMON] Creating categories and products...");

        const catMap: Record<string, number> = {};
        for (const cat of PIZZA_LEMON_CATEGORIES) {
            const [inserted] = await db.insert(categories).values({ name: cat.name, color: cat.color, icon: cat.icon, isActive: true }).returning();
            catMap[cat.name] = inserted.id;
        }

        let idx = 0;
        async function insertItem(catKey: string, item: MenuItem, mods: any[] = []) {
            const sku = `PL-${slugify(item.name).toUpperCase().slice(0, 10)}-${++idx}`;
            const [prod] = await db.insert(products).values({
                tenantId: tenant!.id,
                name: item.name,
                description: item.description,
                sku,
                categoryId: catMap[catKey],
                price: String(item.price.toFixed(2)),
                costPrice: String((item.price * 0.35).toFixed(2)),
                unit: "piece",
                taxable: true,
                trackInventory: false,
                isActive: true,
                modifiers: mods,
            }).returning();
            await db.insert(inventory).values({ productId: prod.id, branchId, quantity: 999, lowStockThreshold: 0, reorderPoint: 0 });
        }

        for (const p of PIZZAS)   await insertItem("Pizza",               p, sizeModifier());
        for (const p of CALZONES) await insertItem("Calzone",             p);
        for (const p of DONER)    await insertItem("Döner & Fingerfood",  p);
        for (const p of PIDE)     await insertItem("Pide",                p, sizeModifier());
        for (const p of TELLER)   await insertItem("Tellergerichte",      p);
        for (const p of LAHMACUN) await insertItem("Lahmacun",            p);
        for (const p of SALATE)   await insertItem("Salat",               p);
        for (const p of DESSERTS) await insertItem("Dessert",             p);
        for (const p of SOFT)     await insertItem("Softgetränke",        p);
        for (const p of ALKOHOL)  await insertItem("Alkoholische Getränke", p);

        console.log(`[PIZZA LEMON] Products seeded.`);
    } else {
        console.log(`[PIZZA LEMON] Products already present (${existingProds.length}). Skipping.`);
    }

    // ── Notification ──────────────────────────────────────────────────────────
    await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type:     "info",
        title:    "Willkommen bei Pizza Lemon!",
        message:  `Email: ${STORE_EMAIL} | Passwort: ${STORE_PASSWORD} | Lizenz: ${LICENSE_KEY} | Admin-PIN: 1234 | Cashier-PIN: 5678`,
        priority: "high",
    }).onConflictDoNothing();

    console.log(`[PIZZA LEMON] ✅ Setup complete!`);
    console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
    console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
    console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
    console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
}
