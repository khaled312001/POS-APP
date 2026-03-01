import { db } from "../server/db";
import {
    tenants, branches, employees, categories, products, inventory,
    tenantSubscriptions, licenseKeys, tenantNotifications, saleItems, sales,
} from "../shared/schema";
import { eq, inArray, sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

// ============= PIZZA LEMON DATA =============

const TENANT_DATA = {
    businessName: "Pizza Lemon",
    ownerName: "Pizza Lemon Admin",
    ownerEmail: "admin@pizzalemon.ch",
    ownerPhone: "044 310 38 14",
    address: "Zürich, Switzerland",
    status: "active",
    maxBranches: 2,
    maxEmployees: 10,
    storeType: "restaurant",
};

const BRANCH_DATA = {
    name: "Pizza Lemon - Hauptfiliale",
    address: "Zürich, Switzerland",
    phone: "044 310 38 14",
    isMain: true,
    currency: "CHF",
    taxRate: "7.7",
};

const CATEGORIES_DATA = [
    { name: "Pizza", nameAr: "بيتزا", color: "#E63946", icon: "pizza" },
    { name: "Döner / Fingerfood", nameAr: "دونر / فينجر فود", color: "#F4A261", icon: "restaurant" },
    { name: "Pide", nameAr: "بيدة", color: "#2A9D8F", icon: "restaurant" },
    { name: "Tellergerichte", nameAr: "أطباق رئيسية", color: "#264653", icon: "restaurant" },
    { name: "Lahmacun", nameAr: "لحم بعجين", color: "#E76F51", icon: "restaurant" },
    { name: "Salat", nameAr: "سلطات", color: "#57CC99", icon: "leaf" },
    { name: "Dessert", nameAr: "حلويات", color: "#FFB5A7", icon: "ice-cream" },
    { name: "Softgetränke", nameAr: "مشروبات غازية", color: "#3B82F6", icon: "cafe" },
    { name: "Alkoholische Getränke", nameAr: "مشروبات كحولية", color: "#8B5CF6", icon: "wine" },
    { name: "Bier", nameAr: "بيرة", color: "#F59E0B", icon: "beer" },
];

const IMG_BASE = "https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pizza";
const IMG_CAT_BASE = "https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon";

interface ProductData {
    name: string;
    description: string;
    price: string;
    costPrice: string;
    category: string;
    image: string;
    sku: string;
    barcode: string;
    unit: string;
    variants?: any[];
}

const PRODUCTS_DATA: ProductData[] = [
    { name: "Margherita", description: "Tomatensauce, Mozzarella, Oregano", price: "15.00", costPrice: "4.00", category: "Pizza", image: `${IMG_BASE}/Pizza%20Margherita-220x220.jpg`, sku: "PZ-001", barcode: "7610001000001", unit: "piece", variants: [{ name: "33cm (Normal)", price: 15.00, sku: "PZ-001-N", stock: 0 }, { name: "45cm (Gross)", price: 28.00, sku: "PZ-001-G", stock: 0 }] },
    { name: "Prosciutto", description: "Tomatensauce, Mozzarella, Schinken", price: "16.50", costPrice: "5.00", category: "Pizza", image: `${IMG_BASE}/Pizza%20Prosciutto-220x220.jpg`, sku: "PZ-002", barcode: "7610001000002", unit: "piece", variants: [{ name: "33cm (Normal)", price: 16.50, sku: "PZ-002-N", stock: 0 }, { name: "45cm (Gross)", price: 31.00, sku: "PZ-002-G", stock: 0 }] },
    { name: "Funghi", description: "Tomatensauce, Mozzarella, Champignons", price: "16.50", costPrice: "5.00", category: "Pizza", image: `${IMG_BASE}/Funghi-220x220.jpg`, sku: "PZ-003", barcode: "7610001000003", unit: "piece", variants: [{ name: "33cm (Normal)", price: 16.50, sku: "PZ-003-N", stock: 0 }, { name: "45cm (Gross)", price: 31.00, sku: "PZ-003-G", stock: 0 }] },
    { name: "Salami", description: "Tomatensauce, Mozzarella, Salami", price: "16.50", costPrice: "5.00", category: "Pizza", image: `${IMG_BASE}/Salami-220x220.jpg`, sku: "PZ-004", barcode: "7610001000004", unit: "piece", variants: [{ name: "33cm (Normal)", price: 16.50, sku: "PZ-004-N", stock: 0 }, { name: "45cm (Gross)", price: 31.00, sku: "PZ-004-G", stock: 0 }] },
    { name: "Napoli", description: "Tomatensauce, Mozzarella, Sardellen, Kapern, Oliven", price: "17.00", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Pizza%20Napoli-220x220.jpg`, sku: "PZ-005", barcode: "7610001000005", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.00, sku: "PZ-005-N", stock: 0 }, { name: "45cm (Gross)", price: 32.00, sku: "PZ-005-G", stock: 0 }] },
    { name: "Hawaii", description: "Tomatensauce, Mozzarella, Schinken, Ananas", price: "17.00", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Hawaii-220x220.jpg`, sku: "PZ-006", barcode: "7610001000006", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.00, sku: "PZ-006-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-006-G", stock: 0 }] },
    { name: "Prosciutto e Funghi", description: "Tomatensauce, Mozzarella, Schinken, Champignons", price: "17.00", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Prosciutto%20e%20Funghi-220x220.jpg`, sku: "PZ-007", barcode: "7610001000007", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.00, sku: "PZ-007-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-007-G", stock: 0 }] },
    { name: "Tonno", description: "Tomatensauce, Mozzarella, Thunfisch, Zwiebeln", price: "17.50", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Tonno-220x220.jpg`, sku: "PZ-008", barcode: "7610001000008", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-008-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-008-G", stock: 0 }] },
    { name: "Diavola", description: "Tomatensauce, Mozzarella, Salami Piccante, Peperoncini", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Diavola-220x220.jpg`, sku: "PZ-009", barcode: "7610001000009", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-009-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-009-G", stock: 0 }] },
    { name: "Quattro Formaggi", description: "Tomatensauce, Mozzarella, Gorgonzola, Parmesan, Emmentaler", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Quatro%20Formaggi-220x220.jpg`, sku: "PZ-010", barcode: "7610001000010", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-010-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-010-G", stock: 0 }] },
    { name: "Quattro Stagioni", description: "Tomatensauce, Mozzarella, Schinken, Champignons, Peperoni, Artischocken", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Quatro%20Stagione-220x220.jpg`, sku: "PZ-011", barcode: "7610001000011", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-011-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-011-G", stock: 0 }] },
    { name: "Verdura", description: "Tomatensauce, Mozzarella, Gemüse, Peperoni, Champignons, Mais, Oliven", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Verdura-220x220.jpg`, sku: "PZ-012", barcode: "7610001000012", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-012-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-012-G", stock: 0 }] },
    { name: "Spinat", description: "Tomatensauce, Mozzarella, Spinat, Knoblauch", price: "17.00", costPrice: "5.00", category: "Pizza", image: `${IMG_BASE}/Spinat-220x220.jpg`, sku: "PZ-013", barcode: "7610001000013", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.00, sku: "PZ-013-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-013-G", stock: 0 }] },
    { name: "Calzone", description: "Tomatensauce, Mozzarella, Schinken, Champignons (geschlossen)", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Calzone-220x220.jpg`, sku: "PZ-014", barcode: "7610001000014", unit: "piece" },
    { name: "Calzone Kebab", description: "Tomatensauce, Mozzarella, Kebabfleisch (geschlossen)", price: "18.50", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Calzone%20Kebab-220x220.jpg`, sku: "PZ-015", barcode: "7610001000015", unit: "piece" },
    { name: "Calzone Verdura", description: "Tomatensauce, Mozzarella, Gemüse (geschlossen)", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Calzone%20Verdura-220x220.jpg`, sku: "PZ-016", barcode: "7610001000016", unit: "piece" },
    { name: "Kebab Pizza", description: "Tomatensauce, Mozzarella, Kebabfleisch, Zwiebeln, Peperoni", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Kebab%20Pizza-220x220.jpg`, sku: "PZ-017", barcode: "7610001000017", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-017-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-017-G", stock: 0 }] },
    { name: "Carbonara", description: "Rahmsauce, Mozzarella, Speck, Ei", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Carbonara-220x220.jpg`, sku: "PZ-018", barcode: "7610001000018", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-018-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-018-G", stock: 0 }] },
    { name: "Gorgonzola", description: "Rahmsauce, Mozzarella, Gorgonzola, Walnüsse", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Gorgonzola-220x220.jpg`, sku: "PZ-019", barcode: "7610001000019", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-019-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-019-G", stock: 0 }] },
    { name: "Frutti di Mare", description: "Tomatensauce, Mozzarella, Meeresfrüchte", price: "19.00", costPrice: "7.00", category: "Pizza", image: `${IMG_BASE}/Frutti%20di%20Mare-220x220.jpg`, sku: "PZ-020", barcode: "7610001000020", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-020-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-020-G", stock: 0 }] },
    { name: "Gamberetti", description: "Tomatensauce, Mozzarella, Crevetten, Knoblauch", price: "19.00", costPrice: "7.00", category: "Pizza", image: `${IMG_BASE}/Gamberetti-220x220.jpg`, sku: "PZ-021", barcode: "7610001000021", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-021-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-021-G", stock: 0 }] },
    { name: "Siciliana", description: "Tomatensauce, Mozzarella, Sardellen, Oliven, Kapern", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Siciliana-220x220.jpg`, sku: "PZ-022", barcode: "7610001000022", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-022-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-022-G", stock: 0 }] },
    { name: "Fiorentina", description: "Tomatensauce, Mozzarella, Spinat, Ei", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Fiorentina-220x220.jpg`, sku: "PZ-023", barcode: "7610001000023", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-023-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-023-G", stock: 0 }] },
    { name: "Poulet", description: "Tomatensauce, Mozzarella, Pouletbrust, Mais", price: "18.50", costPrice: "6.50", category: "Pizza", image: `${IMG_BASE}/Poulet-220x220.jpg`, sku: "PZ-024", barcode: "7610001000024", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.50, sku: "PZ-024-N", stock: 0 }, { name: "45cm (Gross)", price: 35.00, sku: "PZ-024-G", stock: 0 }] },
    { name: "Americano", description: "Tomatensauce, Mozzarella, Schinken, Spiegelei", price: "17.50", costPrice: "5.50", category: "Pizza", image: `${IMG_BASE}/Pizza%20Americano-220x220.jpg`, sku: "PZ-025", barcode: "7610001000025", unit: "piece", variants: [{ name: "33cm (Normal)", price: 17.50, sku: "PZ-025-N", stock: 0 }, { name: "45cm (Gross)", price: 33.00, sku: "PZ-025-G", stock: 0 }] },
    { name: "Arrabiata", description: "Tomatensauce, Mozzarella, scharfe Salami, Peperoncini, Tabasco", price: "18.00", costPrice: "6.00", category: "Pizza", image: `${IMG_BASE}/Arrabiata-220x220.jpg`, sku: "PZ-026", barcode: "7610001000026", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-026-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-026-G", stock: 0 }] },
    { name: "Piccante", description: "Tomatensauce, Mozzarella, Peperoncini, scharfe Sauce", price: "18.00", costPrice: "6.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-027", barcode: "7610001000027", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.00, sku: "PZ-027-N", stock: 0 }, { name: "45cm (Gross)", price: 34.00, sku: "PZ-027-G", stock: 0 }] },
    { name: "Italiano", description: "Tomatensauce, Mozzarella, Parmaschinken, Rucola, Parmesan", price: "19.00", costPrice: "7.00", category: "Pizza", image: `${IMG_BASE}/Italiano_1-220x220.jpg`, sku: "PZ-028", barcode: "7610001000028", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-028-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-028-G", stock: 0 }] },
    { name: "Porcini", description: "Rahmsauce, Mozzarella, Steinpilze, Kräuter", price: "19.00", costPrice: "7.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-029", barcode: "7610001000029", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-029-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-029-G", stock: 0 }] },
    { name: "Profumata", description: "Tomatensauce, Büffelmozzarella, Cherrytomaten, Basilikum", price: "19.00", costPrice: "7.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-030", barcode: "7610001000030", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-030-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-030-G", stock: 0 }] },
    { name: "Padrone", description: "Tomatensauce, Mozzarella, Rindfleisch, Zwiebeln, Peperoni", price: "19.50", costPrice: "7.50", category: "Pizza", image: `${IMG_BASE}/Padrone-220x220.jpg`, sku: "PZ-031", barcode: "7610001000031", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.50, sku: "PZ-031-N", stock: 0 }, { name: "45cm (Gross)", price: 37.00, sku: "PZ-031-G", stock: 0 }] },
    { name: "Pizzaiolo", description: "Tomatensauce, Mozzarella, Schinken, Salami, Peperoni, Champignons", price: "18.50", costPrice: "6.50", category: "Pizza", image: `${IMG_BASE}/Pizzaiolo-220x220.jpg`, sku: "PZ-032", barcode: "7610001000032", unit: "piece", variants: [{ name: "33cm (Normal)", price: 18.50, sku: "PZ-032-N", stock: 0 }, { name: "45cm (Gross)", price: 35.00, sku: "PZ-032-G", stock: 0 }] },
    { name: "A'Casa", description: "Tomatensauce, Mozzarella, Geflügelgeschnetzeltes, Peperoni, Ei", price: "19.00", costPrice: "7.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-033", barcode: "7610001000033", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-033-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-033-G", stock: 0 }] },
    { name: "Lemon Pizza", description: "Tomatensauce, Mozzarella, Kalbfleisch, Knoblauch, Scharf, Kräuterbutter", price: "19.00", costPrice: "7.00", category: "Pizza", image: `${IMG_BASE}/Lemon%20Pizza-220x220.jpg`, sku: "PZ-034", barcode: "7610001000034", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-034-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-034-G", stock: 0 }] },
    { name: "Raclette", description: "Tomatensauce, Mozzarella, Raclettekäse, Kartoffeln", price: "19.00", costPrice: "7.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-035", barcode: "7610001000035", unit: "piece", variants: [{ name: "33cm (Normal)", price: 19.00, sku: "PZ-035-N", stock: 0 }, { name: "45cm (Gross)", price: 36.00, sku: "PZ-035-G", stock: 0 }] },
    { name: "Schloss Pizza", description: "Tomatensauce, Mozzarella, Spezial Belag (Hausspezialität)", price: "20.00", costPrice: "8.00", category: "Pizza", image: `${IMG_BASE}/Schloss%20Pizza-220x220.jpg`, sku: "PZ-036", barcode: "7610001000036", unit: "piece", variants: [{ name: "33cm (Normal)", price: 20.00, sku: "PZ-036-N", stock: 0 }, { name: "45cm (Gross)", price: 38.00, sku: "PZ-036-G", stock: 0 }] },
    { name: "Spezial", description: "Tomatensauce, Mozzarella, Alles drauf (Chef Spezial)", price: "20.00", costPrice: "8.00", category: "Pizza", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PZ-037", barcode: "7610001000037", unit: "piece", variants: [{ name: "33cm (Normal)", price: 20.00, sku: "PZ-037-N", stock: 0 }, { name: "45cm (Gross)", price: 38.00, sku: "PZ-037-G", stock: 0 }] },

    // ===================== DÖNER / FINGERFOOD =====================
    { name: "Döner Kebab im Taschenbrot", description: "Kebabfleisch im Fladenbrot with Salat and Sauce", price: "10.50", costPrice: "3.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/D%C2%94ner%20Kebab%20Taschenbrot-220x220.jpg`, sku: "DF-001", barcode: "7610002000001", unit: "piece" },
    { name: "Döner Kebab im Dürüm", description: "Kebabfleisch im dünnen Fladenbrot gerollt", price: "11.50", costPrice: "4.00", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/D%C2%81r%C2%81m%20Kebab-220x220.jpg`, sku: "DF-002", barcode: "7610002000002", unit: "piece" },
    { name: "Döner Box", description: "Döner Kebab with Pommes frites in the Box", price: "13.00", costPrice: "4.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "DF-003", barcode: "7610002000003", unit: "piece" },
    { name: "Extra Kebap", description: "Extra Portion Kebabfleisch", price: "5.00", costPrice: "2.00", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "DF-004", barcode: "7610002000004", unit: "piece" },
    { name: "Cevapcici im Taschenbrot", description: "Cevapcici im Fladenbrot with Salat and Sauce", price: "11.50", costPrice: "4.00", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/Cevapcici%20Taschenbrot-220x220.jpg`, sku: "DF-005", barcode: "7610002000005", unit: "piece" },
    { name: "Hamburger", description: "Klassischer Hamburger with Salat and Sauce", price: "8.50", costPrice: "3.00", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/Hamburger-220x220.jpg`, sku: "DF-006", barcode: "7610002000006", unit: "piece" },
    { name: "Cheeseburger", description: "Hamburger with Käse, Salat and Sauce", price: "9.50", costPrice: "3.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "DF-007", barcode: "7610002000007", unit: "piece" },
    { name: "Chicken Nuggets Box", description: "Chicken Nuggets with Pommes frites and Sauce", price: "12.50", costPrice: "4.00", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/Chicken%20Nuggets%20Box-220x220.jpg`, sku: "DF-008", barcode: "7610002000008", unit: "piece" },
    { name: "Pommes frites (Normal)", description: "Pommes frites Portion Normal", price: "6.50", costPrice: "1.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/teller/Pommes-220x220.jpg`, sku: "DF-009", barcode: "7610002000009", unit: "piece" },
    { name: "Pommes frites (Gross)", description: "Pommes frites Portion Gross", price: "9.50", costPrice: "2.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/teller/Pommes-220x220.jpg`, sku: "DF-010", barcode: "761000200010", unit: "piece" },
    { name: "Falafel im Taschenbrot", description: "Falafel im Fladenbrot with Salat and Hummus", price: "10.50", costPrice: "3.50", category: "Döner / Fingerfood", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/Falafel%20Taschenbrot-220x220.jpg`, sku: "DF-011", barcode: "761000200011", unit: "piece" },

    // ===================== PIDE =====================
    { name: "Pide mit Hackfleisch", description: "Türkisches Fladenbrot with Hackfleisch and Gewürzen", price: "16.50", costPrice: "5.50", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Pide%20mit%20Hackfleisch-220x220.jpg`, sku: "PI-001", barcode: "7610003000001", unit: "piece" },
    { name: "Pide mit Käse", description: "Türkisches Fladenbrot with geschmolzenem Käse", price: "15.50", costPrice: "5.00", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Pide%20mit%20K%C2%84se-220x220.jpg`, sku: "PI-002", barcode: "7610003000002", unit: "piece" },
    { name: "Pide mit Käse & Ei", description: "Türkisches Fladenbrot with Käse and Spiegelei", price: "17.50", costPrice: "6.00", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Pide%20mit%20K%C2%84se%20und%20Ei-220x220.jpg`, sku: "PI-003", barcode: "7610003000003", unit: "piece" },
    { name: "Pide mit Spinat & Käse", description: "Türkisches Fladenbrot with Spinat and Käse", price: "17.00", costPrice: "5.50", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Pide%20mit%20K%C2%84se%20und%20Spinat-220x220.jpg`, sku: "PI-004", barcode: "7610003000004", unit: "piece" },
    { name: "Lemon Pide / Etli Ekmek", description: "Hausspezialität: Fladenbrot with Fleisch and Gewürzen", price: "19.50", costPrice: "7.00", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Lemon%20Pide-220x220.jpg`, sku: "PI-005", barcode: "7610003000005", unit: "piece" },
    { name: "Wunschpide", description: "Individuelle Pide with Wunsch-Belag", price: "18.50", costPrice: "6.50", category: "Pide", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "PI-006", barcode: "7610003000006", unit: "piece" },

    // ===================== TELLERGERICHTE =====================
    { name: "Döner Teller", description: "Döner Kebab with Pommes frites or Reis and Salat", price: "18.50", costPrice: "6.50", category: "Tellergerichte", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/teller/D%C2%94ner%20Teller%20mit%20Salat%20und%20Pommes-220x220.jpg`, sku: "TG-001", barcode: "7610004000001", unit: "piece" },
    { name: "Cevapcici Teller", description: "10 Stück Cevapcici with Pommes frites and Salat", price: "18.50", costPrice: "6.50", category: "Tellergerichte", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/teller/Cevapcici%20Teller-220x220.jpg`, sku: "TG-002", barcode: "7610004000002", unit: "piece" },
    { name: "Fischknusperli Teller", description: "Knusprige Fischstücke with Pommes frites and Salat", price: "18.50", costPrice: "6.50", category: "Tellergerichte", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "TG-003", barcode: "7610004000003", unit: "piece" },
    { name: "Chicken Nuggets Teller", description: "Chicken Nuggets with Pommes frites and Salat", price: "18.50", costPrice: "6.50", category: "Tellergerichte", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/teller/Chicken%20Nuggets-220x220.jpg`, sku: "TG-004", barcode: "7610004000004", unit: "piece" },

    // ===================== LAHMACUN =====================
    { name: "Lahmacun", description: "Türkische Pizza with Hackfleisch, Tomaten, Zwiebeln, Petersilie", price: "9.50", costPrice: "3.00", category: "Lahmacun", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/lahmacun/Lahmacun%20mit%20Salat-220x220.jpg`, sku: "LH-001", barcode: "7610005000001", unit: "piece" },
    { name: "Lahmacun mit Käse", description: "Lahmacun with extra Käse überbacken", price: "11.50", costPrice: "4.00", category: "Lahmacun", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "LH-002", barcode: "7610005000002", unit: "piece" },
    { name: "Lahmacun mit Döner", description: "Lahmacun gefüllt with Döner Kebab and Salat", price: "12.50", costPrice: "4.50", category: "Lahmacun", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/lahmacun/Lahmacun%20mit%20Salat%20und%20Kebab-220x220.jpg`, sku: "LH-003", barcode: "7610005000003", unit: "piece" },

    // ===================== SALAT =====================
    { name: "Gemischter Salat", description: "Frischer gemischter Salat with Dressing", price: "9.50", costPrice: "3.00", category: "Salat", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/salat/Gemischter%20Salat-220x220.jpg`, sku: "SA-001", barcode: "7610006000001", unit: "piece" },
    { name: "Griechischer Salat", description: "Salat with Feta, Oliven, Tomaten, Gurken, Zwiebeln", price: "11.50", costPrice: "4.00", category: "Salat", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/salat/Griehischer%20Salat-220x220.jpg`, sku: "SA-002", barcode: "7610006000002", unit: "piece" },
    { name: "Poulet Salat", description: "Salat with gegrillter Pouletbrust", price: "14.50", costPrice: "5.00", category: "Salat", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/salat/Lemon%20Salat-220x220.jpg`, sku: "SA-003", barcode: "7610006000003", unit: "piece" },
    { name: "Knoblibrot", description: "2 Stück Knoblauchbrot", price: "8.00", costPrice: "2.50", category: "Salat", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "SA-004", barcode: "7610006000004", unit: "piece" },

    // ===================== DESSERT =====================
    { name: "Baklava (4 Stk)", description: "4 Stück hausgemachtes Baklava", price: "8.00", costPrice: "2.50", category: "Dessert", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Dessert/Baklava-220x220.jpg`, sku: "DE-001", barcode: "7610007000001", unit: "piece" },
    { name: "Tiramisu Hausgemacht", description: "Hausgemachtes Tiramisu", price: "8.50", costPrice: "3.00", category: "Dessert", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Dessert/Tiramisu-220x220.jpg`, sku: "DE-002", barcode: "7610007000002", unit: "piece" },
    { name: "Marlenke Honig", description: "Marlenke Honigkuchen", price: "6.50", costPrice: "2.50", category: "Dessert", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Dessert/Marlenke%20mit%20Honig_-220x220.jpg`, sku: "DE-003", barcode: "7610007000003", unit: "piece" },
    { name: "Marlenke Schokolade", description: "Marlenke Schokoladenkuchen", price: "6.50", costPrice: "2.50", category: "Dessert", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "DE-004", barcode: "7610007000004", unit: "piece" },

    // ===================== SOFTGETRÄNKE =====================
    { name: "Coca Cola 0.5l", description: "Coca Cola 0.5 Liter", price: "4.50", costPrice: "1.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/catalog/icecek/getranke-coca-cola-220x220.jpg`, sku: "SG-001", barcode: "7610008000001", unit: "bottle" },
    { name: "Coca Cola 1.5l", description: "Coca Cola 1.5 Liter", price: "6.50", costPrice: "2.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/catalog/icecek/getranke-coca-cola-220x220.jpg`, sku: "SG-002", barcode: "7610008000002", unit: "bottle" },
    { name: "Fanta 0.5l", description: "Fanta Orange 0.5 Liter", price: "4.50", costPrice: "1.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/catalog/icecek/getranke-fanta-220x220.jpg`, sku: "SG-003", barcode: "7610008000003", unit: "bottle" },
    { name: "Sprite 0.5l", description: "Sprite 0.5 Liter", price: "4.50", costPrice: "1.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/catalog/icecek/getranke-fanta-220x220.jpg`, sku: "SG-004", barcode: "7610008000004", unit: "bottle" },
    { name: "Rivella 0.5l", description: "Rivella 0.5 Liter", price: "4.50", costPrice: "1.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "SG-005", barcode: "7610008000005", unit: "bottle" },
    { name: "Fuse Tea 0.5l", description: "Fuse Tea Eistee 0.5 Liter", price: "4.50", costPrice: "1.50", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "SG-006", barcode: "7610008000006", unit: "bottle" },
    { name: "Ayran 0.25l", description: "Türkisches Joghurtgetränk 0.25 Liter", price: "3.50", costPrice: "1.00", category: "Softgetränke", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "SG-007", barcode: "7610008000007", unit: "bottle" },

    // ===================== ALKOHOLISCHE GETRÄNKE =====================
    { name: "Merlot (Flasche)", description: "Rotwein Merlot Flasche", price: "28.00", costPrice: "12.00", category: "Alkoholische Getränke", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Rotwein%20(Merlot)-220x220-220x220.jpg`, sku: "AG-001", barcode: "7610009000001", unit: "bottle" },
    { name: "Chardonnay (Flasche)", description: "Weisswein Chardonnay Flasche", price: "28.00", costPrice: "12.00", category: "Alkoholische Getränke", image: `https://pizzalemon.ch/lemon/image/cache/placeholder-220x220.png`, sku: "AG-002", barcode: "7610009000002", unit: "bottle" },

    // ===================== BIER =====================
    { name: "Feldschlösschen 0.5l", description: "Feldschlösschen Bier 0.5 Liter", price: "6.00", costPrice: "2.50", category: "Bier", image: `https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/BierFeldschlossen_enl-220x220-220x220.jpg`, sku: "BI-001", barcode: "7610010000001", unit: "bottle" },
];

async function downloadImage(url: string, filename: string, attempts = 0): Promise<string> {
    const uploadDir = path.resolve(process.cwd(), "uploads", "products");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);

    return new Promise((resolve, reject) => {
        // Special case for placeholder
        if (url.includes("placeholder-220x220.png")) {
            // If it's a placeholder, we can just use the remote URL or a local generic one.
            // For now, let's keep the remote URL or return a specific string.
            return resolve(url);
        }

        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://pizzalemon.ch/lemon/'
            }
        };

        const request = https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(filePath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(`/uploads/products/${filename}`);
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location?.startsWith('http') ? response.headers.location : `https://pizzalemon.ch${response.headers.location}`;
                downloadImage(redirectUrl, filename, attempts).then(resolve).catch(reject);
            } else if (response.statusCode === 404 && attempts < 2) {
                // FALLBACK LOGIC
                let nextUrl = url;
                if (attempts === 0) {
                    // Try with/without "Pizza%20" prefix if it was in the 'pizza' folder
                    if (url.includes("/pizza/") && url.includes("/Pizza%20")) {
                        nextUrl = url.replace("/Pizza%20", "/");
                    } else if (url.includes("/pizza/")) {
                        nextUrl = url.replace("/pizza/", "/pizza/Pizza%20");
                    }
                } else if (attempts === 1) {
                    // Try space vs underscore in the filename part
                    const parts = url.split("/");
                    const last = parts.pop() || "";
                    if (last.includes("_")) {
                        nextUrl = parts.join("/") + "/" + last.replace(/_/g, "%20");
                    } else if (last.includes("%20")) {
                        nextUrl = parts.join("/") + "/" + last.replace(/%20/g, "_");
                    }
                }

                if (nextUrl !== url) {
                    console.log(`\n   🔄 Retrying with fallback: ${nextUrl}`);
                    downloadImage(nextUrl, filename, attempts + 1).then(resolve).catch(reject);
                } else {
                    reject(`HTTP 404 and no fallbacks left for ${url}`);
                }
            } else {
                reject(`HTTP ${response.statusCode} for ${url}`);
            }
        });

        request.on('error', (err) => {
            reject(err.message);
        });

        request.setTimeout(15000, () => {
            request.destroy();
            reject("Timeout");
        });
    });
}

async function seedPizzaLemon() {
    console.log("🍕 Starting Pizza Lemon seed with image download and variants...\n");

    // 0. CLEANUP
    console.log("🧹 Cleaning up existing Pizza Lemon data...");
    const existingTenant = await db.select().from(tenants).where(eq(tenants.ownerEmail, "admin@pizzalemon.ch"));
    if (existingTenant.length > 0) {
        const tenantId = existingTenant[0].id;
        await db.delete(licenseKeys).where(eq(licenseKeys.tenantId, tenantId));
        await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId));
        await db.delete(tenantNotifications).where(eq(tenantNotifications.tenantId, tenantId));

        const tenantBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId));
        const branchIds = tenantBranches.map(b => b.id);
        if (branchIds.length > 0) {
            await db.delete(inventory).where(inArray(inventory.branchId, branchIds));
            await db.delete(employees).where(inArray(employees.branchId, branchIds));
            await db.delete(branches).where(eq(branches.tenantId, tenantId));
        }

        await db.delete(products).where(eq(products.tenantId, tenantId));
        await db.delete(categories).where(eq(categories.tenantId, tenantId));
        await db.delete(tenants).where(eq(tenants.id, tenantId));
        console.log("   ✅ Existing data cleaned up!");
    }

    // 1. CREATE TENANT
    const [tenant] = await db.insert(tenants).values(TENANT_DATA as any).returning();

    // 2. CREATE SUBSCRIPTION
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const [sub] = await db.insert(tenantSubscriptions).values({
        tenantId: tenant.id,
        planName: "Yearly Pro",
        planType: "yearly",
        price: "299.99",
        status: "active",
        startDate: new Date(),
        endDate,
        autoRenew: true,
    }).returning();

    // 3. CREATE LICENSE KEY
    await db.insert(licenseKeys).values({
        licenseKey: "LEMON-2026-PIZZA-ZURI",
        tenantId: tenant.id,
        subscriptionId: sub.id,
        status: "active",
        maxActivations: 5,
        expiresAt: endDate,
    });

    // 4. CREATE BRANCH
    const [branch] = await db.insert(branches).values({ ...BRANCH_DATA, tenantId: tenant.id }).returning();

    // 5. CREATE EMPLOYEES
    await db.insert(employees).values([
        { name: "Admin Lemon", email: "admin@pizzalemon.ch", pin: "1234", role: "admin", branchId: branch.id, permissions: ["all"] },
        { name: "Cashier Lemon", email: "cashier@pizzalemon.ch", pin: "0000", role: "cashier", branchId: branch.id, permissions: ["pos", "customers"] }
    ]);

    // 6. CREATE CATEGORIES
    const categoryMap: Record<string, number> = {};
    for (const cat of CATEGORIES_DATA) {
        const [created] = await db.insert(categories).values({ ...cat, tenantId: tenant.id } as any).returning();
        categoryMap[cat.name] = created.id;
    }

    // 7. CREATE PRODUCTS
    console.log("7️⃣ Creating products and downloading images...");
    let productCount = 0;
    for (const prod of PRODUCTS_DATA) {
        const categoryId = categoryMap[prod.category];

        let localImagePath = prod.image;
        try {
            const ext = path.extname(prod.image.split('?')[0]) || ".png";
            const filename = `${prod.sku}${ext}`;
            localImagePath = await downloadImage(prod.image, filename);
            process.stdout.write(".");
        } catch (e) {
            console.log(`\n   ⚠️ Image download failed for ${prod.name}, using remote URL`);
        }

        const [created] = await db.insert(products).values({
            name: prod.name,
            description: prod.description,
            price: prod.price,
            costPrice: prod.costPrice,
            categoryId,
            tenantId: tenant.id,
            image: localImagePath,
            sku: prod.sku,
            barcode: prod.barcode,
            unit: prod.unit,
            isActive: true,
            trackInventory: false, // Restaurants don't track raw inventory for cooked food
            variants: prod.variants || []
        }).returning();

        // Create initial inventory dummy (even if not tracked)
        await db.insert(inventory).values({ productId: created.id, branchId: branch.id, quantity: 999 });

        productCount++;
    }
    console.log(`\n   ✅ ${productCount} products created`);

    // 8. NOTIFICATION
    await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type: "info",
        title: "Willkommen bei Barmagly POS!",
        message: `Hallo Team! Ihr POS-System ist bereit mit lokalen Bildern und Größen-Optionen.`,
        priority: "normal",
    });

    console.log(`\n🎉 PIZZA LEMON SETUP COMPLETE! Tenant ID: ${tenant.id}`);
    process.exit(0);
}

seedPizzaLemon().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
