import { db } from "./db";
import { eq } from "drizzle-orm";
import {
    branches, employees, categories, products, inventory,
    tenants, tenantSubscriptions, licenseKeys,
    warehouses, tables, landingPageConfig,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { addYears } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
//  Zürich Restaurants Seeder
//  Seeds 10 realistic Zürich/Switzerland restaurants (tenant IDs 101–110).
//  Idempotent: each restaurant is skipped if its landing-page slug already
//  exists. Every product carries a stable Unsplash CDN image URL.
//  Login pattern per restaurant:  <ownerEmail> / <password>
//  Admin PIN 1234  ·  Cashier PIN 5678
// ─────────────────────────────────────────────────────────────────────────────

// Stable direct Unsplash CDN URL builder (NOT source.unsplash.com — deprecated).
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

// ─── Curated dish-type → verified Unsplash photo ID map ──────────────────────
// Every ID below returned HTTP 200 from images.unsplash.com at seed-authoring time.
const IMG: Record<string, string> = {
    // Italian / pizza / pasta
    pizza:          U("1513104890138-7c749659a591"),
    pasta:          U("1621996346565-e3dbc646d9a9"),
    pasta_cheese:   U("1551183053-bf91a1d81141"),
    caprese:        U("1608039755401-742074f0548d"),
    // Generic plated / meat
    plated:         U("1600891964599-f61ba0e24092"),
    steak:          U("1546241072-48010ad2862c"),
    steak2:         U("1600891964092-4316c288032e"),
    steak3:         U("1573821663912-6df460f9c684"),
    // Soups
    soup:           U("1547592166-23ac45744acd"),
    soup2:          U("1476718406336-bb5a9690ee2a"),
    miso_soup:      U("1547592166-23ac45744acd"),
    tom_yum:        U("1476718406336-bb5a9690ee2a"),
    // Japanese
    sushi:          U("1579584425555-c3ce17fd4351"),
    nigiri:         U("1611143669185-af224c5e3252"),
    maki:           U("1617093727343-374698b1b08d"),
    sashimi:        U("1606491956689-2ea866880c84"),
    rice:           U("1512058564366-18510be2db19"),
    bowl:           U("1546069901-ba9599a7e63c"),
    poke:           U("1546793665-c74683f339c1"),
    ramen:          U("1569718212165-3a8278d5f624"),
    noodles:        U("1585032226651-759b368d7246"),
    noodles2:       U("1557872943-16a5ac26437e"),
    dumplings:      U("1626509653291-18d9a934b9db"),
    // Poultry
    chicken:        U("1598103442097-8b74394b95c6"),
    grilled_chicken:U("1610057099431-d73a1c9d2f2f"),
    wings:          U("1598103442097-8b74394b95c6"),
    // Salads
    salad:          U("1512621776951-a57141f2eefd"),
    greek_salad:    U("1503764654157-72d979d9af2f"),
    tabbouleh:      U("1512621776951-a57141f2eefd"),
    // Indian
    curry:          U("1585937421612-70a008356fbe"),
    curry2:         U("1607301405390-d831c242f59b"),
    tandoori:       U("1626700051175-6818013e1d4f"),
    biryani:        U("1633945274405-b6c8069047b0"),
    naan:           U("1626074353765-517a681e40be"),
    samosa:         U("1604908176997-125f25cc6f3d"),
    // Middle Eastern
    kebab:          U("1529006557810-274b9b2fc783"),
    shawarma:       U("1529006557810-274b9b2fc783"),
    falafel:        U("1541518763669-27fef04b14ea"),
    hummus:         U("1512152272829-e3139592d56f"),
    mezze:          U("1544982503-9f984c14501a"),
    baklava:        U("1615870216519-2f9fa575fa5c"),
    // Thai / Vietnamese
    thai_food:      U("1601050690597-df0568f70950"),
    thai_curry:     U("1601050690117-94f5f6fa8bd7"),
    pad_thai:       U("1541592106381-b31e9677c0e5"),
    spring_rolls:   U("1548943487-a2e4e43b4853"),
    pho:            U("1589301760014-d929f3979dbc"),
    sandwich:       U("1553909489-cd47e0907980"),
    // Burgers / American
    burger:         U("1568901346375-23c9450c58cd"),
    burger_deluxe:  U("1571091718767-18b5b1457add"),
    cheeseburger:   U("1553979459-d2229ba7433b"),
    fries:          U("1578985545062-69928b1d9587"),
    // Mexican
    tacos:          U("1565299624946-b28f40a0ae38"),
    tacos2:         U("1552332386-f8dd00dc2f85"),
    quesadilla:     U("1618040996337-56904b7850b9"),
    burrito:        U("1618040996337-56904b7850b9"),
    nachos:         U("1626200419199-391ae4be7a41"),
    guacamole:      U("1521305916504-4a1121188589"),
    // Swiss / French
    roesti:         U("1600628421055-4d30de868b8f"),
    fondue:         U("1541014741259-de529411b96a"),
    // Seafood
    fish:           U("1467003909585-2f8a72700288"),
    seafood:        U("1559737558-2f5a35f4523b"),
    shrimp:         U("1615141982883-c7ad0e69fd62"),
    // Brunch / café
    breakfast:      U("1533089860892-a7c6f0a88666"),
    eggs:           U("1484723091739-30a097e8f929"),
    eggs_benedict:  U("1550317138-10000687a72b"),
    pancakes:       U("1482049016688-2d3e1b311543"),
    avocado_toast:  U("1521305916504-4a1121188589"),
    granola:        U("1490474418585-ba9bad8fd0ea"),
    croissant:      U("1555126634-323283e090fa"),
    churros:        U("1541529086526-db283c563270"),
    // Desserts
    cake:           U("1563805042-7684c019e1cb"),
    cheesecake:     U("1551024506-0bccd828d307"),
    brownie:        U("1551024601-bec78aea704b"),
    chocolate_cake: U("1551024601-bec78aea704b"),
    tiramisu:       U("1607330289024-1535c6b4e1c1"),
    panna_cotta:    U("1563805042-7684c019e1cb"),
    icecream:       U("1563805042-7684c019e1cb"),
    // Drinks
    coffee:         U("1509042239860-f550ce710b93"),
    espresso:       U("1447279506476-3faec8071eee"),
    latte:          U("1495474472287-4d71bcdd2085"),
    cappuccino:     U("1551538827-9c037cb4f32a"),
    tea:            U("1556679343-c7306c1976bc"),
    green_tea:      U("1497534446932-c925b458314e"),
    wine:           U("1510812431401-41d2bd2722f3"),
    wine_white:     U("1553361371-9b22f78e8b1d"),
    beer:           U("1513558161293-cdaf765ed2fd"),
    beer2:          U("1544145945-f90425340c7e"),
    cocktail:       U("1571613316887-6f8d5cbf7ef7"),
    margarita:      U("1621263764928-df1444c5e859"),
    cola:           U("1622483767028-3f66f32aef97"),
    juice:          U("1600271886742-f049cd451bba"),
    orange_juice:   U("1437418747212-8d9709afab22"),
    smoothie:       U("1560508180-03f285f67ded"),
    lassi:          U("1560508180-03f285f67ded"),
};

// ─── Restaurant interiors / food-spread heroes (all verified 200) ────────────
const HERO = {
    sushi:      U("1517248135467-4c7edcad34c4"),
    italian:    U("1414235077428-338989a2e8c0"),
    indian:     U("1590846406792-0adc7f938f1d"),
    burger:     U("1552566626-52f8b828add9"),
    thai:       U("1550966871-3ed3cdb5ed0c"),
    bistro:     U("1424847651672-bf20a4b0982b"),
    lebanese:   U("1428515613728-6b4607e44363"),
    vietnamese: U("1559339352-11d035aa65de"),
    mexican:    U("1544025162-d76694265947"),
    cafe:       U("1466978913421-dad2ebd01d17"),
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface Item { name: string; description: string; price: number; image: string; }
interface Cat { name: string; color: string; icon: string; items: Item[]; }
interface Restaurant {
    id: number;
    businessName: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string;
    password: string;
    licenseKey: string;
    slug: string;
    domain: string;
    branchName: string;
    address: string;
    heroTitle: string;
    heroSubtitle: string;
    heroImage: string;
    headerBgImage: string;
    logomark: string;
    aboutText: string;
    primaryColor: string;
    accentColor: string;
    openingHours: string;
    footerText: string;
    estimatedDeliveryTime: number;
    minDeliveryTime: number;
    maxDeliveryTime: number;
    categories: Cat[];
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── The 10 Zürich restaurants ───────────────────────────────────────────────
const RESTAURANTS: Restaurant[] = [
    // ── 1 · Sushi Zen (Japanese) ─────────────────────────────────────────────
    {
        id: 101,
        businessName: "Sushi Zen",
        ownerName: "Kenji Tanaka",
        ownerEmail: "info@sushizen.ch",
        ownerPhone: "+41 44 251 10 01",
        password: "sushizen123",
        licenseKey: "BARMAGLY-ZRH1-SUSH-0101-2026",
        slug: "sushi-zen-zurich",
        domain: "sushizen.ch",
        branchName: "Sushi Zen – Niederdorf",
        address: "Niederdorfstrasse 22, 8001 Zürich",
        heroTitle: "Sushi Zen",
        heroSubtitle: "Frische Nigiri, Maki & Sashimi im Herzen des Niederdorfs",
        heroImage: IMG.sushi,
        headerBgImage: HERO.sushi,
        logomark: IMG.nigiri,
        aboutText: "Authentische japanische Küche mit täglich frischem Fisch. Unsere Sushi-Meister bereiten Nigiri, Maki und Sashimi nach traditioneller Art zu.",
        primaryColor: "#C53030",
        accentColor: "#1A202C",
        openingHours: "Mo–So: 11:30–14:00 & 17:30–22:30",
        footerText: "© 2026 Sushi Zen · Niederdorf Zürich",
        estimatedDeliveryTime: 35, minDeliveryTime: 25, maxDeliveryTime: 50,
        categories: [
            {
                name: "Nigiri & Sashimi", color: "#C53030", icon: "fish", items: [
                    { name: "Lachs Nigiri (2 Stk)", description: "Frischer Lachs auf Sushi-Reis", price: 8.5, image: IMG.nigiri },
                    { name: "Thunfisch Nigiri (2 Stk)", description: "Roter Thunfisch (Maguro) auf Reis", price: 9.5, image: IMG.nigiri },
                    { name: "Garnelen Nigiri (2 Stk)", description: "Gekochte Garnele auf Sushi-Reis", price: 8.0, image: IMG.nigiri },
                    { name: "Sashimi Mix (12 Stk)", description: "Auswahl von Lachs, Thunfisch und Butterfisch", price: 32.0, image: IMG.sashimi },
                    { name: "Lachs Sashimi (6 Stk)", description: "Sechs Scheiben frischer Lachs", price: 22.0, image: IMG.sashimi },
                ],
            },
            {
                name: "Maki & Rolls", color: "#2B6CB0", icon: "restaurant", items: [
                    { name: "California Roll (8 Stk)", description: "Surimi, Avocado, Gurke, Sesam", price: 16.0, image: IMG.maki },
                    { name: "Spicy Tuna Maki (8 Stk)", description: "Thunfisch mit scharfer Mayo", price: 17.5, image: IMG.maki },
                    { name: "Avocado Maki (6 Stk)", description: "Vegetarische Maki mit Avocado", price: 12.0, image: IMG.maki },
                    { name: "Dragon Roll (8 Stk)", description: "Tempura-Garnele, Avocado, Unagi-Sauce", price: 22.0, image: IMG.maki },
                ],
            },
            {
                name: "Warme Küche", color: "#276749", icon: "restaurant", items: [
                    { name: "Chicken Teriyaki Bowl", description: "Gegrilltes Poulet mit Teriyaki auf Reis", price: 24.0, image: IMG.rice },
                    { name: "Lachs Poke Bowl", description: "Marinierter Lachs, Edamame, Avocado, Reis", price: 26.0, image: IMG.poke },
                    { name: "Miso Ramen", description: "Ramen-Nudeln in würziger Miso-Brühe", price: 23.0, image: IMG.ramen },
                    { name: "Gyoza (5 Stk)", description: "Gebratene Teigtaschen mit Poulet-Füllung", price: 12.0, image: IMG.dumplings },
                    { name: "Chicken Katsu", description: "Paniertes Poulet mit Curry-Sauce und Reis", price: 25.0, image: IMG.chicken },
                ],
            },
            {
                name: "Vorspeisen", color: "#38A169", icon: "leaf", items: [
                    { name: "Miso Suppe", description: "Traditionelle Sojabohnenpasten-Suppe", price: 6.5, image: IMG.miso_soup },
                    { name: "Edamame", description: "Gedämpfte Sojabohnen mit Meersalz", price: 7.5, image: IMG.bowl },
                    { name: "Wakame Salat", description: "Marinierter Algensalat mit Sesam", price: 9.0, image: IMG.salad },
                ],
            },
            {
                name: "Getränke & Dessert", color: "#2C7A7B", icon: "cafe", items: [
                    { name: "Grüner Tee", description: "Japanischer Sencha, heiss", price: 4.5, image: IMG.green_tea },
                    { name: "Sake (100ml)", description: "Japanischer Reiswein, warm serviert", price: 8.0, image: IMG.wine },
                    { name: "Mochi Eis (3 Stk)", description: "Reiskuchen mit Eiscreme-Füllung", price: 9.0, image: IMG.icecream },
                ],
            },
        ],
    },

    // ── 2 · Trattoria Bella Vista (Italian) ──────────────────────────────────
    {
        id: 102,
        businessName: "Trattoria Bella Vista",
        ownerName: "Marco Rossi",
        ownerEmail: "info@bellavista.ch",
        ownerPhone: "+41 44 241 20 02",
        password: "bellavista123",
        licenseKey: "BARMAGLY-ZRH1-BELL-0102-2026",
        slug: "trattoria-bella-vista-zurich",
        domain: "bellavista.ch",
        branchName: "Trattoria Bella Vista – Langstrasse",
        address: "Langstrasse 88, 8004 Zürich",
        heroTitle: "Trattoria Bella Vista",
        heroSubtitle: "Hausgemachte Pasta & Pizza aus dem Holzofen",
        heroImage: IMG.pasta,
        headerBgImage: HERO.italian,
        logomark: IMG.pizza,
        aboutText: "Ein Stück Italien an der Langstrasse. Wir kochen mit Leidenschaft und den besten Zutaten aus Italien – von hausgemachter Pasta bis zur Pizza aus dem Holzofen.",
        primaryColor: "#276749",
        accentColor: "#C53030",
        openingHours: "Mo–Sa: 11:00–23:00 · So: 17:00–22:30",
        footerText: "© 2026 Trattoria Bella Vista · Langstrasse Zürich",
        estimatedDeliveryTime: 40, minDeliveryTime: 30, maxDeliveryTime: 55,
        categories: [
            {
                name: "Antipasti", color: "#38A169", icon: "leaf", items: [
                    { name: "Bruschetta", description: "Geröstetes Brot mit Tomaten, Basilikum, Knoblauch", price: 11.0, image: IMG.caprese },
                    { name: "Insalata Caprese", description: "Büffelmozzarella, Tomaten, Basilikum", price: 14.0, image: IMG.caprese },
                    { name: "Vitello Tonnato", description: "Kalbfleisch mit Thunfischsauce", price: 16.0, image: IMG.plated },
                    { name: "Minestrone", description: "Klassische italienische Gemüsesuppe", price: 9.5, image: IMG.soup },
                ],
            },
            {
                name: "Pasta", color: "#D69E2E", icon: "restaurant", items: [
                    { name: "Spaghetti Carbonara", description: "Speck, Ei, Pecorino, schwarzer Pfeffer", price: 22.0, image: IMG.pasta },
                    { name: "Penne all'Arrabbiata", description: "Scharfe Tomatensauce mit Knoblauch und Chili", price: 20.0, image: IMG.pasta },
                    { name: "Lasagne al Forno", description: "Hausgemachte Lasagne mit Rindsragù", price: 24.0, image: IMG.pasta_cheese },
                    { name: "Tagliatelle al Ragù", description: "Bandnudeln mit Bologneser Fleischsauce", price: 25.0, image: IMG.pasta },
                    { name: "Gnocchi Gorgonzola", description: "Kartoffelgnocchi in cremiger Gorgonzolasauce", price: 23.0, image: IMG.pasta_cheese },
                ],
            },
            {
                name: "Pizza", color: "#E53E3E", icon: "pizza", items: [
                    { name: "Pizza Margherita", description: "Tomaten, Mozzarella, frisches Basilikum", price: 17.0, image: IMG.pizza },
                    { name: "Pizza Diavola", description: "Scharfe Salami, Peperoncini, Mozzarella", price: 21.0, image: IMG.pizza },
                    { name: "Pizza Quattro Formaggi", description: "Vier-Käse: Mozzarella, Gorgonzola, Parmesan, Fontina", price: 22.0, image: IMG.pizza },
                ],
            },
            {
                name: "Secondi", color: "#C05621", icon: "restaurant", items: [
                    { name: "Saltimbocca alla Romana", description: "Kalbsschnitzel mit Salbei und Rohschinken", price: 34.0, image: IMG.steak2 },
                    { name: "Ossobuco", description: "Geschmorte Kalbshaxe mit Gremolata", price: 36.0, image: IMG.steak3 },
                ],
            },
            {
                name: "Dolci & Getränke", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Tiramisù", description: "Mascarpone, Espresso, Löffelbiskuit", price: 9.0, image: IMG.tiramisu },
                    { name: "Panna Cotta", description: "Sahnedessert mit Beerencoulis", price: 8.5, image: IMG.panna_cotta },
                    { name: "Espresso", description: "Italienischer Espresso", price: 4.5, image: IMG.espresso },
                    { name: "Rotwein Chianti (1dl)", description: "Toskanischer Rotwein im Glas", price: 7.5, image: IMG.wine },
                ],
            },
        ],
    },

    // ── 3 · Bombay Palace (Indian) ───────────────────────────────────────────
    {
        id: 103,
        businessName: "Bombay Palace",
        ownerName: "Rajesh Kumar",
        ownerEmail: "info@bombaypalace.ch",
        ownerPhone: "+41 44 291 30 03",
        password: "bombay123",
        licenseKey: "BARMAGLY-ZRH1-BOMB-0103-2026",
        slug: "bombay-palace-zurich",
        domain: "bombaypalace.ch",
        branchName: "Bombay Palace – Militärstrasse",
        address: "Militärstrasse 12, 8004 Zürich",
        heroTitle: "Bombay Palace",
        heroSubtitle: "Authentische indische Tandoori, Curries & Biryani",
        heroImage: IMG.curry,
        headerBgImage: HERO.indian,
        logomark: IMG.tandoori,
        aboutText: "Erleben Sie die Aromen Indiens. Unsere Gerichte werden mit frisch gemahlenen Gewürzen und im traditionellen Tandoori-Ofen zubereitet.",
        primaryColor: "#C05621",
        accentColor: "#276749",
        openingHours: "Mo–So: 11:30–14:30 & 17:30–23:00",
        footerText: "© 2026 Bombay Palace · Militärstrasse Zürich",
        estimatedDeliveryTime: 40, minDeliveryTime: 30, maxDeliveryTime: 55,
        categories: [
            {
                name: "Vorspeisen", color: "#38A169", icon: "leaf", items: [
                    { name: "Samosa (2 Stk)", description: "Frittierte Teigtaschen mit Gemüsefüllung", price: 9.0, image: IMG.samosa },
                    { name: "Onion Bhaji", description: "Knusprige Zwiebelbällchen aus Kichererbsenmehl", price: 8.5, image: IMG.samosa },
                    { name: "Papadam mit Chutney", description: "Knusprige Linsen-Cracker mit Mango-Chutney", price: 6.5, image: IMG.naan },
                ],
            },
            {
                name: "Tandoori", color: "#C05621", icon: "flame", items: [
                    { name: "Tandoori Chicken", description: "Mariniertes Poulet aus dem Tandoori-Ofen", price: 26.0, image: IMG.tandoori },
                    { name: "Chicken Tikka", description: "Gegrillte Pouletwürfel in Joghurt-Gewürzmarinade", price: 24.0, image: IMG.tandoori },
                    { name: "Seekh Kebab", description: "Gewürztes Lammhackfleisch am Spiess", price: 25.0, image: IMG.kebab },
                ],
            },
            {
                name: "Curries", color: "#D69E2E", icon: "restaurant", items: [
                    { name: "Butter Chicken", description: "Poulet in cremiger Tomaten-Butter-Sauce", price: 27.0, image: IMG.curry },
                    { name: "Chicken Tikka Masala", description: "Pouletwürfel in würziger Masala-Sauce", price: 26.0, image: IMG.curry2 },
                    { name: "Lamm Rogan Josh", description: "Zartes Lamm in aromatischer Curry-Sauce", price: 29.0, image: IMG.curry },
                    { name: "Palak Paneer", description: "Frischkäse in cremigem Spinat-Curry", price: 23.0, image: IMG.curry2 },
                    { name: "Dal Makhani", description: "Schwarze Linsen in Butter und Sahne", price: 20.0, image: IMG.curry },
                ],
            },
            {
                name: "Biryani & Reis", color: "#276749", icon: "restaurant", items: [
                    { name: "Chicken Biryani", description: "Basmati-Reis mit Poulet und Safran", price: 25.0, image: IMG.biryani },
                    { name: "Gemüse Biryani", description: "Aromatischer Reis mit Saisongemüse", price: 22.0, image: IMG.biryani },
                    { name: "Basmati Reis", description: "Gedämpfter Basmati-Reis", price: 6.0, image: IMG.rice },
                ],
            },
            {
                name: "Naan & Dessert", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Butter Naan", description: "Fladenbrot aus dem Tandoori-Ofen mit Butter", price: 5.5, image: IMG.naan },
                    { name: "Garlic Naan", description: "Naan mit frischem Knoblauch und Koriander", price: 6.5, image: IMG.naan },
                    { name: "Mango Lassi", description: "Erfrischendes Joghurtgetränk mit Mango", price: 6.5, image: IMG.lassi },
                    { name: "Gulab Jamun", description: "In Sirup getränkte Milchbällchen", price: 7.5, image: IMG.cake },
                ],
            },
        ],
    },

    // ── 4 · Zürich Burger Co. (Burgers / American) ───────────────────────────
    {
        id: 104,
        businessName: "Zürich Burger Co.",
        ownerName: "Luca Meier",
        ownerEmail: "info@zurichburger.ch",
        ownerPhone: "+41 44 271 40 04",
        password: "burger123",
        licenseKey: "BARMAGLY-ZRH1-BURG-0104-2026",
        slug: "zurich-burger-co",
        domain: "zurichburger.ch",
        branchName: "Zürich Burger Co. – Europaallee",
        address: "Europaallee 21, 8004 Zürich",
        heroTitle: "Zürich Burger Co.",
        heroSubtitle: "Handgemachte Burger aus Schweizer Rindfleisch",
        heroImage: IMG.burger,
        headerBgImage: HERO.burger,
        logomark: IMG.cheeseburger,
        aboutText: "Saftige Burger aus 100% Schweizer Rindfleisch, hausgemachte Saucen und knusprige Pommes. Frisch gegrillt, direkt an der Europaallee.",
        primaryColor: "#C53030",
        accentColor: "#D69E2E",
        openingHours: "Mo–So: 11:00–23:00",
        footerText: "© 2026 Zürich Burger Co. · Europaallee",
        estimatedDeliveryTime: 30, minDeliveryTime: 20, maxDeliveryTime: 45,
        categories: [
            {
                name: "Burgers", color: "#C53030", icon: "fast-food", items: [
                    { name: "Classic Cheeseburger", description: "Rindfleisch, Cheddar, Salat, Tomate, Burgersauce", price: 18.5, image: IMG.cheeseburger },
                    { name: "Double Bacon Burger", description: "Doppeltes Rindfleisch, knuspriger Speck, Cheddar", price: 24.0, image: IMG.burger_deluxe },
                    { name: "Zürich Signature Burger", description: "Rindfleisch, Raclettekäse, karamellisierte Zwiebeln", price: 25.0, image: IMG.burger },
                    { name: "Veggie Burger", description: "Hausgemachtes Gemüse-Patty mit Avocado", price: 19.5, image: IMG.burger },
                    { name: "Spicy Jalapeño Burger", description: "Rindfleisch, Jalapeños, Pepperjack, scharfe Mayo", price: 21.0, image: IMG.cheeseburger },
                ],
            },
            {
                name: "Sides", color: "#D69E2E", icon: "restaurant", items: [
                    { name: "Pommes Frites", description: "Knusprige Pommes mit Meersalz", price: 8.0, image: IMG.fries },
                    { name: "Süsskartoffel Pommes", description: "Süsskartoffel-Pommes mit Chipotle-Dip", price: 10.0, image: IMG.fries },
                    { name: "Onion Rings", description: "Frittierte Zwiebelringe im Bierteig", price: 9.0, image: IMG.fries },
                    { name: "Coleslaw", description: "Cremiger Krautsalat", price: 6.5, image: IMG.salad },
                ],
            },
            {
                name: "Chicken", color: "#276749", icon: "restaurant", items: [
                    { name: "Crispy Chicken Burger", description: "Knuspriges Pouletfilet, Salat, Honig-Senf", price: 20.0, image: IMG.chicken },
                    { name: "Chicken Wings (8 Stk)", description: "Marinierte Pouletflügel mit BBQ-Sauce", price: 16.0, image: IMG.wings },
                    { name: "Chicken Tenders", description: "Panierte Pouletstreifen mit Dip", price: 15.0, image: IMG.chicken },
                ],
            },
            {
                name: "Desserts", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "New York Cheesecake", description: "Cremiger Käsekuchen mit Beerensauce", price: 9.5, image: IMG.cheesecake },
                    { name: "Brownie mit Eis", description: "Warmer Schokoladenbrownie mit Vanilleeis", price: 10.0, image: IMG.brownie },
                ],
            },
            {
                name: "Getränke", color: "#2C7A7B", icon: "cafe", items: [
                    { name: "Cola", description: "Coca-Cola 0.5l", price: 4.5, image: IMG.cola },
                    { name: "Craft Beer", description: "Lokales Zürcher Craft Beer 0.33l", price: 7.5, image: IMG.beer },
                    { name: "Milkshake", description: "Hausgemachter Shake (Vanille/Schoko/Erdbeer)", price: 8.0, image: IMG.smoothie },
                ],
            },
        ],
    },

    // ── 5 · Bangkok Thai House (Thai) ────────────────────────────────────────
    {
        id: 105,
        businessName: "Bangkok Thai House",
        ownerName: "Somchai Phan",
        ownerEmail: "info@bangkokthai.ch",
        ownerPhone: "+41 44 252 50 05",
        password: "bangkok123",
        licenseKey: "BARMAGLY-ZRH1-BANG-0105-2026",
        slug: "bangkok-thai-house-zurich",
        domain: "bangkokthai.ch",
        branchName: "Bangkok Thai House – Zähringerstrasse",
        address: "Zähringerstrasse 41, 8001 Zürich",
        heroTitle: "Bangkok Thai House",
        heroSubtitle: "Authentische thailändische Currys, Woks & Suppen",
        heroImage: IMG.thai_food,
        headerBgImage: HERO.thai,
        logomark: IMG.thai_curry,
        aboutText: "Original thailändische Küche mitten in Zürich. Wir verwenden frische Kräuter, Zitronengras und hausgemachte Currypasten für authentische Aromen.",
        primaryColor: "#276749",
        accentColor: "#D69E2E",
        openingHours: "Mo–So: 11:30–14:30 & 17:30–22:30",
        footerText: "© 2026 Bangkok Thai House · Zürich",
        estimatedDeliveryTime: 40, minDeliveryTime: 30, maxDeliveryTime: 55,
        categories: [
            {
                name: "Vorspeisen", color: "#38A169", icon: "leaf", items: [
                    { name: "Frühlingsrollen (4 Stk)", description: "Knusprige Rollen mit Gemüse und süsser Chilisauce", price: 10.0, image: IMG.spring_rolls },
                    { name: "Satay Gai", description: "Hähnchenspiesse mit Erdnusssauce", price: 13.0, image: IMG.kebab },
                    { name: "Thai Fischcakes", description: "Frittierte Fischküchlein mit Gurkendip", price: 12.0, image: IMG.fish },
                ],
            },
            {
                name: "Suppen", color: "#C05621", icon: "restaurant", items: [
                    { name: "Tom Yum Goong", description: "Scharf-saure Suppe mit Garnelen und Zitronengras", price: 14.0, image: IMG.tom_yum },
                    { name: "Tom Kha Gai", description: "Kokossuppe mit Poulet und Galgant", price: 13.0, image: IMG.soup2 },
                ],
            },
            {
                name: "Currys", color: "#276749", icon: "restaurant", items: [
                    { name: "Grünes Curry (Gaeng Keow Wan)", description: "Grünes Curry mit Poulet, Bambus und Basilikum", price: 24.0, image: IMG.thai_curry },
                    { name: "Rotes Curry", description: "Rotes Curry mit Rindfleisch und Gemüse", price: 24.0, image: IMG.thai_curry },
                    { name: "Massaman Curry", description: "Mildes Curry mit Rind, Kartoffeln und Erdnüssen", price: 26.0, image: IMG.curry },
                ],
            },
            {
                name: "Wok & Nudeln", color: "#D69E2E", icon: "restaurant", items: [
                    { name: "Pad Thai", description: "Gebratene Reisnudeln mit Ei, Tofu und Erdnüssen", price: 22.0, image: IMG.pad_thai },
                    { name: "Pad See Ew", description: "Breite Reisnudeln mit Ei und Brokkoli", price: 21.0, image: IMG.noodles },
                    { name: "Khao Pad", description: "Gebratener Reis mit Gemüse und Poulet", price: 20.0, image: IMG.rice },
                    { name: "Rindfleisch mit Basilikum", description: "Wok-Rindfleisch mit Thai-Basilikum, scharf", price: 25.0, image: IMG.thai_food },
                ],
            },
            {
                name: "Dessert & Getränke", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Mango Sticky Rice", description: "Klebreis mit frischer Mango und Kokosmilch", price: 10.0, image: IMG.cake },
                    { name: "Thai Eistee", description: "Süsser thailändischer Eistee mit Kondensmilch", price: 5.5, image: IMG.tea },
                    { name: "Singha Bier", description: "Thailändisches Lagerbier 0.33l", price: 6.5, image: IMG.beer2 },
                ],
            },
        ],
    },

    // ── 6 · Le Bistrot Suisse (Swiss / French) ───────────────────────────────
    {
        id: 106,
        businessName: "Le Bistrot Suisse",
        ownerName: "Pierre Dubois",
        ownerEmail: "info@bistrotsuisse.ch",
        ownerPhone: "+41 44 211 60 06",
        password: "bistrot123",
        licenseKey: "BARMAGLY-ZRH1-BIST-0106-2026",
        slug: "le-bistrot-suisse-zurich",
        domain: "bistrotsuisse.ch",
        branchName: "Le Bistrot Suisse – Rennweg",
        address: "Rennweg 7, 8001 Zürich",
        heroTitle: "Le Bistrot Suisse",
        heroSubtitle: "Schweizer Klassiker & französische Bistro-Küche",
        heroImage: IMG.steak2,
        headerBgImage: HERO.bistro,
        logomark: IMG.steak,
        aboutText: "Ein charmantes Bistro am Rennweg mit Schweizer Spezialitäten wie Zürcher Geschnetzeltem und Käsefondue sowie feiner französischer Küche.",
        primaryColor: "#9B2C2C",
        accentColor: "#2C5282",
        openingHours: "Mo–Sa: 11:30–14:30 & 18:00–23:00 · So geschlossen",
        footerText: "© 2026 Le Bistrot Suisse · Rennweg Zürich",
        estimatedDeliveryTime: 45, minDeliveryTime: 35, maxDeliveryTime: 60,
        categories: [
            {
                name: "Entrées", color: "#38A169", icon: "leaf", items: [
                    { name: "Französische Zwiebelsuppe", description: "Gratinierte Zwiebelsuppe mit Käsecroûton", price: 12.0, image: IMG.soup },
                    { name: "Salade Niçoise", description: "Salat mit Thunfisch, Ei, Oliven und Bohnen", price: 16.0, image: IMG.salad },
                    { name: "Escargots (6 Stk)", description: "Weinbergschnecken in Kräuterbutter", price: 15.0, image: IMG.plated },
                ],
            },
            {
                name: "Schweizer Klassiker", color: "#C05621", icon: "restaurant", items: [
                    { name: "Zürcher Geschnetzeltes mit Rösti", description: "Kalbsgeschnetzeltes an Rahmsauce mit Rösti", price: 32.0, image: IMG.roesti },
                    { name: "Käsefondue (pro Person)", description: "Traditionelles Fondue Moitié-Moitié", price: 28.0, image: IMG.fondue },
                    { name: "Raclette Teller", description: "Geschmolzener Raclettekäse mit Kartoffeln und Gurken", price: 29.0, image: IMG.fondue },
                ],
            },
            {
                name: "Plats", color: "#276749", icon: "restaurant", items: [
                    { name: "Entrecôte Café de Paris", description: "Rindsentrecôte mit Kräuterbutter und Pommes", price: 38.0, image: IMG.steak },
                    { name: "Coq au Vin", description: "In Rotwein geschmortes Poulet mit Champignons", price: 30.0, image: IMG.grilled_chicken },
                    { name: "Filet de Bœuf", description: "Rinderfilet mit Rotweinjus und Gratin", price: 36.0, image: IMG.steak2 },
                    { name: "Lammkoteletts", description: "Gegrillte Lammkoteletts mit Kräuterkruste", price: 35.0, image: IMG.steak3 },
                ],
            },
            {
                name: "Desserts", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Crème Brûlée", description: "Vanillecreme mit karamellisierter Zuckerkruste", price: 11.0, image: IMG.panna_cotta },
                    { name: "Mousse au Chocolat", description: "Luftige dunkle Schokoladenmousse", price: 9.5, image: IMG.chocolate_cake },
                ],
            },
            {
                name: "Vins & Boissons", color: "#6B46C1", icon: "wine", items: [
                    { name: "Rotwein Pinot Noir (1dl)", description: "Schweizer Pinot Noir im Glas", price: 8.0, image: IMG.wine },
                    { name: "Weisswein Chasselas (1dl)", description: "Waadtländer Weisswein im Glas", price: 7.5, image: IMG.wine_white },
                    { name: "Espresso", description: "Kräftiger Espresso", price: 4.5, image: IMG.espresso },
                ],
            },
        ],
    },

    // ── 7 · Beirut Mezze (Lebanese) ──────────────────────────────────────────
    {
        id: 107,
        businessName: "Beirut Mezze",
        ownerName: "Karim Haddad",
        ownerEmail: "info@beirutmezze.ch",
        ownerPhone: "+41 44 271 70 07",
        password: "beirut123",
        licenseKey: "BARMAGLY-ZRH1-BEIR-0107-2026",
        slug: "beirut-mezze-zurich",
        domain: "beirutmezze.ch",
        branchName: "Beirut Mezze – Josefstrasse",
        address: "Josefstrasse 102, 8005 Zürich",
        heroTitle: "Beirut Mezze",
        heroSubtitle: "Libanesische Mezze, Grillspezialitäten & Baklava",
        heroImage: IMG.mezze,
        headerBgImage: HERO.lebanese,
        logomark: IMG.hummus,
        aboutText: "Geniessen Sie die Gastfreundschaft des Libanons mit einer reichen Auswahl an warmen und kalten Mezze, frisch gegrilltem Fleisch und hausgemachtem Baklava.",
        primaryColor: "#276749",
        accentColor: "#C05621",
        openingHours: "Mo–So: 11:30–23:00",
        footerText: "© 2026 Beirut Mezze · Josefstrasse Zürich",
        estimatedDeliveryTime: 40, minDeliveryTime: 30, maxDeliveryTime: 55,
        categories: [
            {
                name: "Kalte Mezze", color: "#38A169", icon: "leaf", items: [
                    { name: "Hummus", description: "Kichererbsenpüree mit Tahini und Olivenöl", price: 9.0, image: IMG.hummus },
                    { name: "Baba Ghanoush", description: "Geräuchertes Auberginenpüree mit Tahini", price: 9.5, image: IMG.hummus },
                    { name: "Tabbouleh", description: "Petersiliensalat mit Bulgur, Tomaten und Minze", price: 10.0, image: IMG.tabbouleh },
                    { name: "Fattoush Salat", description: "Gemischter Salat mit frittiertem Fladenbrot und Sumak", price: 11.0, image: IMG.salad },
                ],
            },
            {
                name: "Warme Mezze", color: "#C05621", icon: "flame", items: [
                    { name: "Falafel (6 Stk)", description: "Frittierte Kichererbsenbällchen mit Tahini", price: 11.0, image: IMG.falafel },
                    { name: "Käse Sambousek", description: "Frittierte Teigtaschen mit Käsefüllung", price: 10.0, image: IMG.samosa },
                    { name: "Grillhalloumi", description: "Gegrillter Halloumi-Käse mit Zaatar", price: 12.0, image: IMG.mezze },
                ],
            },
            {
                name: "Grill", color: "#276749", icon: "restaurant", items: [
                    { name: "Shish Taouk", description: "Marinierte Pouletspiesse mit Knoblauchsauce", price: 26.0, image: IMG.grilled_chicken },
                    { name: "Lamm Kofta", description: "Gewürzte Lammhackspiesse vom Grill", price: 27.0, image: IMG.kebab },
                    { name: "Gemischte Grillplatte", description: "Auswahl von Shish Taouk, Kofta und Lammspiessen", price: 34.0, image: IMG.mezze },
                    { name: "Shawarma Teller", description: "Mariniertes Fleisch mit Reis und Salat", price: 25.0, image: IMG.shawarma },
                ],
            },
            {
                name: "Dessert", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Baklava (4 Stk)", description: "Blätterteig mit Pistazien und Honigsirup", price: 9.0, image: IMG.baklava },
                    { name: "Muhalabia", description: "Libanesischer Milchpudding mit Rosenwasser", price: 8.0, image: IMG.panna_cotta },
                ],
            },
            {
                name: "Getränke", color: "#2C7A7B", icon: "cafe", items: [
                    { name: "Ayran", description: "Erfrischendes Joghurtgetränk", price: 4.5, image: IMG.lassi },
                    { name: "Libanesischer Wein (1dl)", description: "Rotwein aus dem Bekaa-Tal", price: 8.0, image: IMG.wine },
                    { name: "Minztee", description: "Frischer Minztee, heiss", price: 5.0, image: IMG.tea },
                ],
            },
        ],
    },

    // ── 8 · Pho Saigon (Vietnamese) ──────────────────────────────────────────
    {
        id: 108,
        businessName: "Pho Saigon",
        ownerName: "Nguyen Van An",
        ownerEmail: "info@phosaigon.ch",
        ownerPhone: "+41 44 291 80 08",
        password: "phosaigon123",
        licenseKey: "BARMAGLY-ZRH1-PHOS-0108-2026",
        slug: "pho-saigon-zurich",
        domain: "phosaigon.ch",
        branchName: "Pho Saigon – Badenerstrasse",
        address: "Badenerstrasse 156, 8004 Zürich",
        heroTitle: "Pho Saigon",
        heroSubtitle: "Dampfende Pho, frische Sommerrollen & Bánh Mì",
        heroImage: IMG.pho,
        headerBgImage: HERO.vietnamese,
        logomark: IMG.noodles,
        aboutText: "Vietnamesische Straßenküche in Zürich. Unsere Pho-Brühe köchelt 12 Stunden, unsere Kräuter sind täglich frisch – für ein authentisches Saigon-Erlebnis.",
        primaryColor: "#C05621",
        accentColor: "#276749",
        openingHours: "Mo–So: 11:00–22:00",
        footerText: "© 2026 Pho Saigon · Badenerstrasse Zürich",
        estimatedDeliveryTime: 35, minDeliveryTime: 25, maxDeliveryTime: 50,
        categories: [
            {
                name: "Vorspeisen", color: "#38A169", icon: "leaf", items: [
                    { name: "Sommerrollen (Gỏi cuốn)", description: "Frische Reispapierrollen mit Garnelen und Kräutern", price: 11.0, image: IMG.spring_rolls },
                    { name: "Frühlingsrollen (Chả giò)", description: "Knusprige frittierte Rollen mit Schweinefleisch", price: 10.0, image: IMG.spring_rolls },
                    { name: "Gyoza", description: "Gebratene Teigtaschen mit Dip", price: 10.5, image: IMG.dumplings },
                ],
            },
            {
                name: "Pho & Suppen", color: "#C05621", icon: "restaurant", items: [
                    { name: "Pho Bò", description: "Rindfleisch-Nudelsuppe mit frischen Kräutern", price: 22.0, image: IMG.pho },
                    { name: "Pho Gà", description: "Poulet-Nudelsuppe in aromatischer Brühe", price: 21.0, image: IMG.pho },
                    { name: "Bún Bò Huế", description: "Scharfe Nudelsuppe nach Huế-Art", price: 23.0, image: IMG.pho },
                ],
            },
            {
                name: "Bowls & Reis", color: "#276749", icon: "restaurant", items: [
                    { name: "Bún Thịt Nướng", description: "Reisnudelsalat mit gegrilltem Schweinefleisch", price: 21.0, image: IMG.bowl },
                    { name: "Com Tấm", description: "Gebrochener Reis mit gegrilltem Schweinefleisch", price: 22.0, image: IMG.rice },
                    { name: "Vegetarische Buddha Bowl", description: "Reis, Tofu, Gemüse und Erdnusssauce", price: 20.0, image: IMG.poke },
                ],
            },
            {
                name: "Nudeln & Sandwich", color: "#D69E2E", icon: "restaurant", items: [
                    { name: "Bánh Mì Sandwich", description: "Baguette mit Fleisch, Pickles und Koriander", price: 14.0, image: IMG.sandwich },
                    { name: "Gebratene Nudeln mit Rind", description: "Wok-Nudeln mit Rindfleisch und Gemüse", price: 23.0, image: IMG.noodles },
                    { name: "Pad-Style Reisnudeln", description: "Gebratene Reisnudeln mit Ei und Sprossen", price: 21.0, image: IMG.noodles2 },
                ],
            },
            {
                name: "Getränke & Dessert", color: "#2C7A7B", icon: "cafe", items: [
                    { name: "Vietnamesischer Eiskaffee", description: "Cà phê sữa đá mit Kondensmilch", price: 6.5, image: IMG.coffee },
                    { name: "Frische Kokosnuss", description: "Junge Kokosnuss mit Trinkhalm", price: 6.0, image: IMG.juice },
                    { name: "Chè", description: "Süsses Dessert mit Kokosmilch und Bohnen", price: 8.0, image: IMG.cake },
                ],
            },
        ],
    },

    // ── 9 · El Mariachi (Mexican) ────────────────────────────────────────────
    {
        id: 109,
        businessName: "El Mariachi",
        ownerName: "Carlos Hernández",
        ownerEmail: "info@elmariachi.ch",
        ownerPhone: "+41 44 241 90 09",
        password: "mariachi123",
        licenseKey: "BARMAGLY-ZRH1-MARI-0109-2026",
        slug: "el-mariachi-zurich",
        domain: "elmariachi.ch",
        branchName: "El Mariachi – Stauffacherstrasse",
        address: "Stauffacherstrasse 60, 8004 Zürich",
        heroTitle: "El Mariachi",
        heroSubtitle: "Tacos, Burritos & Margaritas – ¡Viva México!",
        heroImage: IMG.tacos,
        headerBgImage: HERO.mexican,
        logomark: IMG.quesadilla,
        aboutText: "Lebendige mexikanische Küche mit hausgemachten Tortillas, frischer Guacamole und feurigen Salsas. Dazu die besten Margaritas der Stadt.",
        primaryColor: "#C05621",
        accentColor: "#276749",
        openingHours: "Mo–So: 12:00–23:00",
        footerText: "© 2026 El Mariachi · Stauffacherstrasse Zürich",
        estimatedDeliveryTime: 35, minDeliveryTime: 25, maxDeliveryTime: 50,
        categories: [
            {
                name: "Antojitos", color: "#38A169", icon: "leaf", items: [
                    { name: "Guacamole mit Nachos", description: "Frische Guacamole mit knusprigen Tortilla-Chips", price: 12.0, image: IMG.guacamole },
                    { name: "Quesadilla", description: "Gefüllte Tortilla mit Käse und Poulet", price: 14.0, image: IMG.quesadilla },
                    { name: "Jalapeño Poppers", description: "Frittierte Jalapeños mit Frischkäsefüllung", price: 11.0, image: IMG.nachos },
                ],
            },
            {
                name: "Tacos & Burritos", color: "#C05621", icon: "fast-food", items: [
                    { name: "Tacos al Pastor (3 Stk)", description: "Marinierter Schweinebauch mit Ananas und Koriander", price: 18.0, image: IMG.tacos },
                    { name: "Tacos de Carnitas (3 Stk)", description: "Zart geschmortes Schweinefleisch", price: 18.0, image: IMG.tacos2 },
                    { name: "Burrito Grande", description: "Grosser Burrito mit Rindfleisch, Reis und Bohnen", price: 22.0, image: IMG.burrito },
                    { name: "Veggie Burrito", description: "Burrito mit Gemüse, Bohnen und Guacamole", price: 19.0, image: IMG.burrito },
                ],
            },
            {
                name: "Hauptgerichte", color: "#276749", icon: "restaurant", items: [
                    { name: "Enchiladas Verdes", description: "Überbackene Tortillas mit grüner Salsa", price: 24.0, image: IMG.quesadilla },
                    { name: "Fajitas de Pollo", description: "Gegrilltes Poulet mit Paprika und Tortillas", price: 26.0, image: IMG.grilled_chicken },
                    { name: "Chili con Carne", description: "Würziger Bohnen-Rindfleisch-Eintopf", price: 22.0, image: IMG.nachos },
                ],
            },
            {
                name: "Dessert", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Churros mit Schokolade", description: "Frittierte Teigstangen mit Schokoladensauce", price: 9.5, image: IMG.churros },
                    { name: "Flan", description: "Mexikanischer Karamellpudding", price: 8.5, image: IMG.panna_cotta },
                ],
            },
            {
                name: "Getränke", color: "#6B46C1", icon: "wine", items: [
                    { name: "Margarita", description: "Klassische Margarita mit Tequila und Limette", price: 13.0, image: IMG.margarita },
                    { name: "Corona Bier", description: "Mexikanisches Lagerbier mit Limette", price: 6.5, image: IMG.beer },
                    { name: "Horchata", description: "Süsses Reisgetränk mit Zimt", price: 5.5, image: IMG.smoothie },
                ],
            },
        ],
    },

    // ── 10 · Kraftwerk Coffee & Brunch (Café / Brunch) ───────────────────────
    {
        id: 110,
        businessName: "Kraftwerk Coffee & Brunch",
        ownerName: "Sarah Keller",
        ownerEmail: "info@kraftwerkcoffee.ch",
        ownerPhone: "+41 44 272 10 10",
        password: "kraftwerk123",
        licenseKey: "BARMAGLY-ZRH1-KRAF-0110-2026",
        slug: "kraftwerk-coffee-brunch-zurich",
        domain: "kraftwerkcoffee.ch",
        branchName: "Kraftwerk Coffee & Brunch – Viadukt",
        address: "Viadukt 12, 8005 Zürich",
        heroTitle: "Kraftwerk Coffee & Brunch",
        heroSubtitle: "All-Day-Brunch, Specialty Coffee & Healthy Bowls",
        heroImage: IMG.breakfast,
        headerBgImage: HERO.cafe,
        logomark: IMG.coffee,
        aboutText: "Dein Lieblingsort für Brunch unter den Viadukt-Bögen. Specialty Coffee, frische Bowls und herzhafte Frühstücksklassiker – den ganzen Tag serviert.",
        primaryColor: "#B7791F",
        accentColor: "#276749",
        openingHours: "Mo–Fr: 07:30–17:00 · Sa–So: 08:30–17:00",
        footerText: "© 2026 Kraftwerk Coffee & Brunch · Im Viadukt Zürich",
        estimatedDeliveryTime: 30, minDeliveryTime: 20, maxDeliveryTime: 45,
        categories: [
            {
                name: "Frühstück", color: "#C05621", icon: "cafe", items: [
                    { name: "Eggs Benedict", description: "Pochierte Eier, Sauce Hollandaise auf English Muffin", price: 18.0, image: IMG.eggs_benedict },
                    { name: "Avocado Toast", description: "Sauerteigbrot mit Avocado, Ei und Chili-Flocken", price: 16.0, image: IMG.avocado_toast },
                    { name: "Pancakes Stack", description: "Fluffige Pancakes mit Ahornsirup und Beeren", price: 15.0, image: IMG.pancakes },
                    { name: "French Toast", description: "Gebackenes Brioche mit Puderzucker und Früchten", price: 15.5, image: IMG.pancakes },
                ],
            },
            {
                name: "Brunch Klassiker", color: "#276749", icon: "restaurant", items: [
                    { name: "Full English Breakfast", description: "Eier, Speck, Würstchen, Bohnen, Toast", price: 22.0, image: IMG.breakfast },
                    { name: "Shakshuka", description: "Pochierte Eier in würziger Tomatensauce", price: 17.0, image: IMG.eggs },
                    { name: "Croque Madame", description: "Überbackenes Schinken-Käse-Sandwich mit Spiegelei", price: 16.5, image: IMG.sandwich },
                ],
            },
            {
                name: "Bowls & Healthy", color: "#38A169", icon: "leaf", items: [
                    { name: "Açaí Bowl", description: "Açaí, Banane, Granola und frische Früchte", price: 14.0, image: IMG.smoothie },
                    { name: "Granola & Joghurt", description: "Hausgemachtes Granola mit Joghurt und Honig", price: 12.0, image: IMG.granola },
                    { name: "Poke Bowl", description: "Reis, Lachs, Edamame, Avocado und Sesam", price: 18.0, image: IMG.poke },
                ],
            },
            {
                name: "Kaffee & Getränke", color: "#2C7A7B", icon: "cafe", items: [
                    { name: "Cappuccino", description: "Espresso mit cremigem Milchschaum", price: 5.0, image: IMG.cappuccino },
                    { name: "Flat White", description: "Doppelter Espresso mit samtiger Milch", price: 5.5, image: IMG.latte },
                    { name: "Frisch gepresster O-Saft", description: "Frisch gepresster Orangensaft", price: 6.5, image: IMG.orange_juice },
                    { name: "Matcha Latte", description: "Japanischer Matcha mit aufgeschäumter Milch", price: 6.0, image: IMG.green_tea },
                ],
            },
            {
                name: "Süsses", color: "#B7791F", icon: "ice-cream", items: [
                    { name: "Butter Croissant", description: "Frisch gebackenes Buttercroissant", price: 4.5, image: IMG.croissant },
                    { name: "Karottenkuchen", description: "Hausgemachter Rüeblikuchen mit Frischkäse-Frosting", price: 8.0, image: IMG.cake },
                    { name: "Cheesecake", description: "Cremiger New-York-Cheesecake", price: 8.5, image: IMG.cheesecake },
                ],
            },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Seeder — idempotent per restaurant (skips if landing-page slug already set)
// ─────────────────────────────────────────────────────────────────────────────
export async function seedZurichRestaurants() {
    console.log(`[ZURICH] Seeding ${RESTAURANTS.length} Zürich restaurants...`);

    // Give the existing Pizza Lemon store a cover + logo so its card isn't a
    // blank coloured box in the customer app.
    try {
        const pizzaCover = U("1513104890138-7c749659a591"); // pizza close-up
        const pizzaLogo = U("1565299624946-b28f40a0ae38");  // pizza slice
        await db.update(landingPageConfig)
            .set({ headerBgImage: pizzaCover, logomark: pizzaLogo, heroImage: pizzaCover })
            .where(eq(landingPageConfig.slug, "pizza-lemon"));
        console.log("[ZURICH] ✓ Pizza Lemon cover/logo image set.");
    } catch (e: any) {
        console.log("[ZURICH] Pizza Lemon image update skipped:", e.message);
    }

    let createdCount = 0;
    let skippedCount = 0;
    let totalProducts = 0;

    for (const r of RESTAURANTS) {
        try {
            // ── Idempotency guard: skip if slug already exists ────────────────
            const [existing] = await db.select().from(landingPageConfig)
                .where(eq(landingPageConfig.slug, r.slug));
            if (existing) {
                console.log(`[ZURICH] ⏭  "${r.businessName}" (slug ${r.slug}) already seeded — skipping.`);
                skippedCount++;
                continue;
            }

            console.log(`[ZURICH] ▶  Creating "${r.businessName}" (tenant ${r.id})...`);

            // ── 1) Tenant ─────────────────────────────────────────────────────
            const passwordHash = await bcrypt.hash(r.password, 10);
            await db.insert(tenants).values({
                id: r.id,
                businessName: r.businessName,
                ownerName: r.ownerName,
                ownerEmail: r.ownerEmail,
                ownerPhone: r.ownerPhone,
                passwordHash,
                status: "active",
                storeType: "restaurant",
                maxBranches: 3,
                maxEmployees: 20,
            });

            // ── 2) Subscription ───────────────────────────────────────────────
            const endDate = addYears(new Date(), 2);
            const [sub] = await db.insert(tenantSubscriptions).values({
                tenantId: r.id,
                planType: "yearly",
                planName: "Professional",
                price: "79.00",
                status: "active",
                startDate: new Date(),
                endDate,
                autoRenew: true,
            }).$returningId();

            // ── 3) License key ────────────────────────────────────────────────
            await db.insert(licenseKeys).values({
                licenseKey: r.licenseKey,
                tenantId: r.id,
                subscriptionId: sub.id,
                status: "active",
                activatedAt: new Date(),
                expiresAt: endDate,
                maxActivations: 5,
                currentActivations: 0,
            });

            // ── 4) Branch ─────────────────────────────────────────────────────
            const [branch] = await db.insert(branches).values({
                tenantId: r.id,
                name: r.branchName,
                address: r.address,
                phone: r.ownerPhone,
                email: r.ownerEmail,
                isActive: true,
                isMain: true,
                currency: "CHF",
                taxRate: "7.70",
            }).$returningId();
            const branchId = branch.id;

            // ── 5) Warehouse ──────────────────────────────────────────────────
            await db.insert(warehouses).values({
                name: "Hauptlager",
                branchId,
                isDefault: true,
                isActive: true,
            });

            // ── 6) Tables (6 per restaurant) ──────────────────────────────────
            for (let i = 1; i <= 6; i++) {
                const capacity = i <= 2 ? 2 : i <= 4 ? 4 : 6;
                await db.insert(tables).values({
                    branchId,
                    name: `Tisch ${i}`,
                    capacity,
                    status: "available",
                });
            }

            // ── 7) Employees (admin + cashier) ────────────────────────────────
            await db.insert(employees).values({
                tenantId: r.id,
                name: "Admin",
                email: `admin@${r.domain}`,
                pin: "1234",
                role: "admin",
                branchId,
                isActive: true,
            });
            await db.insert(employees).values({
                tenantId: r.id,
                name: "Kasse",
                email: `kasse@${r.domain}`,
                pin: "5678",
                role: "cashier",
                branchId,
                isActive: true,
            });

            // ── 8) Categories + 9) Products + inventory ───────────────────────
            let productSku = 0;
            let restaurantProducts = 0;
            let sortOrder = 0;

            for (const cat of r.categories) {
                sortOrder++;
                const [insertedCat] = await db.insert(categories).values({
                    tenantId: r.id,
                    name: cat.name,
                    color: cat.color,
                    icon: cat.icon,
                    isActive: true,
                    sortOrder,
                }).$returningId();
                const categoryId = insertedCat.id;

                for (const item of cat.items) {
                    productSku++;
                    const [prod] = await db.insert(products).values({
                        tenantId: r.id,
                        name: item.name,
                        description: item.description,
                        sku: `ZR${r.id}-${productSku}`,
                        categoryId,
                        price: String(item.price.toFixed(2)),
                        costPrice: String((item.price * 0.35).toFixed(2)),
                        unit: "piece",
                        taxable: true,
                        trackInventory: false,
                        isActive: true,
                        modifiers: [],
                        image: item.image,
                    }).$returningId();

                    await db.insert(inventory).values({
                        productId: prod.id,
                        branchId,
                        quantity: 999,
                        lowStockThreshold: 0,
                        reorderPoint: 0,
                    });
                    restaurantProducts++;
                }
            }

            // ── 10) Landing page config ───────────────────────────────────────
            await db.insert(landingPageConfig).values({
                tenantId: r.id,
                slug: r.slug,
                heroTitle: r.heroTitle,
                heroSubtitle: r.heroSubtitle,
                heroImage: r.heroImage,
                headerBgImage: r.headerBgImage,
                logomark: r.logomark,
                aboutText: r.aboutText,
                primaryColor: r.primaryColor,
                accentColor: r.accentColor,
                enableOnlineOrdering: true,
                enableDelivery: true,
                enablePickup: true,
                acceptCard: true,
                acceptMobile: true,
                acceptCash: true,
                minOrderAmount: "20.00",
                estimatedDeliveryTime: r.estimatedDeliveryTime,
                minDeliveryTime: r.minDeliveryTime,
                maxDeliveryTime: r.maxDeliveryTime,
                footerText: r.footerText,
                phone: r.ownerPhone,
                email: r.ownerEmail,
                address: r.address,
                openingHours: r.openingHours,
                isPublished: true,
                language: "de",
            });

            createdCount++;
            totalProducts += restaurantProducts;
            console.log(
                `[ZURICH] ✓  "${r.businessName}" done — ${r.categories.length} categories, ${restaurantProducts} products. ` +
                `Login: ${r.ownerEmail} / ${r.password} · License: ${r.licenseKey} · URL: /store/${r.slug}`,
            );
        } catch (err) {
            console.error(`[ZURICH] ✗  Failed to seed "${r.businessName}" (tenant ${r.id}):`, err);
        }
    }

    console.log(
        `[ZURICH] ✓ Finished. Created ${createdCount}, skipped ${skippedCount}, ` +
        `total products inserted this run: ${totalProducts}.`,
    );
}
