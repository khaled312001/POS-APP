import { config } from "dotenv";
config();
import { db } from "../server/db";
import { products, tenants } from "@shared/schema";
import { eq, inArray, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
import https from "https";

const manualMap = {
    "Pommes frites (Normal)": "https://pizzalemon.ch/lemon/image/cache/catalog/Pommes-220x220.jpeg",
    "Pommes frites (Gross)": "https://pizzalemon.ch/lemon/image/cache/catalog/Pommes-220x220.jpeg",
    "Tiramisu Hausgemacht": "https://pizzalemon.ch/lemon/image/cache/catalog/Desserts/Tiramisu-220x220.png",
    "Feldschlösschen 0.5l": "https://pizzalemon.ch/lemon/image/cache/catalog/icecek/Bier/BierFeldschlossen_enl-220x220.jpg",
    "Döner Kebab im Dürüm": "https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/D%c2%81r%c2%81m%20Kebab-220x220.jpg",
    "Extra Kebap": "https://pizzalemon.ch/lemon/image/cache/catalog/hausspezialitanen/Kebab%20Teller-220x220.jpg",
    "Döner Box": "https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/Doner_Fingerfood/D%c2%94ner%20Box-220x220.jpg",
    "Wunschpide": "https://pizzalemon.ch/lemon/image/cache/catalog/AAA%20Lemon/pide/Pide%20mit%20Kebabfleisch-220x220.jpg",
    "Griechischer Salat": "https://pizzalemon.ch/lemon/image/cache/catalog/Salate/Gemischter%20Salat-220x220-220x220.jpg",
    "Knoblibrot": "https://pizzalemon.ch/lemon/image/cache/catalog/Pizzas/Pizza-Margherita-220x220-220x220.jpg",
    "Fiorentina": "https://pizzalemon.ch/lemon/image/cache/catalog/Pizzas/Pizza-Prosciutto-220x220-220x220.jpg",
    "Profumata": "https://pizzalemon.ch/lemon/image/cache/catalog/Pizzas/Pizza-Napoli-220x220-220x220.jpg"
};

async function downloadImage(url: string, filename: string): Promise<string> {
    const uploadDir = path.resolve(process.cwd(), "uploads", "products");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(filePath);
                response.pipe(file);
                file.on('finish', () => { file.close(); resolve(`/objects/products/${filename}`); });
            } else {
                reject(`HTTP ${response.statusCode}`);
            }
        });
        request.on('error', (err) => reject(err.message));
    });
}

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function run() {
    const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.ownerEmail, "admin@pizzalemon.ch"));
    if (!tenant) return console.log("Pizza Lemon tenant not found");

    const items = await db.select().from(products)
        .where(and(eq(products.tenantId, tenant.id), inArray(products.name, Object.keys(manualMap))));

    let fixed = 0;
    for (const p of items) {
        const url = manualMap[p.name];
        if (url) {
            const ext = url.split('.').pop();
            const fname = `pizzalemon_${slugify(p.name)}_${Date.now()}.${ext}`;
            try {
                const localPath = await downloadImage(url, fname);
                await db.update(products).set({ image: localPath }).where(eq(products.id, p.id));
                fixed++;
                console.log(`Updated ${p.name} -> ${localPath}`);
            } catch (e) {
                console.error(`Failed to download ${p.name}: ${e}`);
            }
        }
    }
    console.log(`\nSuccessfully downloaded: ${fixed}/${items.length}`);
}

run().catch(console.error).finally(() => process.exit(0));
