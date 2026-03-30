import { db } from "./db";
import { eq, sql, inArray } from "drizzle-orm";
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
                { label: "33cm Normal", price: "0.00" },
                { label: `45cm Gross (+${surcharge})`, price: surcharge },
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
            required: false,
            options: [
                { label: "0.5l Klein", price: "0.00" },
                { label: `1.5l Gross (+${largeExtra.toFixed(2)})`, price: largeExtra.toFixed(2) },
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
    { name: "Wunschpizza", description: "Ihre Wunschpizza – wählen Sie Ihre Zutaten", price: 14.00, price45: 27.00, image: IMG("pizzalemon_wunschpizza.jpg") },
    { name: "Margherita", description: "Tomaten, Mozzarella, Oregano", price: 14.00, price45: 25.00, image: IMG("pizzalemon_01_margherita.jpg") },
    { name: "Profumata", description: "Tomaten, Mozzarella, Knoblauch, Petersilie, Oregano", price: 14.00, price45: 27.00, image: IMG("pizzalemon_02_profumata.jpg") },
    { name: "Funghi", description: "Tomaten, Mozzarella, Pilze", price: 15.00, price45: 28.00, image: IMG("pizzalemon_03_funghi.jpg") },
    { name: "Spinat", description: "Tomaten, Mozzarella, Spinat", price: 15.00, price45: 28.00, image: IMG("pizzalemon_04_spinat.jpg") },
    { name: "Gorgonzola", description: "Tomaten, Mozzarella, Gorgonzola", price: 16.00, price45: 29.00, image: IMG("pizzalemon_05_gorgonzola.jpg") },
    { name: "Prosciutto", description: "Tomaten, Mozzarella, Schinken", price: 16.00, price45: 30.00, image: IMG("pizzalemon_06_prosciutto.jpg") },
    { name: "Salami", description: "Tomaten, Mozzarella, Salami", price: 16.00, price45: 30.00, image: IMG("pizzalemon_07_salami.jpg") },
    { name: "Diavola", description: "Tomaten, Mozzarella, scharfe Salami, Oliven, Peperoncini", price: 17.00, price45: 31.00, image: IMG("pizzalemon_08_diavola.jpg") },
    { name: "Arrabbiata", description: "Tomaten, Mozzarella, Speck, Peperoncini, Knoblauch, Zwiebeln", price: 17.00, price45: 31.00, image: IMG("pizzalemon_09_arrabbiata.jpg") },
    { name: "Siciliana", description: "Tomaten, Mozzarella, Schinken, Sardellen, Kapern", price: 17.00, price45: 31.00, image: IMG("pizzalemon_10_siciliana.jpg") },
    { name: "Prosciutto e Funghi", description: "Tomaten, Mozzarella, Schinken, Pilze", price: 17.00, price45: 31.00, image: IMG("pizzalemon_11_prosciutto_e_funghi.jpg") },
    { name: "Hawaii", description: "Tomaten, Mozzarella, Schinken, Ananas", price: 17.00, price45: 31.00, image: IMG("pizzalemon_12_hawaii.jpg") },
    { name: "Tonno", description: "Tomaten, Mozzarella, Thunfisch, Zwiebeln", price: 17.00, price45: 31.00, image: IMG("pizzalemon_13_tonno.jpg") },
    { name: "Piccante", description: "Tomaten, Mozzarella, Peperoni, Peperoncini, Zwiebeln, Knoblauch, Oregano", price: 18.00, price45: 32.00, image: IMG("pizzalemon_14_piccante.jpg") },
    { name: "Raclette", description: "Tomaten, Mozzarella, Rohschinken", price: 18.00, price45: 32.00, image: IMG("pizzalemon_15_raclette.jpg") },
    { name: "Fiorentina", description: "Tomaten, Mozzarella, Spinat, Gorgonzola, Knoblauch", price: 18.00, price45: 32.00, image: IMG("pizzalemon_16_fiorentina.jpg") },
    { name: "Kebab Pizza", description: "Tomaten, Mozzarella, Kebabfleisch", price: 19.00, price45: 33.00, image: IMG("pizzalemon_17_kebab_pizza.jpg") },
    { name: "Poulet", description: "Tomaten, Mozzarella, Poulet", price: 19.00, price45: 33.00, image: IMG("pizzalemon_18_poulet.jpg") },
    { name: "Carbonara", description: "Tomaten, Mozzarella, Speck, Ei, Rahm", price: 19.00, price45: 33.00, image: IMG("pizzalemon_19_carbonara.jpg") },
    { name: "Gamberetti", description: "Tomaten, Mozzarella, Crevetten, Knoblauch", price: 19.00, price45: 33.00, image: IMG("pizzalemon_20_gamberetti.jpg") },
    { name: "Quattro Formaggi", description: "Tomaten, Mozzarella, 4 verschiedene Käsesorten", price: 19.00, price45: 33.00, image: IMG("pizzalemon_21_quattro_formaggi.jpg") },
    { name: "Quattro Stagioni", description: "Tomaten, Mozzarella, Schinken, Pilze, Peperoni, Artischocken", price: 19.00, price45: 33.00, image: IMG("pizzalemon_22_quattro_stagioni.jpg") },
    { name: "Frutti di Mare", description: "Tomaten, Mozzarella, Meeresfrüchte", price: 19.00, price45: 33.00, image: IMG("pizzalemon_23_frutti_di_mare.jpg") },
    { name: "Verdura", description: "Tomaten, Mozzarella, verschiedenes Gemüse", price: 19.00, price45: 33.00, image: IMG("pizzalemon_24_verdura.jpg") },
    { name: "Napoli", description: "Tomaten, Mozzarella, Sardellen, Kapern, Oliven", price: 18.00, price45: 32.00, image: IMG("pizzalemon_25_napoli.jpg") },
    { name: "Pizzaiolo", description: "Tomaten, Mozzarella, Speck, Knoblauch, Pilze", price: 18.00, price45: 32.00, image: IMG("pizzalemon_26_pizzaiolo.jpg") },
    { name: "A'Casa", description: "Tomaten, Mozzarella, Gorgonzola, Peperoni, Pilze, Knoblauch, Zwiebeln", price: 19.00, price45: 34.00, image: IMG("pizzalemon_27_a_casa.jpg") },
    { name: "Porcini", description: "Tomaten, Mozzarella, Steinpilze, Zwiebeln, Oregano", price: 19.00, price45: 34.00, image: IMG("pizzalemon_28_porcini.jpg") },
    { name: "Spezial", description: "Tomaten, Mozzarella, Kalbfleisch, Knoblauch, Kräuterbutter, Zwiebeln, Oregano", price: 19.00, price45: 34.00, image: IMG("pizzalemon_29_spezial.jpg") },
    { name: "Padrone", description: "Tomaten, Mozzarella, Gorgonzola, Pilze", price: 20.00, price45: 33.00, image: IMG("pizzalemon_30_padrone.jpg") },
    { name: "Schloss Pizza", description: "Tomaten, Mozzarella, Kalbfleisch, Speck, scharfe Salami", price: 20.00, price45: 34.00, image: IMG("pizzalemon_31_schloss_pizza.jpg") },
    { name: "Italiano", description: "Tomaten, Mozzarella, Rohschinken, Mascarpone, Rucola", price: 20.00, price45: 34.00, image: IMG("pizzalemon_32_italiano.jpg") },
    { name: "Americano", description: "Tomaten, Mozzarella, Speck, Mais, Zwiebeln", price: 21.00, price45: 36.00, image: IMG("pizzalemon_33_americano.jpg") },
    { name: "Lemon Pizza", description: "Tomaten, Mozzarella, Lammfleisch, Knoblauch, Peperoncini, Scharf", price: 20.00, price45: 34.00, image: IMG("pizzalemon_34_lemon_pizza.jpg") },
];

// ─── CALZONE ──────────────────────────────────────────────────────────────────
const CALZONES: MenuItem[] = [
    { name: "Calzone", description: "Tomaten, Mozzarella, Schinken, Pilze, Ei", price: 20.00, image: IMG("pizzalemon_c1_calzone.jpg") },
    { name: "Calzone Kebab", description: "Tomaten, Mozzarella, Kebabfleisch", price: 20.00, image: IMG("pizzalemon_c2_calzone_kebab.jpg") },
    { name: "Calzone Verdura", description: "Tomaten, Mozzarella, Saisongemüse", price: 20.00, image: IMG("pizzalemon_c3_calzone_verdura.jpg") },
];

// ─── PIDE ─────────────────────────────────────────────────────────────────────
const PIDE: MenuItem[] = [
    { name: "Wunschpide", description: "Ihre Wunschpide – wählen Sie Ihre Zutaten", price: 15.00, image: IMG("pizzalemon_wunschpide.jpg") },
    { name: "Pide mit Käse", description: "Pide mit Schafskäse", price: 15.00, image: IMG("pizzalemon_36_pide_mit_kaese.jpg") },
    { name: "Pide mit Hackfleisch", description: "Pide mit Hackfleisch und Tomaten", price: 17.00, image: IMG("pizzalemon_37_pide_mit_hackfleisch.jpg") },
    { name: "Pide mit Käse und Hackfleisch", description: "Pide mit Schafskäse und Hackfleisch", price: 18.00, image: IMG("pizzalemon_38_pide_kaese_hackfleisch.jpg") },
    { name: "Pide mit Käse und Spinat", description: "Pide mit Schafskäse und Spinat", price: 18.00, image: IMG("pizzalemon_39_pide_kaese_spinat.jpg") },
    { name: "Pide mit Käse und Ei", description: "Pide mit Schafskäse und Ei", price: 18.00, image: IMG("pizzalemon_40_pide_kaese_ei.jpg") },
    { name: "Lemon Pide", description: "Hausgemachte Pide mit gewürztem Hackfleisch und Käse", price: 18.00, image: IMG("pizzalemon_41_lemon_pide.jpg") },
    { name: "Lemon Pide Spezial", description: "Fein gehacktes Fleisch mit dem Messer gehackt", price: 20.00, image: IMG("pizzalemon_42_lemon_pide_spezial.jpg") },
    { name: "Pide mit Sucuk", description: "Pide mit türkischer Knoblauchwurst", price: 18.00, image: IMG("pizzalemon_43_pide_mit_sucuk.jpg") },
    { name: "Pide mit Kebabfleisch", description: "Pide mit Kebabfleisch", price: 20.00, image: IMG("pizzalemon_44_pide_mit_kebabfleisch.jpg") },
];

// ─── LAHMACUN ─────────────────────────────────────────────────────────────────
const LAHMACUN: MenuItem[] = [
    { name: "Lahmacun mit Salat", description: "Türkische Minipizza mit Hackfleisch und frischem Salat", price: 15.00, image: IMG("pizzalemon_45_lahmacun_mit_salat.jpg") },
    { name: "Lahmacun mit Salat und Kebab", description: "Lahmacun mit frischem Salat und Kebabfleisch", price: 18.00, image: IMG("pizzalemon_46_lahmacun_salat_kebab.jpg") },
];

// ─── TELLERGERICHTE ───────────────────────────────────────────────────────────
const TELLERGERICHTE: MenuItem[] = [
    { name: "Döner Teller+Pommes", description: "Döner Kebab auf dem Teller mit Pommes frites", price: 18.00, image: IMG("pizzalemon_47_doener_teller_pommes.jpg") },
    { name: "Döner Teller+Salat", description: "Döner Kebab auf dem Teller mit frischem Salat", price: 18.00, image: IMG("pizzalemon_48_doener_teller_salat.jpg") },
    { name: "Döner Teller Komplett", description: "Döner Kebab auf dem Teller mit Salat und Pommes", price: 20.00, image: IMG("pizzalemon_49_doener_teller_komplett.jpg") },
    { name: "Chicken Nuggets 8Stk", description: "8 knusprige Chicken Nuggets mit Pommes oder Salat", price: 17.00, image: IMG("pizzalemon_50_chicken_nuggets_8stk.jpg") },
    { name: "Pouletschnitzel", description: "Zartes Pouletschnitzel mit Pommes oder Salat und Brot", price: 17.00, image: IMG("pizzalemon_51_pouletschnitzel.jpg") },
    { name: "Pouletflügeli 12Stk", description: "12 knusprige Pouletflügeli mit Pommes oder Salat", price: 18.00, image: IMG("pizzalemon_52_pouletfluegeli_12stk.jpg") },
    { name: "Poulet Kebab Teller", description: "Poulet Kebab auf dem Teller mit Pommes oder Salat", price: 18.00, image: IMG("pizzalemon_53_poulet_kebab_teller.jpg") },
    { name: "Lamm Kebab Teller", description: "Lamm Kebab (Sac Kavurma) mit Pommes oder Salat", price: 22.00, image: IMG("pizzalemon_54_lamm_kebab_teller.jpg") },
    { name: "Köfte Teller", description: "Türkische Hackfleischbällchen mit Pommes oder Salat", price: 18.00, image: IMG("pizzalemon_55_koefte_teller.jpg") },
    { name: "Cevapcici Teller", description: "Gegrillte Cevapcici mit Pommes oder Salat und Brot", price: 18.00, image: IMG("pizzalemon_56_cevapcici_teller.jpg") },
    { name: "Falafel Teller", description: "Knusprige Falafel mit Pommes oder Salat und Brot", price: 16.00, image: IMG("pizzalemon_57_falafel_teller.jpg") },
    { name: "Pommes", description: "Pommes frites, knusprig frittiert", price: 10.00, image: IMG("pizzalemon_58_pommes.jpg") },
    { name: "Original Schweins Cordon Bleu", description: "Original Schweins Cordon Bleu mit Gemüse, Salat, Pommes", price: 23.00, image: IMG("pizzalemon_59_cordon_bleu.jpg") },
];

// ─── FINGERFOOD ───────────────────────────────────────────────────────────────
const FINGERFOOD: MenuItem[] = [
    { name: "Döner Kebab Tasche", description: "Döner Kebab im Taschenbrot", price: 13.00, image: IMG("pizzalemon_60_doener_kebab_tasche.jpg") },
    { name: "Dürüm Kebab", description: "Döner Kebab im Fladenbrot", price: 14.00, image: IMG("pizzalemon_61_dueruem_kebab.jpg") },
    { name: "Döner Box", description: "Döner Kebab in der Box mit Salat und Pommes", price: 13.00, image: IMG("pizzalemon_62_doener_box.jpg") },
    { name: "Falafel", description: "Knusprige Falafel im Taschenbrot", price: 12.00, image: IMG("pizzalemon_63_falafel_taschenbrot.jpg") },
    { name: "Falafel Dürüm", description: "Falafel im Fladenbrot", price: 12.00, image: IMG("pizzalemon_64_falafel_dueruem.jpg") },
    { name: "Poulet Pepito", description: "Gegrilltes Poulet im Fladenbrot", price: 12.00, image: IMG("pizzalemon_65_poulet_pepito.jpg") },
    { name: "Lamm Pepito", description: "Gegrilltes Lammfleisch im Fladenbrot", price: 14.00, image: IMG("pizzalemon_66_lamm_pepito.jpg") },
    { name: "Hamburger", description: "Klassischer Hamburger mit Salat und Sauce", price: 11.00, image: IMG("pizzalemon_67_hamburger.jpg") },
    { name: "Lemon Burger", description: "Lemon Burger mit Rindfleisch, Raclettekäse und Ei", price: 17.00, image: IMG("pizzalemon_68_lemon_burger.jpg") },
    { name: "Cheeseburger", description: "Cheeseburger mit Rindfleisch und Käse", price: 13.00, image: IMG("pizzalemon_69_cheeseburger.jpg") },
    { name: "Hamburger Rindfleisch", description: "Hamburger mit 100% Rindfleisch", price: 12.00, image: IMG("pizzalemon_70_hamburger_rindfleisch.jpg") },
    { name: "Poulet Kebab Tasche", description: "Poulet Kebab mit Gemüse im Taschenbrot", price: 13.00, image: IMG("pizzalemon_71_poulet_kebab_tasche.jpg") },
    { name: "Poulet Kebab Fladen", description: "Poulet Kebab mit Gemüse im Fladenbrot", price: 13.00, image: IMG("pizzalemon_72_poulet_kebab_fladen.jpg") },
    { name: "Lamm Kebab Tasche", description: "Lamm Kebab mit Gemüse im Taschenbrot", price: 14.00, image: IMG("pizzalemon_73_lamm_kebab_tasche.jpg") },
    { name: "Lamm Kebab Fladen", description: "Lamm Kebab mit Gemüse im Fladenbrot", price: 14.00, image: IMG("pizzalemon_74_lamm_kebab_fladen.jpg") },
    { name: "Köfte Taschenbrot", description: "Türkische Hackfleischbällchen im Taschenbrot", price: 13.00, image: IMG("pizzalemon_75_koefte_taschenbrot.jpg") },
    { name: "Cevapcici Taschenbrot", description: "Gegrillte Cevapcici im Taschenbrot", price: 13.00, image: IMG("pizzalemon_76_cevapcici_taschenbrot.jpg") },
    { name: "Falafel Box", description: "Knusprige Falafel in der Box mit Salat und Pommes", price: 12.00, image: IMG("pizzalemon_77_falafel_box.jpg") },
    { name: "Chicken Nuggets Box", description: "Chicken Nuggets in der Box mit Dip", price: 12.00, image: IMG("pizzalemon_78_chicken_nuggets_box.jpg") },
    { name: "Kebab Fladen+Raclette", description: "Kebab im Fladenbrot mit Raclettekäse überbacken", price: 15.00, image: IMG("pizzalemon_79_kebab_fladen_raclette.jpg") },
    { name: "Kebab Tasche+Raclette", description: "Kebab im Taschenbrot mit Raclettekäse überbacken", price: 15.00, image: IMG("pizzalemon_80_kebab_tasche_raclette.jpg") },
    { name: "Kebab Fladen+Speck", description: "Kebab im Fladenbrot mit Speck", price: 15.00, image: IMG("pizzalemon_81_kebab_fladen_speck.jpg") },
    { name: "Kebab Tasche+Speck", description: "Kebab im Taschenbrot mit Speck", price: 15.00, image: IMG("pizzalemon_82_kebab_tasche_speck.jpg") },
    { name: "Extra Kebap", description: "Extra Portion Kebabfleisch", price: 5.00, image: IMG("pizzalemon_ex_kebap.jpg") },
];

// ─── SALAT ────────────────────────────────────────────────────────────────────
const SALATE: MenuItem[] = [
    { name: "Grüner Salat", description: "Frischer Blattsalat, Sauce: Italienisch oder Französisch", price: 8.00, image: IMG("pizzalemon_83_gruener_salat.jpg") },
    { name: "Gemischter Salat", description: "Frischer gemischter Salat, Sauce: Italienisch oder Französisch", price: 9.00, image: IMG("pizzalemon_84_gemischter_salat.jpg") },
    { name: "Griechischer Salat", description: "Tomaten, Gurken, Oliven, Feta", price: 12.00, image: IMG("pizzalemon_85_griechischer_salat.jpg") },
    { name: "Lemon Salat", description: "Tomaten, Gurken, gegrilliertes Pouletfleisch", price: 13.00, image: IMG("pizzalemon_86_lemon_salat.jpg") },
    { name: "Thon Salat", description: "Thunfisch, gemischter Salat", price: 10.00, image: IMG("pizzalemon_87_thon_salat.jpg") },
    { name: "Tomaten Salat", description: "Tomaten, Zwiebeln", price: 9.00, image: IMG("pizzalemon_88_tomaten_salat.jpg") },
    { name: "Tomaten Mozzarella", description: "Tomaten mit Mozzarella und Basilikum", price: 12.00, image: IMG("pizzalemon_89_tomaten_mozzarella.jpg") },
    { name: "Knoblibrot", description: "Knuspriges Brot mit Knoblauchbutter", price: 5.00, image: IMG("pizzalemon_90_knoblibrot.jpg") },
];

// ─── DESSERT ──────────────────────────────────────────────────────────────────
const DESSERTS: MenuItem[] = [
    { name: "Tiramisu", description: "Klassisches italienisches Tiramisu", price: 6.00, image: IMG("pizzalemon_92_tiramisu.jpg") },
    { name: "Baklava", description: "Türkisches Baklava mit Honig und Nüssen – Portion 4 Stk.", price: 8.00, image: IMG("pizzalemon_93_baklava.jpg") },
    { name: "Marlenke mit Honig", description: "Tschechischer Honigkuchen (Marlenka) mit Honig", price: 6.00, image: IMG("pizzalemon_94_marlenke.jpg") },
    { name: "Marlenke mit Schokolade", description: "Tschechischer Honigkuchen (Marlenka) mit Schokolade", price: 6.00, image: IMG("pizzalemon_94_marlenke.jpg") },
    { name: "Choco-Mousse", description: "Cremige Schokoladenmousse", price: 7.00, image: IMG("pizzalemon_95_choco_mousse.jpg") },
    { name: "Mövenpick Glace Erdbeer", description: "Mövenpick Premium-Glacé Erdbeer (175ml)", price: 6.00, image: IMG("pizzalemon_96_moevenpick_glace.jpg") },
    { name: "Mövenpick Glace Schokolade", description: "Mövenpick Premium-Glacé Schokolade (175ml)", price: 6.00, image: IMG("pizzalemon_96_moevenpick_glace.jpg") },
    { name: "Mövenpick Glace Vanille", description: "Mövenpick Premium-Glacé Vanille (175ml)", price: 6.00, image: IMG("pizzalemon_96_moevenpick_glace.jpg") },
    { name: "Mövenpick Glace Caramel", description: "Mövenpick Premium-Glacé Caramel (175ml)", price: 6.00, image: IMG("pizzalemon_96_moevenpick_glace.jpg") },
];

// ─── GETRÄNKE ─────────────────────────────────────────────────────────────────
const GETRAENKE: MenuItem[] = [
    { name: "Coca-Cola", description: "Coca-Cola, 0.5l", price: 4.00, image: IMG("pizzalemon_97_coca_cola.jpg") },
    { name: "Coca-Cola 1.5l", description: "Coca-Cola, 1.5l Flasche", price: 6.00, image: IMG("pizzalemon_coca_cola_1500ml.jpg") },
    { name: "Coca-Cola Zero", description: "Coca-Cola Zero, 0.5l", price: 4.00, image: IMG("pizzalemon_97_coca_cola.jpg") },
    { name: "Coca-Cola Zero 1.5l", description: "Coca-Cola Zero, 1.5l Flasche", price: 6.00, image: IMG("pizzalemon_coca_cola_zero_1500ml.jpg") },
    { name: "Fanta", description: "Fanta Orange, 0.5l", price: 6.00, image: IMG("pizzalemon_98_fanta.jpg") },
    { name: "Fanta 1.5l", description: "Fanta Orange, 1.5l Flasche", price: 6.00, image: IMG("pizzalemon_fanta_1500ml.jpg") },
    { name: "Eistee Pfirsich", description: "Eistee Pfirsich, 0.5l", price: 4.00, image: IMG("pizzalemon_99_eistee.jpg") },
    { name: "Eistee Pfirsich 1.5l", description: "Eistee Pfirsich, 1.5l Flasche", price: 6.00, image: IMG("pizzalemon_eistee_1500ml.jpg") },
    { name: "Uludag Gazoz", description: "Türkische Limonade Uludag, 0.5l", price: 4.00, image: IMG("pizzalemon_101_uludag_gazoz.jpg") },
    { name: "Rivella Blau", description: "Rivella Blau, 0.5l", price: 4.00, image: IMG("pizzalemon_102_rivella.jpg") },
    { name: "Rivella Rot", description: "Rivella Rot, 0.5l", price: 4.00, image: IMG("pizzalemon_102_rivella.jpg") },
    { name: "Ayran", description: "Türkisches Joghurtgetränk, 0.25l", price: 4.00, image: IMG("pizzalemon_103_ayran.jpg") },
    { name: "Red Bull", description: "Red Bull Energy Drink, 0.25l", price: 5.00, image: IMG("pizzalemon_104_red_bull.jpg") },
];

// ─── BIER ─────────────────────────────────────────────────────────────────────
const BIER: MenuItem[] = [
    { name: "Feldschlösschen", description: "Feldschlösschen Bier, 0.5l", price: 5.00, image: IMG("pizzalemon_106_feldschloesschen.jpg") },
];

// ─── ALKOHOLISCHE GETRÄNKE ────────────────────────────────────────────────────
const ALKOHOL: MenuItem[] = [
    { name: "Rotwein Merlot", description: "Merlot Rotwein, 50cl", price: 13.00, image: IMG("pizzalemon_107_rotwein_merlot.jpg") },
    { name: "Weisswein", description: "Weisswein, 50cl", price: 15.00, image: IMG("pizzalemon_108_weisswein.jpg") },
    { name: "Whisky", description: "Whisky 40%, 70cl Flasche", price: 50.00, image: IMG("pizzalemon_109_whisky.jpg") },
    { name: "Vodka", description: "Vodka 40%, 70cl Flasche", price: 50.00, image: IMG("pizzalemon_110_vodka.jpg") },
    { name: "Champagner", description: "Champagner, 70cl Flasche", price: 30.00, image: IMG("pizzalemon_111_champagner.jpg") },
    { name: "Smirnoff Ice", description: "Smirnoff Ice, 275ml", price: 6.00, image: IMG("pizzalemon_112_smirnoff_ice.jpg") },
];

// ─── EXTRA ────────────────────────────────────────────────────────────────────
const EXTRAS: MenuItem[] = [
    { name: "Brot", description: "Frisches Brot", price: 2.00, image: IMG("pizzalemon_extra_brot.jpg") },
    { name: "Knoblibrot", description: "Knuspriges Brot mit Knoblauchbutter", price: 7.00, image: IMG("pizzalemon_90_knoblibrot.jpg") },
    { name: "Pommes Extra", description: "Extra Portion Pommes frites", price: 11.00, image: IMG("pizzalemon_58_pommes.jpg") },
    { name: "Zigaretten", description: "Zigaretten – aktueller Preis. Zählen nicht zum Mindestbestellwert.", price: 17.00, image: IMG("pizzalemon_113_zigaretten.jpg") },
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
        }).returning();
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

    const hasAdmin = existingEmps.some(e => e.role === "admin" && e.pin === "1234");
    const hasCashier = existingEmps.some(e => e.role === "cashier" && e.pin === "5678");

    if (!hasAdmin) {
        await db.insert(employees).values({ name: "Admin", email: "admin.emp@pizzalemon.ch", pin: "1234", role: "admin", branchId, isActive: true });
    }
    if (!hasCashier) {
        await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
    }

    // ── Phase 7: Full product catalog reset ───────────────────────────────────
    // In production: always delete and re-insert to keep catalog up-to-date.
    // In development: skip reset if products already exist (dev + prod share the same DB;
    // resetting on every dev restart would wipe production data mid-session).
    const isProductionEnv = process.env.NODE_ENV === "production";
    const existingProds = await db.select().from(products)
        .where(eq(products.tenantId, tenant.id));

    if (existingProds.length > 0 && !isProductionEnv) {
        console.log(`[PIZZA LEMON] Dev mode: ${existingProds.length} products already exist — skipping catalog reset to protect shared DB.`);
        return;
    }

    if (existingProds.length > 0) {
        console.log(`[PIZZA LEMON] Deleting ${existingProds.length} existing products and re-inserting updated catalog...`);
        const prodIds = existingProds.map(p => p.id);
        await db.delete(inventory).where(inArray(inventory.productId, prodIds));
        await db.delete(products).where(eq(products.tenantId, tenant.id));
    } else {
        console.log("[PIZZA LEMON] Creating fresh product catalog...");
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
            }).returning();
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
        }).returning();
        await db.insert(inventory).values({ productId: prod.id, branchId, quantity: 999, lowStockThreshold: 0, reorderPoint: 0 }).onConflictDoNothing();
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
        "Chicken Nuggets 8Stk", "Pouletschnitzel", "Pouletflügeli 12Stk",
        "Poulet Kebab Teller", "Lamm Kebab Teller", "Köfte Teller",
        "Cevapcici Teller", "Falafel Teller",
    ]);
    for (const p of TELLERGERICHTE) {
        await insertItem("Tellergerichte", p, TELLER_WITH_SIDE.has(p.name) ? sideModifier() : []);
    }

    // Fingerfood: Döner/Kebab items get sauce modifier
    const FINGER_WITH_SAUCE = new Set([
        "Döner Kebab Tasche", "Dürüm Kebab", "Döner Box",
        "Poulet Kebab Tasche", "Poulet Kebab Fladen",
        "Lamm Kebab Tasche", "Lamm Kebab Fladen",
        "Köfte Taschenbrot", "Cevapcici Taschenbrot",
        "Kebab Fladen+Raclette", "Kebab Tasche+Raclette",
        "Kebab Fladen+Speck", "Kebab Tasche+Speck",
    ]);
    for (const p of FINGERFOOD) {
        await insertItem("Fingerfood", p, FINGER_WITH_SAUCE.has(p.name) ? sauceModifier() : []);
    }

    // Salat: green/mixed salads get dressing modifier
    const SALAT_WITH_DRESSING = new Set([
        "Grüner Salat", "Gemischter Salat", "Thon Salat", "Lemon Salat",
    ]);
    for (const p of SALATE) {
        await insertItem("Salat", p, SALAT_WITH_DRESSING.has(p.name) ? dressingModifier() : []);
    }

    for (const p of DESSERTS) await insertItem("Dessert", p);

    // Drinks with size modifier: Cola/Zero/Eistee 0.5l→1.5l = +2.00; Fanta both sizes = 6.00 (same price)
    const DRINKS_WITH_2EUR_SIZE = new Set(["Coca-Cola", "Coca-Cola Zero", "Eistee Pfirsich"]);
    for (const p of GETRAENKE) {
        let sizeMod: any[] = [];
        if (DRINKS_WITH_2EUR_SIZE.has(p.name)) {
            sizeMod = drinkSizeModifier(2.00);
        } else if (p.name === "Fanta") {
            sizeMod = drinkSizeModifier(0.00); // 0.5l and 1.5l both CHF 6.00
        }
        await insertItem("Getränke", p, sizeMod);
    }

    for (const p of BIER) await insertItem("Bier", p);
    for (const p of ALKOHOL) await insertItem("Alkoholische Getränke", p);
    for (const p of EXTRAS) await insertItem("Extra", p);

    const total = PIZZAS.length + CALZONES.length + PIDE.length + LAHMACUN.length +
        TELLERGERICHTE.length + FINGERFOOD.length + SALATE.length + DESSERTS.length +
        GETRAENKE.length + BIER.length + ALKOHOL.length + EXTRAS.length;
    console.log(`[PIZZA LEMON] ✓ ${total} products inserted with updated images (v4) and prices.`);

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
        title: "Pizza Lemon Katalog aktualisiert (v6)!",
        message: `+Mövenpick Glace Erdbeer/Schokolade/Vanille/Caramel (je einzeln), Bilder für Wunschpide+Extra Kebap hinzugefügt. Email: ${STORE_EMAIL} | PIN: 1234/5678 | Lizenz: ${LICENSE_KEY}`,
        priority: "high",
    }).onConflictDoNothing();

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
    console.log(`[PIZZA LEMON]    Menu: 35 Pizza, 3 Calzone, 10 Pide, 2 Lahmacun, 13 Tellergerichte, 24 Fingerfood, 8 Salat, 9 Dessert, 9 Getränke, 1 Bier, 6 Alkohol, 1 Tabak = ${total} total`);
}
