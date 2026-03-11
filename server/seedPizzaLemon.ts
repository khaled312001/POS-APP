import { db } from "./db";
import { eq, sql, inArray } from "drizzle-orm";
import {
    branches, employees, categories, products, inventory,
    tenants, tenantSubscriptions, licenseKeys, tenantNotifications,
    warehouses, tables, landingPageConfig,
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

// Local image base URL (served by Express from uploads/products/)
const IMG = (filename: string) => `/uploads/products/${filename}`;

// Category definitions
const PIZZA_LEMON_CATEGORIES = [
    { name: "Pizza",                  color: "#E53E3E", icon: "pizza"      },
    { name: "Calzone",                color: "#D69E2E", icon: "pizza"      },
    { name: "Pide",                   color: "#2B6CB0", icon: "restaurant" },
    { name: "Lahmacun",               color: "#C05621", icon: "pizza"      },
    { name: "Tellergerichte",         color: "#276749", icon: "restaurant" },
    { name: "Fingerfood",             color: "#805AD5", icon: "fast-food"  },
    { name: "Salat",                  color: "#2F855A", icon: "leaf"       },
    { name: "Dessert",                color: "#B7791F", icon: "ice-cream"  },
    { name: "Softgetränke",           color: "#2C7A7B", icon: "cafe"       },
    { name: "Bier",                   color: "#744210", icon: "beer"       },
    { name: "Alkoholische Getränke",  color: "#6B46C1", icon: "wine"       },
];

// Size modifier for pizzas and pide
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

// Pizza topping modifier
function pizzaToppingModifier() {
    return [
        {
            name: "Grösse",
            required: true,
            options: [
                { label: "33cm Normal", price: "0.00" },
                { label: "45cm Gross",  price: "5.00" },
            ],
        },
        {
            name: "Extras",
            required: false,
            multiple: true,
            options: [
                { label: "Extra Käse",         price: "2.00" },
                { label: "Extra Pilze",         price: "2.00" },
                { label: "Extra Schinken",      price: "2.50" },
                { label: "Extra Salami",        price: "2.50" },
                { label: "Extra Kebabfleisch",  price: "3.00" },
                { label: "Extra Oliven",        price: "1.50" },
                { label: "Extra Peperoni",      price: "1.50" },
                { label: "Knoblauchsauce",      price: "1.00" },
                { label: "Scharfe Sauce",       price: "1.00" },
            ],
        },
    ];
}

interface MenuItem { name: string; description: string; price: number; image?: string; }

const PIZZAS: MenuItem[] = [
    { name: "Margherita",          description: "Tomatensauce, Mozzarella, Oregano",                                                     price: 14.00, image: IMG("pizzalemon_01_margherita.jpg") },
    { name: "Profumata",           description: "Tomaten, Mozzarella, Zwiebeln, Knoblauch, Oregano",                                     price: 14.00, image: IMG("pizzalemon_02_profumata.jpg") },
    { name: "Funghi",              description: "Tomatensauce, Mozzarella, Pilze",                                                       price: 15.00, image: IMG("pizzalemon_03_funghi.jpg") },
    { name: "Spinat",              description: "Tomatensauce, Mozzarella, Spinat",                                                      price: 15.00, image: IMG("pizzalemon_04_spinat.jpg") },
    { name: "Gorgonzola",          description: "Tomatensauce, Mozzarella, Gorgonzola",                                                  price: 16.00, image: IMG("pizzalemon_05_gorgonzola.jpg") },
    { name: "Prosciutto",          description: "Tomatensauce, Mozzarella, Schinken",                                                    price: 16.00, image: IMG("pizzalemon_06_prosciutto.jpg") },
    { name: "Salami",              description: "Tomatensauce, Mozzarella, scharfe Salami",                                              price: 16.00, image: IMG("pizzalemon_07_salami.jpg") },
    { name: "Diavola",             description: "Tomatensauce, Mozzarella, scharfe Salami, Oliven, Zwiebeln",                            price: 17.00, image: IMG("pizzalemon_08_diavola.jpg") },
    { name: "Arrabbiata",          description: "Tomatensauce, Mozzarella, Oliven, Pilze, scharf",                                       price: 17.00, image: IMG("pizzalemon_09_arrabbiata.jpg") },
    { name: "Siciliana",           description: "Tomatensauce, Mozzarella, Schinken, Sardellen, Kapern",                                 price: 17.00, image: IMG("pizzalemon_10_siciliana.jpg") },
    { name: "Prosciutto e Funghi", description: "Tomatensauce, Mozzarella, Pilze, Schinken",                                             price: 17.00, image: IMG("pizzalemon_11_prosciutto_e_funghi.jpg") },
    { name: "Hawaii",              description: "Tomatensauce, Mozzarella, Schinken, Ananas",                                            price: 17.00, image: IMG("pizzalemon_12_hawaii.jpg") },
    { name: "Tonno",               description: "Tomatensauce, Mozzarella, Thon, Zwiebeln",                                              price: 17.00, image: IMG("pizzalemon_13_tonno.jpg") },
    { name: "Piccante",            description: "Tomatensauce, Mozzarella, Peperoni, Peperoncini, Zwiebeln, Knoblauch, Oregano",         price: 18.00, image: IMG("pizzalemon_14_piccante.jpg") },
    { name: "Raclette",            description: "Tomatensauce, Mozzarella, Raclettekäse",                                                price: 18.00, image: IMG("pizzalemon_15_raclette.jpg") },
    { name: "Fiorentina",          description: "Tomaten, Mozzarella, Spinat, Parmesan, Ei, Oregano",                                    price: 18.00, image: IMG("pizzalemon_16_fiorentina.jpg") },
    { name: "Kebab Pizza",         description: "Tomatensauce, Mozzarella, Kebabfleisch",                                                price: 19.00, image: IMG("pizzalemon_17_kebab_pizza.jpg") },
    { name: "Poulet",              description: "Tomatensauce, Mozzarella, Poulet",                                                      price: 19.00, image: IMG("pizzalemon_18_poulet.jpg") },
    { name: "Carbonara",           description: "Tomatensauce, Mozzarella, Speck, Ei, Zwiebeln",                                        price: 19.00, image: IMG("pizzalemon_19_carbonara.jpg") },
    { name: "Gamberetti",          description: "Tomatensauce, Mozzarella, Crevetten, Knoblauch",                                        price: 19.00, image: IMG("pizzalemon_20_gamberetti.jpg") },
    { name: "Quattro Formaggi",    description: "Tomatensauce, Mozzarella, 4 Käsesorten, Mascarpone",                                   price: 19.00, image: IMG("pizzalemon_21_quattro_formaggi.jpg") },
    { name: "Quattro Stagioni",    description: "Tomatensauce, Mozzarella, Schinken, Pilze, Artischocken, Peperoni",                     price: 19.00, image: IMG("pizzalemon_22_quattro_stagioni.jpg") },
    { name: "Frutti di Mare",      description: "Tomatensauce, Mozzarella, Meeresfrüchte, Oregano",                                     price: 19.00, image: IMG("pizzalemon_23_frutti_di_mare.jpg") },
    { name: "Verdura",             description: "Tomatensauce, Mozzarella, Gemüse",                                                     price: 19.00, image: IMG("pizzalemon_24_verdura.jpg") },
    { name: "Napoli",              description: "Tomatensauce, Mozzarella, Sardellen, Oliven, Kapern",                                   price: 18.00, image: IMG("pizzalemon_25_napoli.jpg") },
    { name: "Pizzaiolo",           description: "Tomatensauce, Mozzarella, Speck, Knoblauch, Pilze",                                    price: 18.00, image: IMG("pizzalemon_26_pizzaiolo.jpg") },
    { name: "A'Casa",              description: "Tomatensauce, Mozzarella, Geflügelgeschnetzeltes, Peperoni, Ei, Oregano",              price: 19.00, image: IMG("pizzalemon_27_a_casa.jpg") },
    { name: "Porcini",             description: "Tomaten, Mozzarella, Steinpilze, Zwiebeln, Oregano",                                    price: 19.00, image: IMG("pizzalemon_28_porcini.jpg") },
    { name: "Spezial",             description: "Tomatensauce, Mozzarella, Kalbfleisch, Knoblauch, Scharf, Kräuterbutter, Oregano",    price: 19.00, image: IMG("pizzalemon_29_spezial.jpg") },
    { name: "Padrone",             description: "Tomatensauce, Mozzarella, Gorgonzola, Pilze",                                           price: 20.00, image: IMG("pizzalemon_30_padrone.jpg") },
    { name: "Schloss Pizza",       description: "Tomatensauce, Mozzarella, Schinken, Speck, scharfe Salami",                             price: 20.00, image: IMG("pizzalemon_31_schloss_pizza.jpg") },
    { name: "Italiano",            description: "Tomatensauce, Mozzarella, Rohschinken, Mascarpone, Rucola",                             price: 20.00, image: IMG("pizzalemon_32_italiano.jpg") },
    { name: "Americano",           description: "Tomatensauce, Mozzarella, Speck, Mais, Zwiebeln",                                      price: 21.00, image: IMG("pizzalemon_33_americano.jpg") },
    { name: "Lemon Pizza",         description: "Tomatensauce, Mozzarella, Lammfleisch, Knoblauch, Zwiebeln, Peperoncini, Scharf",      price: 20.00, image: IMG("pizzalemon_34_lemon_pizza.jpg") },
];

const CALZONES: MenuItem[] = [
    { name: "Calzone",         description: "Tomatensauce, Mozzarella, Schinken, Pilze, Ei (nur 45cm)",  price: 20.00, image: IMG("pizzalemon_112_calzone.jpg") },
    { name: "Calzone Kebab",   description: "Tomatensauce, Mozzarella, Kebabfleisch, Ei (nur 45cm)",      price: 20.00, image: IMG("pizzalemon_113_calzone_kebab.jpg") },
    { name: "Calzone Verdura", description: "Tomatensauce, Mozzarella, Saisongemüse (nur 45cm)",          price: 20.00, image: IMG("pizzalemon_114_calzone_verdura.jpg") },
];

const PIDE: MenuItem[] = [
    { name: "Pide mit Käse",            description: "Pide mit Schafskäse",                                        price: 14.00, image: IMG("pizzalemon_35_pide_mit_kaese.jpg") },
    { name: "Pide mit Hackfleisch",     description: "Pide mit Hackfleisch und Tomaten",                           price: 16.00, image: IMG("pizzalemon_36_pide_mit_hackfleisch.jpg") },
    { name: "Pide Käse Hackfleisch",    description: "Pide mit Schafskäse und Hackfleisch",                        price: 17.00, image: IMG("pizzalemon_37_pide_kaese_hackfleisch.jpg") },
    { name: "Pide Käse Spinat",         description: "Pide mit Schafskäse und Spinat",                             price: 15.00, image: IMG("pizzalemon_38_pide_kaese_spinat.jpg") },
    { name: "Pide Käse Ei",             description: "Pide mit Schafskäse und Ei",                                 price: 15.00, image: IMG("pizzalemon_39_pide_kaese_ei.jpg") },
    { name: "Lemon Pide",               description: "Hausgemachte Pide mit Lammfleisch und Gewürzen",             price: 18.00, image: IMG("pizzalemon_40_lemon_pide.jpg") },
    { name: "Lemon Pide Spezial",       description: "Lemon Pide mit Extra-Zutaten nach Wahl",                     price: 20.00, image: IMG("pizzalemon_41_lemon_pide_spezial.jpg") },
    { name: "Pide mit Sucuk",           description: "Pide mit türkischer Wurst (Sucuk)",                          price: 17.00, image: IMG("pizzalemon_42_pide_mit_sucuk.jpg") },
    { name: "Pide mit Kebabfleisch",    description: "Pide mit Kebabfleisch",                                      price: 18.00, image: IMG("pizzalemon_43_pide_mit_kebabfleisch.jpg") },
];

const LAHMACUN: MenuItem[] = [
    { name: "Lahmacun mit Salat",       description: "Türkische Minipizza mit Hackfleisch und frischem Salat",     price: 12.00, image: IMG("pizzalemon_44_lahmacun_mit_salat.jpg") },
    { name: "Lahmacun+Salat+Kebab",     description: "Lahmacun mit Salat und Kebabfleisch",                       price: 16.00, image: IMG("pizzalemon_45_lahmacun_salat_kebab.jpg") },
];

const TELLERGERICHTE: MenuItem[] = [
    { name: "Döner Teller+Pommes",      description: "Döner Kebab auf dem Teller mit Pommes frites",              price: 18.00, image: IMG("pizzalemon_46_doener_teller_pommes.jpg") },
    { name: "Döner Teller+Salat",       description: "Döner Kebab auf dem Teller mit frischem Salat",             price: 18.00, image: IMG("pizzalemon_47_doener_teller_salat.jpg") },
    { name: "Döner Teller Komplett",    description: "Döner Kebab auf dem Teller mit Salat und Pommes",           price: 22.00, image: IMG("pizzalemon_48_doener_teller_komplett.jpg") },
    { name: "Chicken Nuggets 8Stk",     description: "8 knusprige Chicken Nuggets mit Dip",                       price: 12.00, image: IMG("pizzalemon_49_chicken_nuggets_8stk.jpg") },
    { name: "Pouletschnitzel",          description: "Zartes Pouletschnitzel mit Beilagen",                       price: 18.00, image: IMG("pizzalemon_50_pouletschnitzel.jpg") },
    { name: "Pouletflügeli 12Stk",      description: "12 knusprige Pouletflügeli",                                price: 16.00, image: IMG("pizzalemon_51_pouletfluegeli_12stk.jpg") },
    { name: "Poulet Kebab Teller",      description: "Poulet Kebab auf dem Teller mit Beilagen",                  price: 18.00, image: IMG("pizzalemon_52_poulet_kebab_teller.jpg") },
    { name: "Lamm Kebab Teller",        description: "Lamm Kebab auf dem Teller mit Beilagen",                    price: 20.00, image: IMG("pizzalemon_53_lamm_kebab_teller.jpg") },
    { name: "Köfte Teller",             description: "Türkische Hackfleischbällchen auf dem Teller",              price: 18.00, image: IMG("pizzalemon_54_koefte_teller.jpg") },
    { name: "Cevapcici Teller",         description: "Gegrillte Cevapcici mit Beilagen",                          price: 18.00, image: IMG("pizzalemon_55_cevapcici_teller.jpg") },
    { name: "Falafel Teller",           description: "Knusprige Falafel auf dem Teller mit Beilagen",             price: 16.00, image: IMG("pizzalemon_56_falafel_teller.jpg") },
    { name: "Pommes",                   description: "Pommes frites, knusprig frittiert",                          price: 6.00,  image: IMG("pizzalemon_57_pommes.jpg") },
    { name: "Cordon Bleu",              description: "Klassisches Cordon Bleu mit Beilagen",                      price: 22.00, image: IMG("pizzalemon_58_cordon_bleu.jpg") },
];

const FINGERFOOD: MenuItem[] = [
    { name: "Döner Kebab Tasche",       description: "Döner Kebab im Fladenbrot",                                  price: 12.00, image: IMG("pizzalemon_59_doener_kebab_tasche.jpg") },
    { name: "Dürüm Kebab",             description: "Döner Kebab im Dürüm-Wrap",                                  price: 13.00, image: IMG("pizzalemon_60_dueruem_kebab.jpg") },
    { name: "Döner Box",                description: "Döner Kebab in der Box mit Pommes",                          price: 13.00, image: IMG("pizzalemon_61_doener_box.jpg") },
    { name: "Falafel Taschenbrot",      description: "Knusprige Falafel im Taschenbrot",                           price: 10.00, image: IMG("pizzalemon_62_falafel_taschenbrot.jpg") },
    { name: "Falafel Dürüm",           description: "Falafel im Dürüm-Wrap",                                      price: 11.00, image: IMG("pizzalemon_63_falafel_dueruem.jpg") },
    { name: "Poulet Pepito",            description: "Gegrilltes Poulet im Fladenbrot",                            price: 12.00, image: IMG("pizzalemon_64_poulet_pepito.jpg") },
    { name: "Lamm Pepito",              description: "Gegrilltes Lammfleisch im Fladenbrot",                       price: 14.00, image: IMG("pizzalemon_65_lamm_pepito.jpg") },
    { name: "Hamburger",                description: "Klassischer Hamburger mit Salat und Sauce",                  price: 12.00, image: IMG("pizzalemon_66_hamburger.jpg") },
    { name: "Lemon Burger",             description: "Hausgemachter Burger mit Lemon-Sauce",                       price: 14.00, image: IMG("pizzalemon_67_lemon_burger.jpg") },
    { name: "Cheeseburger",             description: "Hamburger mit Cheddar-Käse",                                 price: 13.00, image: IMG("pizzalemon_68_cheeseburger.jpg") },
    { name: "Hamburger Rindfleisch",    description: "Hamburger mit 100% Rindfleisch",                             price: 14.00, image: IMG("pizzalemon_69_hamburger_rindfleisch.jpg") },
    { name: "Poulet Kebab Tasche",      description: "Poulet Kebab im Taschenbrot",                                price: 13.00, image: IMG("pizzalemon_70_poulet_kebab_tasche.jpg") },
    { name: "Poulet Kebab Fladen",      description: "Poulet Kebab im Fladenbrot",                                 price: 14.00, image: IMG("pizzalemon_71_poulet_kebab_fladen.jpg") },
    { name: "Lamm Kebab Tasche",        description: "Lamm Kebab im Taschenbrot",                                  price: 14.00, image: IMG("pizzalemon_72_lamm_kebab_tasche.jpg") },
    { name: "Lamm Kebab Fladen",        description: "Lamm Kebab im Fladenbrot",                                   price: 15.00, image: IMG("pizzalemon_73_lamm_kebab_fladen.jpg") },
    { name: "Köfte Taschenbrot",        description: "Türkische Hackfleischbällchen im Taschenbrot",               price: 12.00, image: IMG("pizzalemon_74_koefte_taschenbrot.jpg") },
    { name: "Cevapcici Taschenbrot",    description: "Gegrillte Cevapcici im Taschenbrot",                         price: 12.00, image: IMG("pizzalemon_75_cevapcici_taschenbrot.jpg") },
    { name: "Falafel Box",              description: "Knusprige Falafel in der Box",                               price: 11.00, image: IMG("pizzalemon_76_falafel_box.jpg") },
    { name: "Chicken Nuggets Box",      description: "Chicken Nuggets in der Box mit Dip",                         price: 12.00, image: IMG("pizzalemon_77_chicken_nuggets_box.jpg") },
    { name: "Kebab Fladen+Raclette",    description: "Kebab Fladen mit Raclettekäse überbacken",                  price: 16.00, image: IMG("pizzalemon_78_kebab_fladen_raclette.jpg") },
    { name: "Kebab Tasche+Raclette",    description: "Kebab Tasche mit Raclettekäse überbacken",                  price: 16.00, image: IMG("pizzalemon_79_kebab_tasche_raclette.jpg") },
    { name: "Kebab Fladen+Speck",       description: "Kebab Fladen mit Speck",                                     price: 15.00, image: IMG("pizzalemon_80_kebab_fladen_speck.jpg") },
    { name: "Kebab Tasche+Speck",       description: "Kebab Tasche mit Speck",                                     price: 15.00, image: IMG("pizzalemon_81_kebab_tasche_speck.jpg") },
];

const SALATE: MenuItem[] = [
    { name: "Grüner Salat",            description: "Frischer Blattsalat mit Dressing",                           price: 7.00,  image: IMG("pizzalemon_82_gruener_salat.jpg") },
    { name: "Gemischter Salat",        description: "Frischer gemischter Salat",                                  price: 8.00,  image: IMG("pizzalemon_83_gemischter_salat.jpg") },
    { name: "Griechischer Salat",      description: "Tomaten, Gurken, Oliven, Feta",                              price: 9.50,  image: IMG("pizzalemon_84_griechischer_salat.jpg") },
    { name: "Lemon Salat",             description: "Hausgemachter Salat nach Art des Hauses",                    price: 12.00, image: IMG("pizzalemon_85_lemon_salat.jpg") },
    { name: "Thon Salat",              description: "Salat mit Thunfisch, Tomaten und Zwiebeln",                  price: 11.00, image: IMG("pizzalemon_86_thon_salat.jpg") },
    { name: "Tomaten Salat",           description: "Frischer Tomatensalat mit Olivenöl",                         price: 7.50,  image: IMG("pizzalemon_87_tomaten_salat.jpg") },
    { name: "Tomaten Mozzarella",      description: "Tomaten mit Mozzarella und Basilikum",                       price: 10.00, image: IMG("pizzalemon_88_tomaten_mozzarella.jpg") },
    { name: "Knoblibrot",              description: "Knuspriges Brot mit Knoblauchbutter",                         price: 5.00,  image: IMG("pizzalemon_89_knoblibrot.jpg") },
    { name: "Crevettencocktail",       description: "Frischer Crevetten-Cocktail mit Dressing",                   price: 14.00, image: IMG("pizzalemon_90_crevettencocktail.jpg") },
];

const DESSERTS: MenuItem[] = [
    { name: "Tiramisu",            description: "Klassisches italienisches Tiramisu",                              price: 6.00, image: IMG("pizzalemon_91_tiramisu.jpg") },
    { name: "Baklava",             description: "Türkisches Baklava mit Honig und Nüssen",                        price: 5.00, image: IMG("pizzalemon_92_baklava.jpg") },
    { name: "Marlenke",            description: "Tschechischer Honigkuchen (Marlenka)",                            price: 6.00, image: IMG("pizzalemon_93_marlenke.jpg") },
    { name: "Choco-Mousse",        description: "Cremige Schokoladenmousse",                                      price: 6.50, image: IMG("pizzalemon_94_choco_mousse.jpg") },
    { name: "Mövenpick Glace",     description: "Mövenpick Premium-Glacé",                                        price: 6.00, image: IMG("pizzalemon_95_moevenpick_glace.jpg") },
];

const SOFT: MenuItem[] = [
    { name: "Coca-Cola 0.5l",      description: "Coca-Cola, 0.5l",                                                price: 3.50, image: IMG("pizzalemon_96_coca_cola.jpg") },
    { name: "Fanta 0.5l",          description: "Fanta, 0.5l",                                                    price: 3.50, image: IMG("pizzalemon_97_fanta.jpg") },
    { name: "Eistee 0.5l",         description: "Nestea Eistee, 0.5l",                                            price: 3.50, image: IMG("pizzalemon_98_eistee.jpg") },
    { name: "Mineralwasser 0.5l",  description: "Mineralwasser, 0.5l",                                            price: 2.50, image: IMG("pizzalemon_99_mineralwasser.jpg") },
    { name: "Uludag Gazoz 0.5l",   description: "Türkische Limonade Uludag, 0.5l",                                price: 3.50, image: IMG("pizzalemon_100_uludag_gazoz.jpg") },
    { name: "Rivella 0.5l",        description: "Rivella, 0.5l",                                                  price: 3.50, image: IMG("pizzalemon_101_rivella.jpg") },
    { name: "Ayran 0.25l",         description: "Türkisches Joghurtgetränk, 0.25l",                               price: 3.00, image: IMG("pizzalemon_102_ayran.jpg") },
    { name: "Red Bull 0.25l",      description: "Red Bull Energy Drink, 0.25l",                                   price: 4.50, image: IMG("pizzalemon_103_red_bull.jpg") },
];

const BIER: MenuItem[] = [
    { name: "Müllerbräu",          description: "Schweizer Bier Müllerbräu, 0.5l",                                price: 5.00, image: IMG("pizzalemon_104_muellerbraeu.jpg") },
    { name: "Feldschlösschen",     description: "Feldschlösschen Bier, 0.5l",                                     price: 5.00, image: IMG("pizzalemon_105_feldschlosschen.jpg") },
];

const ALKOHOL: MenuItem[] = [
    { name: "Rotwein Merlot",      description: "Merlot Rotwein, 2dl",                                            price: 7.00, image: IMG("pizzalemon_106_rotwein_merlot.jpg") },
    { name: "Weisswein",           description: "Weisswein, 2dl",                                                 price: 7.00, image: IMG("pizzalemon_107_weisswein.jpg") },
    { name: "Whisky",              description: "Whisky, 4cl",                                                    price: 8.00, image: IMG("pizzalemon_108_whisky.jpg") },
    { name: "Vodka",               description: "Vodka, 4cl",                                                     price: 7.00, image: IMG("pizzalemon_109_vodka.jpg") },
    { name: "Champagner",          description: "Champagner, 1dl",                                                price: 9.00, image: IMG("pizzalemon_110_champagner.jpg") },
    { name: "Smirnoff Ice",        description: "Smirnoff Ice, 0.275l",                                           price: 5.50, image: IMG("pizzalemon_111_smirnoff_ice.jpg") },
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
        console.log("[PIZZA LEMON] License key already present – running incremental updates...");
    }

    // ── Phase 2: Find or create the Pizza Lemon tenant ────────────────────────
    let tenant: typeof tenants.$inferSelect | undefined;

    const pizzaLemonTenants = await db.select().from(tenants)
        .where(sql`LOWER(${tenants.businessName}) = 'pizza lemon'`);

    if (pizzaLemonTenants.length > 0) {
        tenant = pizzaLemonTenants[0];
        console.log(`[PIZZA LEMON] Found existing store (ID ${tenant.id}). Upgrading credentials...`);

        const hash = await bcrypt.hash(STORE_PASSWORD, 10);
        await db.update(tenants).set({
            ownerEmail:   STORE_EMAIL,
            passwordHash: hash,
            status:       "active",
            storeType:    "restaurant",
            maxBranches:  3,
            maxEmployees: 20,
        }).where(eq(tenants.id, tenant.id));
    } else {
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
    }

    // ── Phase 4: Add the fixed license key (only if new) ─────────────────────
    if (!isAlreadySeeded) {
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
    }

    // ── Phase 5: Ensure branch exists ─────────────────────────────────────────
    let tenantBranches = await db.select().from(branches)
        .where(eq(branches.tenantId, tenant.id));

    let branchId: number;
    if (tenantBranches.length > 0) {
        branchId = tenantBranches[0].id;
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
    }
    if (!hasCashier) {
        await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
    }

    // ── Phase 7: Ensure categories and products (full menu of 114 items) ──────
    const existingProds = await db.select().from(products)
        .where(eq(products.tenantId, tenant.id));

    if (existingProds.length < 10) {
        console.log("[PIZZA LEMON] Creating categories and products...");

        const catMap: Record<string, number> = {};
        for (const cat of PIZZA_LEMON_CATEGORIES) {
            const [inserted] = await db.insert(categories).values({
                name: cat.name, color: cat.color, icon: cat.icon, isActive: true,
            }).returning();
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
                ...(item.image ? { image: item.image } : {}),
            }).returning();
            await db.insert(inventory).values({ productId: prod.id, branchId, quantity: 999, lowStockThreshold: 0, reorderPoint: 0 });
        }

        for (const p of PIZZAS)         await insertItem("Pizza",                 p, pizzaToppingModifier());
        for (const p of CALZONES)       await insertItem("Calzone",               p);
        for (const p of PIDE)           await insertItem("Pide",                  p, sizeModifier());
        for (const p of LAHMACUN)       await insertItem("Lahmacun",              p);
        for (const p of TELLERGERICHTE) await insertItem("Tellergerichte",        p);
        for (const p of FINGERFOOD)     await insertItem("Fingerfood",            p);
        for (const p of SALATE)         await insertItem("Salat",                 p);
        for (const p of DESSERTS)       await insertItem("Dessert",               p);
        for (const p of SOFT)           await insertItem("Softgetränke",          p);
        for (const p of BIER)           await insertItem("Bier",                  p);
        for (const p of ALKOHOL)        await insertItem("Alkoholische Getränke", p);

        console.log(`[PIZZA LEMON] All 114 products seeded.`);
    } else {
        // ── Incremental update: sync images + add missing products ─────────────
        console.log(`[PIZZA LEMON] Products present (${existingProds.length}). Syncing images and adding missing items...`);

        const allItems = [
            ...PIZZAS, ...CALZONES, ...PIDE, ...LAHMACUN, ...TELLERGERICHTE,
            ...FINGERFOOD, ...SALATE, ...DESSERTS, ...SOFT, ...BIER, ...ALKOHOL,
        ];

        // Update images for existing products
        for (const prod of existingProds) {
            const item = allItems.find(i => i.name === prod.name);
            if (item?.image && prod.image !== item.image) {
                await db.update(products).set({ image: item.image }).where(eq(products.id, prod.id));
            }
        }

        // Ensure Bier category exists
        const existingCats = await db.select({ id: categories.id, name: categories.name })
            .from(categories);

        const catMap: Record<string, number> = {};
        for (const c of existingCats) catMap[c.name] = c.id;

        for (const cat of PIZZA_LEMON_CATEGORIES) {
            if (!catMap[cat.name]) {
                const [ins] = await db.insert(categories).values({
                    name: cat.name, color: cat.color, icon: cat.icon, isActive: true,
                }).returning();
                catMap[cat.name] = ins.id;
                console.log(`[PIZZA LEMON] Added missing category: ${cat.name}`);
            }
        }

        // Add any missing products by name
        const existingNames = new Set(existingProds.map(p => p.name));
        let addedCount = 0;
        let idx = existingProds.length;

        const catItems: Array<[string, MenuItem[], any[]]> = [
            ["Pizza",                 PIZZAS,         pizzaToppingModifier()],
            ["Calzone",               CALZONES,       []],
            ["Pide",                  PIDE,           sizeModifier()],
            ["Lahmacun",              LAHMACUN,       []],
            ["Tellergerichte",        TELLERGERICHTE, []],
            ["Fingerfood",            FINGERFOOD,     []],
            ["Salat",                 SALATE,         []],
            ["Dessert",               DESSERTS,       []],
            ["Softgetränke",          SOFT,           []],
            ["Bier",                  BIER,           []],
            ["Alkoholische Getränke", ALKOHOL,        []],
        ];

        for (const [catName, items, mods] of catItems) {
            for (const item of items) {
                if (!existingNames.has(item.name)) {
                    const sku = `PL-${slugify(item.name).toUpperCase().slice(0, 10)}-${++idx}`;
                    const catId = catMap[catName];
                    const [prod] = await db.insert(products).values({
                        tenantId: tenant!.id,
                        name: item.name,
                        description: item.description,
                        sku,
                        categoryId: catId,
                        price: String(item.price.toFixed(2)),
                        costPrice: String((item.price * 0.35).toFixed(2)),
                        unit: "piece",
                        taxable: true,
                        trackInventory: false,
                        isActive: true,
                        modifiers: mods,
                        ...(item.image ? { image: item.image } : {}),
                    }).returning();
                    await db.insert(inventory).values({ productId: prod.id, branchId, quantity: 999, lowStockThreshold: 0, reorderPoint: 0 });
                    addedCount++;
                    console.log(`[PIZZA LEMON] Added new product: ${item.name}`);
                }
            }
        }

        console.log(`[PIZZA LEMON] Incremental update done. Images synced. ${addedCount} new products added.`);
    }

    // ── Landing page config ────────────────────────────────────────────────────
    const [existingConfig] = await db.select().from(landingPageConfig)
        .where(eq(landingPageConfig.tenantId, tenant.id));

    const heroImage = IMG("pizzalemon_34_lemon_pizza.jpg");

    if (!existingConfig) {
        await db.insert(landingPageConfig).values({
            tenantId: tenant.id,
            slug: "pizza-lemon",
            heroTitle: "Pizza Lemon",
            heroSubtitle: "Frische Pizza, Döner & mehr – direkt zu Ihnen geliefert",
            heroImage,
            aboutText: "Pizza Lemon – Ihr Lieblingsrestaurant für authentische italienische Pizza und türkische Spezialitäten in Zürich. Wir verwenden täglich frische Zutaten und backen unsere Pizzen im Steinofen. Jetzt online bestellen oder besuchen Sie uns direkt!",
            primaryColor: "#E53E3E",
            accentColor: "#D69E2E",
            enableOnlineOrdering: true,
            enableDelivery: true,
            enablePickup: true,
            acceptCard: true,
            acceptMobile: true,
            acceptCash: true,
            minOrderAmount: "15.00",
            estimatedDeliveryTime: 35,
            footerText: "© 2025 Pizza Lemon · Alle Rechte vorbehalten",
            socialWhatsapp: "+41443103814",
            socialFacebook: "https://facebook.com/pizzalemon",
            socialInstagram: "https://instagram.com/pizzalemon",
            phone: "+41 44 310 38 14",
            email: "info@pizzalemon.ch",
            address: "Zürich, Schweiz",
            openingHours: "Mo–So: 11:00–22:00",
            deliveryRadius: "Lieferung im Umkreis von 5km",
            isPublished: true,
        });
        console.log("[PIZZA LEMON] Landing page config created. URL: /store/pizza-lemon");
    } else {
        await db.update(landingPageConfig).set({
            heroImage,
            primaryColor: "#E53E3E",
            accentColor: "#D69E2E",
            phone: existingConfig.phone || "+41 44 310 38 14",
            email: existingConfig.email || "info@pizzalemon.ch",
            address: existingConfig.address || "Zürich, Schweiz",
            openingHours: existingConfig.openingHours || "Mo–So: 11:00–22:00",
            socialFacebook: existingConfig.socialFacebook || "https://facebook.com/pizzalemon",
            socialInstagram: existingConfig.socialInstagram || "https://instagram.com/pizzalemon",
        }).where(eq(landingPageConfig.tenantId, tenant.id));
        console.log("[PIZZA LEMON] Landing page config updated.");
    }

    // ── Notification ──────────────────────────────────────────────────────────
    await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type:     "info",
        title:    "Willkommen bei Pizza Lemon!",
        message:  `Email: ${STORE_EMAIL} | Passwort: ${STORE_PASSWORD} | Lizenz: ${LICENSE_KEY} | Admin-PIN: 1234 | Cashier-PIN: 5678`,
        priority: "high",
    }).onConflictDoNothing();

    console.log(`[PIZZA LEMON] Setup complete!`);
    console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
    console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
    console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
    console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
    console.log(`[PIZZA LEMON]    Menu: 34 Pizzas, 3 Calzones, 9 Pide, 2 Lahmacun, 13 Tellergerichte, 23 Fingerfood, 9 Salate, 5 Desserts, 8 Softgetränke, 2 Bier, 6 Alkohol = 114 total`);
}
