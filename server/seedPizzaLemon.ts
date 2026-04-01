import { db } from "./db";
import { eq } from "drizzle-orm";
import {
    branches, employees, categories, products, inventory,
    tenants, tenantSubscriptions, licenseKeys, tenantNotifications,
    warehouses, tables, landingPageConfig, vehicles,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { addYears } from "date-fns";

// ─── Pizza Lemon Store Credentials ────────────────────────────────────────────
// Tenant login:  admin@pizzalemon.ch  /  pizzalemon123
// License key:   PIZZALEMON-MAIN-2024-LMNA-B001
// Admin PIN:     1234
// Cashier PIN:   5678
// ─────────────────────────────────────────────────────────────────────────────

const STORE_EMAIL = "admin@pizzalemon.ch";
const STORE_PASSWORD = "pizzalemon123";
const LICENSE_KEY = "PIZZALEMON-MAIN-2024-LMNA-B001";
const BUSINESS_NAME = "Pizza Lemon";

// Local image base URL (served by Express from uploads/products/)
const IMG = (filename: string) => `/uploads/products/${filename}`;

// Category definitions
const PIZZA_LEMON_CATEGORIES = [
    { name: "Pizza", color: "#E53E3E", icon: "pizza", sortOrder: 1 },
    { name: "Calzone", color: "#D69E2E", icon: "pizza", sortOrder: 2 },
    { name: "Pide", color: "#2B6CB0", icon: "restaurant", sortOrder: 3 },
    { name: "Lahmacun", color: "#C05621", icon: "pizza", sortOrder: 4 },
    { name: "Tellergerichte", color: "#276749", icon: "restaurant", sortOrder: 5 },
    { name: "Fingerfood", color: "#805AD5", icon: "fast-food", sortOrder: 6 },
    { name: "Salat", color: "#2F855A", icon: "leaf", sortOrder: 7 },
    { name: "Dessert", color: "#B7791F", icon: "ice-cream", sortOrder: 8 },
    { name: "Getränke", color: "#2C7A7B", icon: "cafe", sortOrder: 9 },
    { name: "Bier", color: "#744210", icon: "beer", sortOrder: 10 },
    { name: "Alkoholische Getränke", color: "#6B46C1", icon: "wine", sortOrder: 11 },
    { name: "Extra", color: "#4A5568", icon: "add-circle", sortOrder: 12 },
];

// Per-pizza size modifier with correct 45cm surcharge
function pizzaModifier(price33: number, price45: number) {
    const surcharge = (price45 - price33).toFixed(2);
    return [
        {
            name: "Grösse",
            required: true,
            options: [
                { label: "33cm", price: "0.00" },
                { label: "45cm", price: surcharge },
            ],
        },
        {
            name: "Extras",
            required: false,
            multiple: true,
            options: [
                { label: "Extra Käse", price: "0.00" },
                { label: "Extra Pilze", price: "0.00" },
                { label: "Extra Schinken", price: "0.00" },
                { label: "Extra Salami", price: "0.00" },
                { label: "Extra Kebabfleisch", price: "0.00" },
                { label: "Extra Oliven", price: "0.00" },
                { label: "Extra Peperoni", price: "0.00" },
                { label: "Knoblauchsauce", price: "0.00" },
                { label: "Scharfe Sauce", price: "0.00" },
                { label: "Käserand (33cm)", price: "3.00" },
                { label: "Käserand (45cm)", price: "6.00" },
            ],
        },
    ];
}

// Drink size modifier for items with small/large option
function drinkSizeModifier(largeExtra: number) {
    return [
        {
            name: "Grösse",
            required: true,
            options: [
                { label: "50cl", price: "0.00" },
                { label: "1.5 L", price: largeExtra.toFixed(2) },
            ],
        },
    ];
}

// Sauce modifier for Döner/Kebab sandwiches
function sauceModifier() {
    return [
        {
            name: "Sauce",
            required: false,
            options: [
                { label: "Cocktailsauce", price: "0.00" },
                { label: "Joghurtsauce", price: "0.00" },
                { label: "Joghurt + Cocktail", price: "0.00" },
            ],
        },
    ];
}

// Side choice for Teller items (Pommes or Salat)
function sideModifier() {
    return [
        {
            name: "Beilage",
            required: true,
            options: [
                { label: "Pommes Frites", price: "0.00" },
                { label: "Salat", price: "0.00" },
            ],
        },
    ];
}

// Dressing choice for salad items
function dressingModifier() {
    return [
        {
            name: "Salatsauce",
            required: false,
            options: [
                { label: "Italienisch", price: "0.00" },
                { label: "Französisch", price: "0.00" },
                { label: "ohne Salatsauce", price: "0.00" },
            ],
        },
    ];
}

interface MenuItem { name: string; description: string; price: number; price45?: number; image?: string; }

// ─── PIZZA (01-34) ─────────────────────────────────────────────────────────────
const PIZZAS: MenuItem[] = [
    { name: "Margherita", description: "Tomatensauce, Mozzarella, Oregano", price: 15.00, price45: 27.00, image: IMG("pizzalemon_01_margherita.jpg") },
    { name: "Profumata", description: "Zwiebeln, Knoblauch", price: 16.00, price45: 29.00, image: IMG("pizzalemon_02_profumata.jpg") },
    { name: "Funghi", description: "Frische Champignons", price: 16.00, price45: 30.00, image: IMG("pizzalemon_03_funghi.jpg") },
    { name: "Spinat", description: "Spinat", price: 16.00, price45: 30.00, image: IMG("pizzalemon_04_spinat.jpg") },
    { name: "Gorgonzola", description: "Gorgonzola", price: 16.00, price45: 31.00, image: IMG("pizzalemon_05_gorgonzola.jpg") },
    { name: "Prosciutto", description: "Schinken", price: 17.00, price45: 32.00, image: IMG("pizzalemon_06_prosciutto.jpg") },
    { name: "Salami", description: "Scharfe Salami", price: 17.00, price45: 32.00, image: IMG("pizzalemon_07_salami.jpg") },
    { name: "Arrabbiata", description: "Oliven, frische Champignons, scharf", price: 17.00, price45: 33.00, image: IMG("pizzalemon_09_arrabbiata.jpg") },
    { name: "Diavola", description: "Scharfe Salami, Oliven, Zwiebeln", price: 18.00, price45: 33.00, image: IMG("pizzalemon_08_diavola.jpg") },
    { name: "Siciliana", description: "Schinken, Sardellen, Kapern", price: 18.00, price45: 33.00, image: IMG("pizzalemon_10_siciliana.jpg") },
    { name: "Prosciutto E Funghi", description: "Frische Champignons, Schinken", price: 18.00, price45: 33.00, image: IMG("pizzalemon_11_prosciutto_e_funghi.jpg") },
    { name: "Hawaii", description: "Schinken, Ananas", price: 18.00, price45: 33.00, image: IMG("pizzalemon_12_hawaii.jpg") },
    { name: "Tonno", description: "Thon, Zwiebeln", price: 18.00, price45: 33.00, image: IMG("pizzalemon_13_tonno.jpg") },
    { name: "Piccante", description: "Peperoni, Peperoncini, Zwiebeln, Knoblauch", price: 18.00, price45: 34.00, image: IMG("pizzalemon_14_piccante.jpg") },
    { name: "Raclette", description: "Raclettekäse", price: 18.00, price45: 34.00, image: IMG("pizzalemon_15_raclette.jpg") },
    { name: "Fiorentina", description: "Spinat, Parmesan, Ei, Oregano", price: 19.00, price45: 34.00, image: IMG("pizzalemon_16_fiorentina.jpg") },
    { name: "Kebab Pizza", description: "Kebabfleisch", price: 20.00, price45: 35.00, image: IMG("pizzalemon_17_kebab_pizza.jpg") },
    { name: "Poulet", description: "Poulet", price: 20.00, price45: 35.00, image: IMG("pizzalemon_18_poulet.jpg") },
    { name: "Carbonara", description: "Speck, Ei, Zwiebeln", price: 20.00, price45: 35.00, image: IMG("pizzalemon_19_carbonara.jpg") },
    { name: "Gamberetti", description: "Crevetten, Knoblauch", price: 20.00, price45: 35.00, image: IMG("pizzalemon_20_gamberetti.jpg") },
    { name: "Quattro Formaggi", description: "4 Käsesorten, Mascarpone", price: 20.00, price45: 35.00, image: IMG("pizzalemon_21_quattro_formaggi.jpg") },
    { name: "Quattro Stagioni", description: "Schinken, Champignons, Artischocken, Peperoni", price: 20.00, price45: 35.00, image: IMG("pizzalemon_22_quattro_stagioni.jpg") },
    { name: "Frutti Di Mare", description: "Meeresfrüchte", price: 20.00, price45: 35.00, image: IMG("pizzalemon_23_frutti_di_mare.jpg") },
    { name: "Verdura", description: "Gemüse", price: 20.00, price45: 35.00, image: IMG("pizzalemon_24_verdura.jpg") },
    { name: "Napoli", description: "Sardellen, Oliven, Kapern", price: 18.00, price45: 34.00, image: IMG("pizzalemon_25_napoli.jpg") },
    { name: "Pizzaiolo", description: "Speck, Knoblauch, frische Champignons", price: 18.00, price45: 34.00, image: IMG("pizzalemon_26_pizzaiolo.jpg") },
    { name: "Acasa", description: "Geflügelgeschnetzeltes, Peperoni, Ei", price: 20.00, price45: 36.00, image: IMG("pizzalemon_27_a_casa.jpg") },
    { name: "Porcini", description: "Steinpilze, Zwiebeln", price: 20.00, price45: 36.00, image: IMG("pizzalemon_28_porcini.jpg") },
    { name: "Spezial", description: "Kalbfleisch, Knoblauch, scharf, Kräuterbutter", price: 21.00, price45: 36.00, image: IMG("pizzalemon_29_spezial.jpg") },
    { name: "Padrone", description: "Gorgonzola, frische Champignons", price: 21.00, price45: 35.00, image: IMG("pizzalemon_30_padrone.jpg") },
    { name: "Schloss Pizza", description: "Schinken, Speck, scharfe Salami", price: 21.00, price45: 36.00, image: IMG("pizzalemon_31_schloss_pizza.jpg") },
    { name: "Italiano", description: "Rohschinken, Mascarpone, Rucola", price: 21.00, price45: 36.00, image: IMG("pizzalemon_32_italiano.jpg") },
    { name: "Americano", description: "Speck, Mais, Zwiebeln", price: 21.00, price45: 36.00, image: IMG("pizzalemon_33_americano.jpg") },
    { name: "Lemon Pizza", description: "Lammfleisch, Knoblauch, Zwiebeln, Peperoncini, scharf", price: 21.00, price45: 36.00, image: IMG("pizzalemon_34_lemon_pizza.jpg") },
];

// ─── CALZONE ──────────────────────────────────────────────────────────────────
const CALZONES: MenuItem[] = [
    { name: "Calzone", description: "Tomaten, Mozzarella, Schinken, Pilze, Ei", price: 20.00, image: IMG("pizzalemon_c1_calzone.jpg") },
    { name: "Calzone Kebab", description: "Tomaten, Mozzarella, Kebabfleisch, Ei", price: 20.00, image: IMG("pizzalemon_c2_calzone_kebab.jpg") },
    { name: "Calzone Verdura", description: "Tomaten, Mozzarella, Saisongemüse", price: 20.00, image: IMG("pizzalemon_c3_calzone_verdura.jpg") },
];

// ─── PIDE ─────────────────────────────────────────────────────────────────────
const PIDE: MenuItem[] = [
    { name: "Pide mit Käse", description: "Pide mit Schafskäse", price: 15.00, image: IMG("pizzalemon_36_pide_mit_kaese.jpg") },
    { name: "Pide mit Hackfleisch", description: "Pide mit Hackfleisch", price: 17.00, image: IMG("pizzalemon_37_pide_mit_hackfleisch.jpg") },
    { name: "Pide mit Käse und Hackfleisch", description: "Pide mit Schafskäse und Hackfleisch", price: 18.00, image: IMG("pizzalemon_38_pide_kaese_hackfleisch.jpg") },
    { name: "Pide mit Käse und Spinat", description: "Pide mit Schafskäse und Spinat", price: 18.00, image: IMG("pizzalemon_39_pide_kaese_spinat.jpg") },
    { name: "Pide mit Käse und Ei", description: "Pide mit Schafskäse und Ei", price: 18.00, image: IMG("pizzalemon_40_pide_kaese_ei.jpg") },
    { name: "Lemon Pide / Eti Ekmek", description: "Gewürztes Hackfleisch und Käse", price: 18.00, image: IMG("pizzalemon_41_lemon_pide.jpg") },
    { name: "Lemon Pide Spezial / Bicak Arasi", description: "Gewürztes, fein gehacktes Fleisch", price: 20.00, image: IMG("pizzalemon_42_lemon_pide_spezial.jpg") },
    { name: "Pide mit Sucuk", description: "Knoblauchwurst", price: 18.00, image: IMG("pizzalemon_43_pide_mit_sucuk.jpg") },
    { name: "Pide mit Kebabfleisch", description: "Pide mit Kebabfleisch", price: 20.00, image: IMG("pizzalemon_44_pide_mit_kebabfleisch.jpg") },
];

// ─── LAHMACUN ─────────────────────────────────────────────────────────────────
const LAHMACUN: MenuItem[] = [
    { name: "Lahmacun mit Salat", description: "Türkische Minipizza mit Hackfleisch und frischem Salat", price: 15.00, image: IMG("pizzalemon_45_lahmacun_mit_salat.jpg") },
    { name: "Lahmacun mit Salat und Kebab", description: "Lahmacun mit frischem Salat und Kebabfleisch", price: 20.00, image: IMG("pizzalemon_46_lahmacun_salat_kebab.jpg") },
];

// ─── TELLERGERICHTE ───────────────────────────────────────────────────────────
const TELLERGERICHTE: MenuItem[] = [
    { name: "Döner Teller Mit Pommes", description: "Döner Teller mit Pommes", price: 20.00, image: IMG("pizzalemon_47_doener_teller_pommes.jpg") },
    { name: "Döner Teller Mit Salat", description: "Döner Teller mit Salat", price: 20.00, image: IMG("pizzalemon_48_doener_teller_salat.jpg") },
    { name: "Döner Teller Mit Salat Und Pommes", description: "Döner Teller mit Salat und Pommes", price: 22.00, image: IMG("pizzalemon_49_doener_teller_komplett.jpg") },
    { name: "Chicken Nuggets 8 Stk.", description: "Mit Pommes oder Salat", price: 19.00, image: IMG("pizzalemon_50_chicken_nuggets_8stk.jpg") },
    { name: "Pouletschnitzel", description: "Mit Pommes oder Salat und Brot", price: 19.00, image: IMG("pizzalemon_51_pouletschnitzel.jpg") },
    { name: "Pouletflügeli 12 Stk.", description: "Mit Pommes oder Salat und Brot", price: 20.00, image: IMG("pizzalemon_52_pouletfluegeli_12stk.jpg") },
    { name: "Poulet Kebab Teller", description: "Mit Pommes oder Salat und Brot", price: 20.00, image: IMG("pizzalemon_53_poulet_kebab_teller.jpg") },
    { name: "Lamm Kebab Teller / Sac Kavurma", description: "Mit Pommes oder Salat und Brot", price: 22.00, image: IMG("pizzalemon_54_lamm_kebab_teller.jpg") },
    { name: "Köfte Teller", description: "Mit Pommes oder Salat und Brot", price: 21.00, image: IMG("pizzalemon_55_koefte_teller.jpg") },
    { name: "Cevapcici", description: "Mit Pommes oder Salat und Brot", price: 19.00, image: IMG("pizzalemon_56_cevapcici_teller.jpg") },
    { name: "Falafel Teller", description: "Mit Pommes oder Salat und Brot", price: 18.00, image: IMG("pizzalemon_57_falafel_teller.jpg") },
    { name: "Pommes", description: "Pommes frites, knusprig frittiert", price: 10.00, image: IMG("pizzalemon_58_pommes.jpg") },
    { name: "Original Schweins Cordon Bleu", description: "Mit frischem Gemüse, Salat, Pommes", price: 23.00, image: IMG("pizzalemon_59_cordon_bleu.jpg") },
];

// ─── FINGERFOOD ───────────────────────────────────────────────────────────────
const FINGERFOOD: MenuItem[] = [
    { name: "Döner Kebab Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_60_doener_kebab_tasche.jpg") },
    { name: "Dürüm Kebab Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_61_dueruem_kebab.jpg") },
    { name: "Döner Box Mit Salat Und Pommes", description: "Döner Box mit Salat und Pommes", price: 14.00, image: IMG("pizzalemon_62_doener_box.jpg") },
    { name: "Falafel Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 13.00, image: IMG("pizzalemon_63_falafel_taschenbrot.jpg") },
    { name: "Falafel Dürüm Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 13.00, image: IMG("pizzalemon_64_falafel_dueruem.jpg") },
    { name: "Poulet Pepito", description: "Poulet im Fladenbrot", price: 13.00, image: IMG("pizzalemon_65_poulet_pepito.jpg") },
    { name: "Lamm Pepito", description: "Lamm im Fladenbrot", price: 15.00, image: IMG("pizzalemon_66_lamm_pepito.jpg") },
    { name: "Lemon Burger", description: "Lemon Burger mit Rindfleisch, Raclettekäse und Ei", price: 17.00, image: IMG("pizzalemon_68_lemon_burger.jpg") },
    { name: "Cheeseburger", description: "Mit Rindfleisch und Käse", price: 14.00, image: IMG("pizzalemon_69_cheeseburger.jpg") },
    { name: "Hamburger Mit Rindfleisch", description: "Hamburger mit Rindfleisch", price: 13.00, image: IMG("pizzalemon_70_hamburger_rindfleisch.jpg") },
    { name: "Poulet Kebab Mit Gemüse Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_71_poulet_kebab_tasche.jpg") },
    { name: "Poulet Kebab Mit Gemüse Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_72_poulet_kebab_fladen.jpg") },
    { name: "Lamm Kebab Mit Gemüse Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 15.00, image: IMG("pizzalemon_73_lamm_kebab_tasche.jpg") },
    { name: "Lamm Kebab Mit Gemüse Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 15.00, image: IMG("pizzalemon_74_lamm_kebab_fladen.jpg") },
    { name: "Köfte Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_75_koefte_taschenbrot.jpg") },
    { name: "Cevapcici Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14.00, image: IMG("pizzalemon_76_cevapcici_taschenbrot.jpg") },
    { name: "Falafel Box Mit Salat Und Pommes", description: "Falafel Box mit Salat und Pommes", price: 13.00, image: IMG("pizzalemon_77_falafel_box.jpg") },
    { name: "Chicken Nuggets Box", description: "Chicken Nuggets Box", price: 13.00, image: IMG("pizzalemon_78_chicken_nuggets_box.jpg") },
    { name: "Kebab Im Fladenbrot mit Raclette", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16.00, image: IMG("pizzalemon_79_kebab_fladen_raclette.jpg") },
    { name: "Kebab Im Taschenbrot mit Raclette", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16.00, image: IMG("pizzalemon_80_kebab_tasche_raclette.jpg") },
    { name: "Kebab Im Fladenbrot mit Speck", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16.00, image: IMG("pizzalemon_81_kebab_fladen_speck.jpg") },
    { name: "Kebab Im Taschenbrot mit Speck", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16.00, image: IMG("pizzalemon_82_kebab_tasche_speck.jpg") },
];

// ─── SALAT ────────────────────────────────────────────────────────────────────
const SALATE: MenuItem[] = [
    { name: "Grüner Salat", description: "Sauce nach Wahl: Italienisch oder Französisch", price: 9.00, image: IMG("pizzalemon_83_gruener_salat.jpg") },
    { name: "Gemischter Salat", description: "Sauce nach Wahl: Italienisch oder Französisch", price: 12.00, image: IMG("pizzalemon_84_gemischter_salat.jpg") },
    { name: "Griechischer Salat", description: "Sauce nach Wahl: Italienisch oder Französisch", price: 14.00, image: IMG("pizzalemon_85_griechischer_salat.jpg") },
    { name: "Lemon Salat", description: "Tomaten, Gurken und grilliertes Pouletfleisch", price: 15.00, image: IMG("pizzalemon_86_lemon_salat.jpg") },
    { name: "Thon Salat", description: "Thunfisch, gemischter Salat", price: 13.00, image: IMG("pizzalemon_87_thon_salat.jpg") },
    { name: "Tomaten Salat", description: "Tomaten, Zwiebeln", price: 12.00, image: IMG("pizzalemon_88_tomaten_salat.jpg") },
    { name: "Tomaten Mozzarella Salat", description: "Tomaten, Mozzarella", price: 14.00, image: IMG("pizzalemon_89_tomaten_mozzarella.jpg") },
    { name: "Knoblibrot", description: "Knoblauchbrot", price: 7.00, image: IMG("pizzalemon_90_knoblibrot.jpg") },
    { name: "Crevettencocktail Salat", description: "Crevettencocktail Salat", price: 15.00, image: IMG("pizzalemon_91_crevettencocktail.jpg") },
];

// ─── DESSERT ──────────────────────────────────────────────────────────────────
const DESSERTS: MenuItem[] = [
    { name: "Tiramisù", description: "Klassisches italienisches Tiramisù", price: 7.00, image: IMG("pizzalemon_92_tiramisu.jpg") },
    { name: "Baklava", description: "Portion 4 Stk.", price: 8.00, image: IMG("pizzalemon_93_baklava.jpg") },
    { name: "Marlenke mit Honig oder Schokolade", description: "Marlenke mit Honig oder Schokolade", price: 7.00, image: IMG("pizzalemon_94_marlenke.jpg") },
    { name: "Choco-Mousse", description: "Cremige Schokoladenmousse", price: 7.00, image: IMG("pizzalemon_95_choco_mousse.jpg") },
];

// ─── GETRÄNKE ─────────────────────────────────────────────────────────────────
const GETRAENKE: MenuItem[] = [
    { name: "Coca-Cola", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_97_coca_cola.jpg") },
    { name: "Coca-Cola Light", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_97_coca_cola.jpg") },
    { name: "Coca-Cola Zero", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_97_coca_cola.jpg") },
    { name: "Fanta", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_98_fanta.jpg") },
    { name: "Eistee", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_99_eistee.jpg") },
    { name: "Mineralwasser", description: "50cl oder 1.5 L", price: 4.00, image: IMG("pizzalemon_100_mineralwasser.jpg") },
    { name: "Uludag Gazoz", description: "50cl", price: 4.00, image: IMG("pizzalemon_101_uludag_gazoz.jpg") },
    { name: "Rivella", description: "50cl", price: 4.00, image: IMG("pizzalemon_102_rivella.jpg") },
    { name: "Ayran 0.25 L", description: "0.25 L", price: 4.00, image: IMG("pizzalemon_103_ayran.jpg") },
    { name: "Red Bull 0.25 L", description: "0.25 L", price: 5.00, image: IMG("pizzalemon_104_red_bull.jpg") },
];

// ─── BIER ─────────────────────────────────────────────────────────────────────
const BIER: MenuItem[] = [
    { name: "Feldschlösschen", description: "Feldschlösschen Bier, 0.5l", price: 5.00, image: IMG("pizzalemon_106_feldschloesschen.jpg") },
];

// ─── ALKOHOLISCHE GETRÄNKE ────────────────────────────────────────────────────
const ALKOHOL: MenuItem[] = [
    { name: "Rotwein / Merlot", description: "50cl", price: 15.00, image: IMG("pizzalemon_107_rotwein_merlot.jpg") },
    { name: "Weisswein", description: "50cl", price: 17.00, image: IMG("pizzalemon_108_weisswein.jpg") },
    { name: "Whisky", description: "Whisky 40%, 70cl Flasche", price: 50.00, image: IMG("pizzalemon_109_whisky.jpg") },
    { name: "Vodka", description: "Vodka 40%, 70cl Flasche", price: 50.00, image: IMG("pizzalemon_110_vodka.jpg") },
    { name: "Champagner", description: "70cl", price: 35.00, image: IMG("pizzalemon_111_champagner.jpg") },
    { name: "Smirnoff", description: "275ml", price: 6.00, image: IMG("pizzalemon_112_smirnoff_ice.jpg") },
];

// ─── EXTRA ────────────────────────────────────────────────────────────────────
function emojiImg(emoji: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="85" font-size="80" text-anchor="middle" x="50">${emoji}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const EXTRAS: MenuItem[] = [
    // ── Existing extras ──────────────────────────────────────────────────────
    { name: "Brot", description: "Frisches Brot", price: 2.00, image: IMG("pizzalemon_extra_brot.jpg") },
    { name: "Knoblibrot", description: "Knuspriges Brot mit Knoblauchbutter", price: 7.00, image: IMG("pizzalemon_90_knoblibrot.jpg") },
    { name: "Pommes Extra", description: "Extra Portion Pommes frites", price: 11.00, image: IMG("pizzalemon_58_pommes.jpg") },

    // ── Pizza toppings (+CHF 2.00 each) ──────────────────────────────────────
    { name: "Tomato Sauce",    description: "Tomatensauce",          price: 2.00, image: emojiImg("🍅") },
    { name: "Sliced Tomatoes", description: "Tomatenscheiben",       price: 2.00, image: emojiImg("🍅") },
    { name: "Garlic",          description: "Knoblauch",             price: 2.00, image: emojiImg("🧄") },
    { name: "Onions",          description: "Zwiebeln",              price: 2.00, image: emojiImg("🧅") },
    { name: "Capers",          description: "Kapern",                price: 2.00, image: emojiImg("🫙") },
    { name: "Olivas",          description: "Oliven",                price: 2.00, image: emojiImg("🫒") },
    { name: "Oregano",         description: "Oregano",               price: 2.00, image: emojiImg("🌿") },
    { name: "Vegetables",      description: "Gemüse",                price: 2.00, image: emojiImg("🥗") },
    { name: "Spinach",         description: "Spinat",                price: 2.00, image: emojiImg("🥬") },
    { name: "Bell Peppers",    description: "Paprika",               price: 2.00, image: emojiImg("🫑") },
    { name: "Corn",            description: "Mais",                  price: 2.00, image: emojiImg("🌽") },
    { name: "Broccoli",        description: "Brokkoli",              price: 2.00, image: emojiImg("🥦") },
    { name: "Artichokes",      description: "Artischocken",          price: 2.00, image: emojiImg("🌱") },
    { name: "Egg",             description: "Ei",                   price: 2.00, image: emojiImg("🥚") },
    { name: "Pineapple",       description: "Ananas",                price: 2.00, image: emojiImg("🍍") },
    { name: "Arugula",         description: "Rucola",                price: 2.00, image: emojiImg("🌿") },
    { name: "Mushrooms",       description: "Pilze",                 price: 2.00, image: emojiImg("🍄") },
    { name: "Ham",             description: "Schinken",              price: 2.00, image: emojiImg("🍖") },
    { name: "Spicy Salami",    description: "Scharfe Salami",        price: 2.00, image: emojiImg("🌶️") },
    { name: "Salami",          description: "Salami",                price: 2.00, image: emojiImg("🥩") },
    { name: "Basami",          description: "Basilikum",             price: 2.00, image: emojiImg("🌿") },
    { name: "Prosciutto",      description: "Rohschinken",           price: 2.00, image: emojiImg("🥩") },
    { name: "Lardons",         description: "Speckwürfel",           price: 2.00, image: emojiImg("🥓") },
    { name: "Chicken",         description: "Hühnerfleisch",         price: 2.00, image: emojiImg("🍗") },
    { name: "Kebab",           description: "Kebabfleisch",          price: 2.00, image: emojiImg("🥙") },
    { name: "Minced Meat",     description: "Hackfleisch",           price: 2.00, image: emojiImg("🥩") },
    { name: "Anchovies",       description: "Sardellen",             price: 2.00, image: emojiImg("🐟") },
    { name: "Sardinen",        description: "Sardinen",              price: 2.00, image: emojiImg("🐟") },
    { name: "Tuna",            description: "Thunfisch",             price: 2.00, image: emojiImg("🐟") },
    { name: "Spicy Sauce",     description: "Scharfe Sauce",         price: 2.00, image: emojiImg("🌶️") },
    { name: "Mozzarella",      description: "Mozzarella",            price: 2.00, image: emojiImg("🧀") },
    { name: "Gorgonzola",      description: "Gorgonzola",            price: 2.00, image: emojiImg("🧀") },
    { name: "Parmesan",        description: "Parmesan",              price: 2.00, image: emojiImg("🧀") },
    { name: "Mascarpone",      description: "Mascarpone",            price: 2.00, image: emojiImg("🧀") },
    { name: "Käserand (33cm)", description: "Käserand 33cm",         price: 3.00, image: emojiImg("🧀") },
    { name: "Käserand (45cm)", description: "Käserand 45cm",         price: 6.00, image: emojiImg("🧀") },

    // ── Sauces (FREE) ─────────────────────────────────────────────────────────
    { name: "Mayonnaise",      description: "Mayonnaise",            price: 0.00, image: emojiImg("🥫") },
    { name: "Ketchup",         description: "Ketchup",               price: 0.00, image: emojiImg("🍅") },
    { name: "Cocktail Sauce",  description: "Cocktailsauce",         price: 0.00, image: emojiImg("🥫") },
    { name: "Yogurt Sauce",    description: "Joghurtsauce",          price: 0.00, image: emojiImg("🥛") },
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

    const isAlreadySeeded = !!existingKey;
    if (isAlreadySeeded) {
        console.log("[PIZZA LEMON] License key already present – running full catalog update...");
    }

    // ── Phase 2: Find or create the Pizza Lemon tenant ────────────────────────
    let tenant: typeof tenants.$inferSelect | undefined;

    const pizzaLemonTenants = await db.select().from(tenants)
        .where(eq(tenants.id, 24));

    if (pizzaLemonTenants.length > 0) {
        tenant = pizzaLemonTenants[0];
        console.log(`[PIZZA LEMON] Found existing store (ID ${tenant.id}). Upgrading credentials and data...`);

        const hash = await bcrypt.hash(STORE_PASSWORD, 10);
        await db.update(tenants).set({
            businessName: BUSINESS_NAME,
            ownerEmail: STORE_EMAIL,
            passwordHash: hash,
            status: "active",
            storeType: "restaurant",
            maxBranches: 3,
            maxEmployees: 20,
        }).where(eq(tenants.id, 24));
    } else {
        console.log("[PIZZA LEMON] No Tenant ID 24 found. Creating new store with ID 24...");
        const hash = await bcrypt.hash(STORE_PASSWORD, 10);
        const [newTenant] = await db.insert(tenants).values({
            id: 24,
            businessName: BUSINESS_NAME,
            ownerName: "Pizza Lemon Owner",
            ownerEmail: STORE_EMAIL,
            ownerPhone: "+41443103814",
            passwordHash: hash,
            status: "active",
            maxBranches: 3,
            maxEmployees: 20,
            storeType: "restaurant",
        }).$returningId();
        tenant = { id: newTenant.id } as typeof tenants.$inferSelect;
    }

    // ── Phase 3: Ensure an active subscription ────────────────────────────────
    const subs = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenant.id));
    const activeSub = subs.find(s => s.status === "active");
    let subId: number;

    if (activeSub) {
        subId = activeSub.id;
    } else {
        const endDate = addYears(new Date(), 2);
        const [newSub] = await db.insert(tenantSubscriptions).values({
            tenantId: tenant.id,
            planType: "yearly",
            planName: "Professional",
            price: "79.00",
            status: "active",
            startDate: new Date(),
            endDate,
            autoRenew: true,
        }).$returningId();
        subId = newSub.id;
    }

    // ── Phase 4: Add the fixed license key (only if new) ─────────────────────
    if (!isAlreadySeeded) {
        const endDate = addYears(new Date(), 2);
        await db.insert(licenseKeys).values({
            licenseKey: LICENSE_KEY,
            tenantId: tenant.id,
            subscriptionId: subId,
            status: "active",
            activatedAt: new Date(),
            expiresAt: endDate,
            maxActivations: 5,
            currentActivations: 0,
        });
        console.log(`[PIZZA LEMON] License key added: ${LICENSE_KEY}`);
    }

    // ── Phase 5: Ensure branch exists ─────────────────────────────────────────
    let tenantBranches = await db.select().from(branches)
        .where(eq(branches.tenantId, tenant.id));

    let branchId: number;
    if (tenantBranches.length > 0) {
        branchId = tenantBranches[0].id;
    } else {
        const [branch] = await db.insert(branches).values({
            tenantId: tenant.id,
            name: "Pizza Lemon – Hauptfiliale",
            address: "Birchstrasse 120, CH-8050 Zürich-Oerlikon",
            phone: "+41443103814",
            email: STORE_EMAIL,
            isActive: true,
            isMain: true,
            currency: "CHF",
            taxRate: "7.70",
        }).$returningId();
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

    const hasAdmin = existingEmps.some(e => e.role === "admin" && e.pin === "1234");
    const hasCashier = existingEmps.some(e => e.role === "cashier" && e.pin === "5678");

    if (!hasAdmin) {
        await db.insert(employees).values({ name: "Admin", email: "admin.emp@pizzalemon.ch", pin: "1234", role: "admin", branchId, isActive: true });
    }
    if (!hasCashier) {
        await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
    }

    // ── Phase 7: Full product catalog reset ───────────────────────────────────
    const shouldForceCatalogReset = ["1", "true", "yes"].includes(
        (process.env.PIZZA_LEMON_FORCE_RESET || "").toLowerCase(),
    );
    const existingProds = await db.select().from(products)
        .where(eq(products.tenantId, tenant.id));

    if (existingProds.length > 0 && !shouldForceCatalogReset) {
        console.log(`[PIZZA LEMON] ${existingProds.length} products already exist — skipping catalog reset to protect existing data.`);
        return;
    }

    if (shouldForceCatalogReset) {
        const existingCats = await db.select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(eq(categories.tenantId, tenant.id));

        if (existingProds.length > 0) {
            await db.delete(products).where(eq(products.tenantId, tenant.id));
        }
        if (existingCats.length > 0) {
            await db.delete(categories).where(eq(categories.tenantId, tenant.id));
        }

        console.log(
            `[PIZZA LEMON] Force reset enabled — cleared ${existingProds.length} products and ${existingCats.length} categories.`,
        );
    } else {
        console.log("[PIZZA LEMON] No products found — creating fresh product catalog...");
    }

    // ── Phase 8: Ensure all categories exist ─────────────────────────────────
    const allCats = await db.select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.tenantId, tenant.id));

    const catMap: Record<string, number> = {};
    for (const c of allCats) catMap[c.name] = c.id;

    // Handle legacy rename: Softgetränke → Getränke
    if (catMap["Softgetränke"] && !catMap["Getränke"]) {
        await db.update(categories).set({ name: "Getränke" }).where(eq(categories.id, catMap["Softgetränke"]));
        catMap["Getränke"] = catMap["Softgetränke"];
        delete catMap["Softgetränke"];
        console.log("[PIZZA LEMON] Renamed category Softgetränke → Getränke");
    }

    // Handle legacy rename: Tabakwaren → Extra
    if (catMap["Tabakwaren"] && !catMap["Extra"]) {
        await db.update(categories).set({ name: "Extra", icon: "add-circle" }).where(eq(categories.id, catMap["Tabakwaren"]));
        catMap["Extra"] = catMap["Tabakwaren"];
        delete catMap["Tabakwaren"];
        console.log("[PIZZA LEMON] Renamed category Tabakwaren → Extra");
    }

    for (const cat of PIZZA_LEMON_CATEGORIES) {
        if (!catMap[cat.name]) {
            const [ins] = await db.insert(categories).values({
                tenantId: tenant.id,
                name: cat.name, color: cat.color, icon: cat.icon, isActive: true,
                sortOrder: cat.sortOrder,
            }).$returningId();
            catMap[cat.name] = ins.id;
            console.log(`[PIZZA LEMON] Created category: ${cat.name}`);
        } else {
            await db.update(categories).set({
                sortOrder: cat.sortOrder,
                color: cat.color,
                icon: cat.icon,
            }).where(eq(categories.id, catMap[cat.name]));
        }
    }

    // ── Phase 9: Insert complete product catalog ──────────────────────────────
    let idx = 0;
    async function insertItem(catKey: string, item: MenuItem, mods: any[] = []) {
        const sku = `PL${tenant!.id}-${slugify(item.name).toUpperCase().slice(0, 10)}-${++idx}`;
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
            ...(item.image ? { image: item.image } : {}),
        }).$returningId();
        await db.insert(inventory).values({
            productId: prod.id,
            branchId,
            quantity: 999,
            lowStockThreshold: 0,
            reorderPoint: 0,
        });
    }

    // Insert pizzas with per-pizza size modifiers
    for (const p of PIZZAS) {
        const price45 = p.price45 ?? (p.price + 14);
        await insertItem("Pizza", p, pizzaModifier(p.price, price45));
    }

    for (const p of CALZONES) await insertItem("Calzone", p);
    for (const p of PIDE) await insertItem("Pide", p);
    for (const p of LAHMACUN) await insertItem("Lahmacun", p);

    // Tellergerichte: items with Pommes/Salat choice get sideModifier
    const TELLER_WITH_SIDE = new Set([
        "Chicken Nuggets 8 Stk.",
        "Pouletschnitzel",
        "Pouletflügeli 12 Stk.",
        "Poulet Kebab Teller",
        "Lamm Kebab Teller / Sac Kavurma",
        "Köfte Teller",
        "Cevapcici",
        "Falafel Teller",
    ]);
    for (const p of TELLERGERICHTE) {
        await insertItem("Tellergerichte", p, TELLER_WITH_SIDE.has(p.name) ? sideModifier() : []);
    }

    // Fingerfood: Döner/Kebab items get sauce modifier
    const FINGER_WITH_SAUCE = new Set([
        "Döner Kebab Im Taschenbrot",
        "Dürüm Kebab Im Fladenbrot",
        "Falafel Im Taschenbrot",
        "Falafel Dürüm Im Fladenbrot",
        "Poulet Pepito",
        "Lamm Pepito",
        "Poulet Kebab Mit Gemüse Im Taschenbrot",
        "Poulet Kebab Mit Gemüse Im Fladenbrot",
        "Lamm Kebab Mit Gemüse Im Taschenbrot",
        "Lamm Kebab Mit Gemüse Im Fladenbrot",
        "Köfte Im Taschenbrot",
        "Cevapcici Im Taschenbrot",
        "Kebab Im Fladenbrot mit Raclette",
        "Kebab Im Taschenbrot mit Raclette",
        "Kebab Im Fladenbrot mit Speck",
        "Kebab Im Taschenbrot mit Speck",
    ]);
    for (const p of FINGERFOOD) {
        await insertItem("Fingerfood", p, FINGER_WITH_SAUCE.has(p.name) ? sauceModifier() : []);
    }

    // Salat: all salad items except bread get dressing modifier
    const SALAT_WITH_DRESSING = new Set([
        "Grüner Salat",
        "Gemischter Salat",
        "Griechischer Salat",
        "Lemon Salat",
        "Thon Salat",
        "Tomaten Salat",
        "Tomaten Mozzarella Salat",
        "Crevettencocktail Salat",
    ]);
    for (const p of SALATE) {
        await insertItem("Salat", p, SALAT_WITH_DRESSING.has(p.name) ? dressingModifier() : []);
    }

    for (const p of DESSERTS) await insertItem("Dessert", p);

    // Drinks with visible 50cl / 1.5 L sizes from the printed menu
    const DRINKS_WITH_SIZE = new Set([
        "Coca-Cola",
        "Coca-Cola Light",
        "Coca-Cola Zero",
        "Fanta",
        "Eistee",
        "Mineralwasser",
    ]);
    for (const p of GETRAENKE) {
        const sizeMod = DRINKS_WITH_SIZE.has(p.name) ? drinkSizeModifier(4.00) : [];
        await insertItem("Getränke", p, sizeMod);
    }

    for (const p of BIER) await insertItem("Bier", p);
    for (const p of ALKOHOL) await insertItem("Alkoholische Getränke", p);
    for (const p of EXTRAS) await insertItem("Extra", p);

    const total = PIZZAS.length + CALZONES.length + PIDE.length + LAHMACUN.length +
        TELLERGERICHTE.length + FINGERFOOD.length + SALATE.length + DESSERTS.length +
        GETRAENKE.length + BIER.length + ALKOHOL.length + EXTRAS.length;
    console.log(
        `[PIZZA LEMON] ✓ ${total} products inserted. ` +
        `Pizza ${PIZZAS.length}, Calzone ${CALZONES.length}, Pide ${PIDE.length}, ` +
        `Lahmacun ${LAHMACUN.length}, Tellergerichte ${TELLERGERICHTE.length}, Fingerfood ${FINGERFOOD.length}, ` +
        `Salat ${SALATE.length}, Dessert ${DESSERTS.length}, Getränke ${GETRAENKE.length}, ` +
        `Bier ${BIER.length}, Alkohol ${ALKOHOL.length}, Extra ${EXTRAS.length}.`
    );

    // ── Landing page config ────────────────────────────────────────────────────
    const [existingConfig] = await db.select().from(landingPageConfig)
        .where(eq(landingPageConfig.tenantId, tenant.id));

    const heroImage = IMG("pizzalemon_hero.png");

    if (!existingConfig) {
        await db.insert(landingPageConfig).values({
            tenantId: tenant.id,
            slug: "pizza-lemon",
            heroTitle: "Pizza Lemon",
            heroSubtitle: "Frische Pizza, Döner & mehr – direkt zu Ihnen geliefert",
            heroImage,
            aboutText: "Pizza Lemon – Ihr Lieblingsrestaurant für authentische italienische Pizza und türkische Spezialitäten in Zürich-Oerlikon. Wir verwenden täglich frische Zutaten. 10% Rabatt bei Mobile App Bestellungen!",
            primaryColor: "#E53E3E",
            accentColor: "#D69E2E",
            enableOnlineOrdering: true,
            enableDelivery: true,
            enablePickup: true,
            acceptCard: true,
            acceptMobile: true,
            acceptCash: true,
            minOrderAmount: "20.00",
            estimatedDeliveryTime: 35,
            footerText: "© 2025 Pizza Lemon · Alle Rechte vorbehalten",
            socialWhatsapp: "+41443103814",
            socialFacebook: "https://facebook.com/pizzalemon",
            socialInstagram: "https://instagram.com/pizzalemon",
            phone: "+41 44 310 38 14",
            email: "info@pizzalemon.ch",
            address: "Birchstrasse 120, CH-8050 Zürich-Oerlikon",
            openingHours: "Mo–So: 10:00–23:00 | Lieferzeiten: 11:00–23:00",
            deliveryRadius: "Zone 1 (ab 20.-): Affoltern, Seebach, Oerlikon | Zone 2 (ab 30.-): Kloten, Wallisellen | Zone 3 (ab 40.-): Regensdorf",
            isPublished: true,
        });
        console.log("[PIZZA LEMON] Landing page config created. URL: /store/pizza-lemon");
    } else {
        await db.update(landingPageConfig).set({
            heroImage,
            primaryColor: "#E53E3E",
            accentColor: "#D69E2E",
            minOrderAmount: "20.00",
            openingHours: "Mo–So: 10:00–23:00 | Lieferzeiten: 11:00–23:00",
            address: existingConfig.address || "Birchstrasse 120, CH-8050 Zürich-Oerlikon",
            deliveryRadius: "Zone 1 (ab 20.-): Affoltern, Seebach, Oerlikon | Zone 2 (ab 30.-): Kloten, Wallisellen | Zone 3 (ab 40.-): Regensdorf",
        }).where(eq(landingPageConfig.tenantId, tenant.id));
        console.log("[PIZZA LEMON] Landing page config updated.");
    }

    // ── Notification ──────────────────────────────────────────────────────────
    await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type: "info",
        title: "Pizza Lemon Katalog aktualisiert (v7)!",
        message: `Menüpreise, Größen und Getränkemengen mit dem aktuellen Foto-Menü abgeglichen. Email: ${STORE_EMAIL} | PIN: 1234/5678 | Lizenz: ${LICENSE_KEY}`,
        priority: "high",
    });

    // ── Sample Vehicles ──────────────────────────────────────────────────────
    const existingVehicles = await db.select().from(vehicles).where(eq(vehicles.tenantId, tenant.id));
    if (existingVehicles.length === 0) {
        await db.insert(vehicles).values([
            { tenantId: tenant.id, branchId: null, licensePlate: "ZH 123456", make: "Mercedes", model: "Vito", color: "Weiß", driverName: "Ahmed Ali", driverPhone: "+41791234567", isActive: true },
            { tenantId: tenant.id, branchId: null, licensePlate: "ZH 654321", make: "Volkswagen", model: "Transporter", color: "Blau", driverName: "Mohamed Hassan", driverPhone: "+41799876543", isActive: true },
            { tenantId: tenant.id, branchId: null, licensePlate: "ZH 111222", make: "Ford", model: "Transit", color: "Silber", driverName: "Omar Ibrahim", driverPhone: "+41761122334", isActive: true },
        ]);
        console.log("[PIZZA LEMON] ✓ 3 sample vehicles inserted.");
    }

    console.log(`[PIZZA LEMON] ✓ Setup complete!`);
    console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
    console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
    console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
    console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
    console.log(
        `[PIZZA LEMON]    Menu: ${PIZZAS.length} Pizza, ${CALZONES.length} Calzone, ${PIDE.length} Pide, ` +
        `${LAHMACUN.length} Lahmacun, ${TELLERGERICHTE.length} Tellergerichte, ${FINGERFOOD.length} Fingerfood, ` +
        `${SALATE.length} Salat, ${DESSERTS.length} Dessert, ${GETRAENKE.length} Getränke, ` +
        `${BIER.length} Bier, ${ALKOHOL.length} Alkohol, ${EXTRAS.length} Extra = ${total} total`
    );
}
