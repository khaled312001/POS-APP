import { db } from "./db";
import { eq, sql } from "drizzle-orm";
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

// Category definitions (unique to Pizza Lemon)
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

// Size-modifier for pizzas that come in two sizes
function sizeModifier(price33: number) {
    return [
        {
            name: "Grösse",
            required: true,
            options: [
                { label: "33cm Normal",  price: "0.00" },
                { label: "45cm Gross",   price: String((price33 >= 19 ? 5 : price33 >= 17 ? 5 : 5).toFixed(2)) },
            ],
        },
    ];
}

interface PizzaProduct {
    name: string;
    description: string;
    price: number;
    calzone?: boolean; // calzone = 45cm only
}

const PIZZAS: PizzaProduct[] = [
    { name: "Margherita",          description: "Tomatensauce, Mozzarella, Oregano",                                                          price: 14.00 },
    { name: "Profumata",           description: "Tomaten, Mozzarella, Zwiebeln, Knoblauch, Oregano",                                          price: 14.00 },
    { name: "Funghi",              description: "Tomatensauce, Mozzarella, Pilze",                                                            price: 15.00 },
    { name: "Spinat",              description: "Tomatensauce, Mozzarella, Spinat",                                                           price: 15.00 },
    { name: "Gorgonzola",          description: "Tomatensauce, Mozzarella, Gorgonzola",                                                       price: 16.00 },
    { name: "Prosciutto",          description: "Tomatensauce, Mozzarella, Schinken",                                                         price: 16.00 },
    { name: "Salami",              description: "Tomatensauce, Mozzarella, scharfe Salami",                                                   price: 16.00 },
    { name: "Arrabiata",           description: "Tomatensauce, Mozzarella, Oliven, Pilze, scharf",                                            price: 17.00 },
    { name: "Diavola",             description: "Tomatensauce, Mozzarella, scharfe Salami, Oliven, Zwiebeln",                                 price: 17.00 },
    { name: "Hawaii",              description: "Tomatensauce, Mozzarella, Schinken, Ananas",                                                 price: 17.00 },
    { name: "Prosciutto e Funghi", description: "Tomatensauce, Mozzarella, Pilze, Schinken",                                                  price: 17.00 },
    { name: "Siciliana",           description: "Tomatensauce, Mozzarella, Schinken, Sardellen, Kapern",                                      price: 17.00 },
    { name: "Tonno",               description: "Tomatensauce, Mozzarella, Thon, Zwiebeln",                                                   price: 17.00 },
    { name: "Fiorentina",          description: "Tomaten, Mozzarella, Spinat, Parmesan, Ei, Oregano",                                         price: 18.00 },
    { name: "Napoli",              description: "Tomatensauce, Mozzarella, Sardellen, Oliven, Kapern",                                        price: 18.00 },
    { name: "Piccante",            description: "Tomatensauce, Mozzarella, Peperoni, Peperoncini, Zwiebeln, Knoblauch, Oregano",              price: 18.00 },
    { name: "Pizzaiolo",           description: "Tomatensauce, Mozzarella, Speck, Knoblauch, Pilze",                                         price: 18.00 },
    { name: "Raclette",            description: "Tomatensauce, Mozzarella, Raclettekäse",                                                     price: 18.00 },
    { name: "A'Casa",              description: "Tomatensauce, Mozzarella, Geflügelgeschnetzeltes, Peperoni, Ei, Oregano",                    price: 19.00 },
    { name: "Carbonara",           description: "Tomatensauce, Mozzarella, Speck, Ei, Zwiebeln",                                             price: 19.00 },
    { name: "Frutti di Mare",      description: "Tomatensauce, Mozzarella, Meeresfrüchte, Oregano",                                          price: 19.00 },
    { name: "Gamberetti",          description: "Tomatensauce, Mozzarella, Crevetten, Knoblauch",                                            price: 19.00 },
    { name: "Kebab Pizza",         description: "Tomatensauce, Mozzarella, Kebabfleisch",                                                     price: 19.00 },
    { name: "Porcini",             description: "Tomaten, Mozzarella, Steinpilze, Zwiebeln, Oregano",                                         price: 19.00 },
    { name: "Poulet",              description: "Tomatensauce, Mozzarella, Poulet",                                                           price: 19.00 },
    { name: "Quattro Formaggi",    description: "Tomatensauce, Mozzarella, 4 Käsesorten, Mascarpone",                                        price: 19.00 },
    { name: "Quattro Stagioni",    description: "Tomatensauce, Mozzarella, Schinken, Pilze, Artischocken, Peperoni",                          price: 19.00 },
    { name: "Verdura",             description: "Tomatensauce, Mozzarella, Gemüse",                                                           price: 19.00 },
    { name: "Spezial",             description: "Tomatensauce, Mozzarella, Kalbfleisch, Knoblauch, Scharf, Kräuterbutter, Oregano",          price: 19.00 },
    { name: "Italiano",            description: "Tomatensauce, Mozzarella, Rohschinken, Mascarpone, Rucola",                                 price: 20.00 },
    { name: "Lemon Pizza",         description: "Tomatensauce, Mozzarella, Lammfleisch, Knoblauch, Zwiebeln, Peperoncini, Scharf",           price: 20.00 },
    { name: "Padrone",             description: "Tomatensauce, Mozzarella, Gorgonzola, Pilze",                                               price: 20.00 },
    { name: "Schloss Pizza",       description: "Tomatensauce, Mozzarella, Schinken, Speck, scharfe Salami",                                 price: 20.00 },
    { name: "Americano",           description: "Tomatensauce, Mozzarella, Speck, Mais, Zwiebeln",                                           price: 21.00 },
    { name: "Wunschpizza",         description: "Ihre Wunschpizza – wählen Sie Ihre Zutaten selbst",                                         price: 19.00 },
];

const CALZONES: PizzaProduct[] = [
    { name: "Calzone",         description: "Tomatensauce, Mozzarella, Schinken, Pilze, Ei",       price: 20.00, calzone: true },
    { name: "Calzone Kebab",   description: "Tomatensauce, Mozzarella, Kebabfleisch, Ei",           price: 20.00, calzone: true },
    { name: "Calzone Verdura", description: "Tomatensauce, Mozzarella, Saisongemüse",               price: 20.00, calzone: true },
];

const DONER_PRODUCTS = [
    { name: "Döner Box",      description: "Döner im Fladenbrot mit Salat und Sauce",         price: 13.00 },
    { name: "Extra Kebap",    description: "Extra Kebabfleisch als Beilage",                  price: 5.00  },
    { name: "Döner Teller",   description: "Kebabfleisch mit Beilagen auf dem Teller",        price: 15.00 },
    { name: "Lahmacun Döner", description: "Lahmacun mit Döner gefüllt",                      price: 12.00 },
];

const PIDE_PRODUCTS = [
    { name: "Wunschpide",       description: "Pide mit Ihrer Wahl an Zutaten",                price: 16.00 },
    { name: "Käse Pide",        description: "Pide mit Schafskäse",                           price: 14.00 },
    { name: "Fleisch Pide",     description: "Pide mit Hackfleisch und Tomaten",              price: 16.00 },
    { name: "Spinat Pide",      description: "Pide mit Spinat und Schafskäse",                price: 15.00 },
];

const TELLERGERICHTE = [
    { name: "Kebab Teller",   description: "Kebabfleisch mit Reis, Salat und Sauce",         price: 18.00 },
    { name: "Pita Teller",    description: "Gefülltes Pita mit Salat und Sauce",             price: 15.00 },
];

const LAHMACUN = [
    { name: "Lahmacun",       description: "Türkische Minipizza mit Hackfleisch",            price: 4.50  },
    { name: "Lahmacun 3er",   description: "3x Lahmacun mit Salat",                         price: 12.00 },
];

const SALATE = [
    { name: "Gemischter Salat",  description: "Frischer gemischter Salat",                  price: 8.00  },
    { name: "Griechischer Salat", description: "Tomaten, Gurken, Oliven, Feta",             price: 9.50  },
    { name: "Caesar Salat",      description: "Römersalat, Croutons, Parmesan, Caesar Dressing", price: 10.00 },
];

const DESSERTS = [
    { name: "Tiramisu",        description: "Klassisches italienisches Tiramisu",            price: 6.00  },
    { name: "Pannacotta",      description: "Cremige Pannacotta mit Fruchtsoße",            price: 6.00  },
    { name: "Schokoladenkuchen", description: "Warmer Schokoladenkuchen mit Vanilleeis",   price: 7.00  },
];

const SOFTGETRAENKE = [
    { name: "Coca-Cola 0.5l",     description: "Coca-Cola, 0.5l Flasche",                  price: 3.50  },
    { name: "Fanta 0.5l",         description: "Fanta, 0.5l Flasche",                       price: 3.50  },
    { name: "Sprite 0.5l",        description: "Sprite, 0.5l Flasche",                      price: 3.50  },
    { name: "Eistee 0.5l",        description: "Nestea Eistee, 0.5l",                       price: 3.50  },
    { name: "Mineralwasser 0.5l", description: "Mineralwasser, 0.5l Flasche",              price: 2.50  },
    { name: "Orangensaft 0.3l",   description: "Frischer Orangensaft",                      price: 4.00  },
    { name: "TWINT / Zahlung",    description: "Zahlung via TWINT",                         price: 0.00  },
];

const ALKOHOL = [
    { name: "Heineken 0.33l",    description: "Heineken Bier, 0.33l",                        price: 4.50  },
    { name: "Corona 0.33l",      description: "Corona Bier, 0.33l",                          price: 4.50  },
    { name: "Wein Rot 0.2l",     description: "Hauswein Rot, 0.2l",                          price: 5.00  },
    { name: "Wein Weiss 0.2l",   description: "Hauswein Weiss, 0.2l",                        price: 5.00  },
    { name: "Prosecco 0.1l",     description: "Prosecco, 0.1l",                              price: 5.50  },
];

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export async function seedPizzaLemon() {
    console.log("[PIZZA LEMON] Checking if Pizza Lemon store exists...");

    // Skip if store already exists
    const existing = await db.select().from(tenants).where(eq(tenants.ownerEmail, STORE_EMAIL));
    if (existing.length > 0) {
        console.log("[PIZZA LEMON] Store already exists – skipping seed.");
        return;
    }

    console.log("[PIZZA LEMON] Creating Pizza Lemon store...");

    // ── 1. Tenant ──────────────────────────────────────────────────────────────
    const hash = await bcrypt.hash(STORE_PASSWORD, 10);
    const [tenant] = await db.insert(tenants).values({
        businessName:  "Pizza Lemon",
        ownerName:     "Pizza Lemon Owner",
        ownerEmail:    STORE_EMAIL,
        ownerPhone:    "+41443103814",
        passwordHash:  hash,
        status:        "active",
        maxBranches:   3,
        maxEmployees:  20,
        storeType:     "restaurant",
        metadata: {
            website:     "https://pizzalemon.ch",
            address:     "Zürich, Schweiz",
            currency:    "CHF",
            signupDate:  new Date().toISOString(),
        },
    }).returning();

    // ── 2. Subscription ────────────────────────────────────────────────────────
    const endDate = addYears(new Date(), 2);
    const [sub] = await db.insert(tenantSubscriptions).values({
        tenantId:   tenant.id,
        planType:   "yearly",
        planName:   "Professional",
        price:      "79.00",
        status:     "active",
        startDate:  new Date(),
        endDate,
        autoRenew:  true,
    }).returning();

    // ── 3. License Key (fixed) ─────────────────────────────────────────────────
    await db.insert(licenseKeys).values({
        licenseKey:          LICENSE_KEY,
        tenantId:            tenant.id,
        subscriptionId:      sub.id,
        status:              "active",
        activatedAt:         new Date(),
        expiresAt:           endDate,
        maxActivations:      5,
        currentActivations:  0,
    });

    // ── 4. Branch ──────────────────────────────────────────────────────────────
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

    // ── 5. Warehouse ───────────────────────────────────────────────────────────
    await db.insert(warehouses).values({
        name:      "Hauptlager Pizza Lemon",
        branchId:  branch.id,
        isDefault: true,
        isActive:  true,
    });

    // ── 6. Tables ──────────────────────────────────────────────────────────────
    for (let i = 1; i <= 8; i++) {
        await db.insert(tables).values({
            branchId: branch.id,
            name:     `Tisch ${i}`,
            capacity: i <= 4 ? 2 : 4,
            status:   "available",
        });
    }

    // ── 7. Employees ───────────────────────────────────────────────────────────
    await db.insert(employees).values([
        {
            name:         "Admin",
            email:        "admin.emp@pizzalemon.ch",
            phone:        "+41443103810",
            pin:          "1234",
            role:         "admin",
            branchId:     branch.id,
            isActive:     true,
            hourlyRate:   "25.00",
            commissionRate: "0.00",
        },
        {
            name:         "Cashier",
            email:        "cashier@pizzalemon.ch",
            phone:        "+41443103811",
            pin:          "5678",
            role:         "cashier",
            branchId:     branch.id,
            isActive:     true,
            hourlyRate:   "18.00",
            commissionRate: "0.00",
        },
    ]);

    // ── 8. Categories ──────────────────────────────────────────────────────────
    const catMap: Record<string, number> = {};
    for (const cat of PIZZA_LEMON_CATEGORIES) {
        const [inserted] = await db.insert(categories).values({
            name:     cat.name,
            color:    cat.color,
            icon:     cat.icon,
            isActive: true,
        }).returning();
        catMap[cat.name] = inserted.id;
    }

    // ── 9. Products helper ────────────────────────────────────────────────────
    let sortOrder = 0;
    async function insertProduct(
        categoryKey: string,
        name: string,
        description: string,
        price: number,
        modifiers: any[] = [],
        costPrice?: number,
    ) {
        const sku = `PL-${slugify(name).toUpperCase().slice(0, 12)}-${++sortOrder}`.replace(/--+/g, "-");
        const [prod] = await db.insert(products).values({
            tenantId:       tenant.id,
            name,
            description,
            sku,
            categoryId:     catMap[categoryKey],
            price:          String(price.toFixed(2)),
            costPrice:      String((costPrice ?? price * 0.35).toFixed(2)),
            unit:           "piece",
            taxable:        true,
            trackInventory: false,
            isActive:       true,
            modifiers:      modifiers.length > 0 ? modifiers : [],
        }).returning();

        // Inventory entry (non-tracked items get 999 as standing stock)
        await db.insert(inventory).values({
            productId:          prod.id,
            branchId:           branch.id,
            quantity:           999,
            lowStockThreshold:  0,
            reorderPoint:       0,
        });
    }

    // ── 10. Insert all products ────────────────────────────────────────────────

    // Pizzas (with size modifier)
    for (const p of PIZZAS) {
        await insertProduct("Pizza", p.name, p.description, p.price, sizeModifier(p.price));
    }

    // Calzones (45cm only – no size modifier)
    for (const c of CALZONES) {
        await insertProduct("Calzone", c.name, c.description, c.price);
    }

    // Döner & Fingerfood
    for (const d of DONER_PRODUCTS) {
        await insertProduct("Döner & Fingerfood", d.name, d.description, d.price);
    }

    // Pide
    for (const p of PIDE_PRODUCTS) {
        await insertProduct("Pide", p.name, p.description, p.price, sizeModifier(p.price));
    }

    // Tellergerichte
    for (const t of TELLERGERICHTE) {
        await insertProduct("Tellergerichte", t.name, t.description, t.price);
    }

    // Lahmacun
    for (const l of LAHMACUN) {
        await insertProduct("Lahmacun", l.name, l.description, l.price);
    }

    // Salate
    for (const s of SALATE) {
        await insertProduct("Salat", s.name, s.description, s.price);
    }

    // Desserts
    for (const d of DESSERTS) {
        await insertProduct("Dessert", d.name, d.description, d.price);
    }

    // Softgetränke
    for (const s of SOFTGETRAENKE) {
        await insertProduct("Softgetränke", s.name, s.description, s.price);
    }

    // Alkoholische Getränke
    for (const a of ALKOHOL) {
        await insertProduct("Alkoholische Getränke", a.name, a.description, a.price);
    }

    // ── 11. Welcome notification ──────────────────────────────────────────────
    await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type:     "info",
        title:    "Willkommen bei Pizza Lemon!",
        message:  `Ihr POS-System ist bereit. Melden Sie sich mit der Lizenz an:\n\nE-Mail: ${STORE_EMAIL}\nPasswort: ${STORE_PASSWORD}\nLizenzschlüssel: ${LICENSE_KEY}\n\nAdmin-PIN: 1234 | Cashier-PIN: 5678`,
        priority: "high",
    });

    console.log(`[PIZZA LEMON] ✅ Store created successfully!`);
    console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
    console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
    console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
    console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
}
