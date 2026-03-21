import * as cheerio from 'cheerio';
import { db } from '../server/db';
import { products, categories as dbCategories, tenants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import puppeteer from 'puppeteer';

const TENANT_ID = 24;

interface CategoryData {
    name: string;
    url: string;
    id?: number;
}

interface ProductChoice {
    label: string;
    price: number;
}

interface ProductModifier {
    name: string; // e.g., "Size", "Extra Toppings"
    options: ProductChoice[];
}

interface ProductVariant {
    name: string; // e.g., "33cm", "45cm"
    sku: string;
    price: number;
    stock: number;
}

interface ProductData {
    name: string;
    description: string;
    price: number;
    image: string;
    categoryName: string;
    categoryId?: number;
    modifiers: ProductModifier[];
    variants: ProductVariant[];
}

async function scrapeCategories(page: puppeteer.Page): Promise<CategoryData[]> {
    await page.goto('https://pizzalemon.ch/lemon/index.php?route=product/category&path=20', { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    const $ = cheerio.load(content);

    const categories: CategoryData[] = [];

    // Find category links in the sidebar/menu
    $('.list-group a').each((_, el) => {
        const $el = $(el);
        const text = $el.text().replace(/\(\d+\)/g, '').trim(); // Remove count like "(12)"
        const href = $el.attr('href');
        if (href && href.includes('route=product/category')) {
            // Avoid duplication
            if (!categories.find(c => c.url === href)) {
                categories.push({ name: text, url: href });
            }
        }
    });

    return categories;
}

async function scrapeProductsForCategory(page: puppeteer.Page, cat: CategoryData): Promise<ProductData[]> {
    const productsResult: ProductData[] = [];
    console.log(`[SCRAPE] Navigating to category: ${cat.name}`);
    await page.goto(cat.url, { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    const $ = cheerio.load(content);

    const productLinks: string[] = [];
    $('.product-thumb h4 a, .product-layout .name a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) productLinks.push(href);
    });

    // OpenCart might have paginations (page=2, etc), but usually takeaway menus list all or have long scroll. Let's start with page 1
    for (const link of productLinks) {
        try {
            await page.goto(link, { waitUntil: 'domcontentloaded' });
            const pd = await extractProductDetails(page, cat.name);
            if (pd) productsResult.push(pd);
        } catch (e) {
            console.warn(`[SCRAPE] Failed to scrape product at ${link}`, e);
        }
    }

    return productsResult;
}

async function extractProductDetails(page: puppeteer.Page, categoryName: string): Promise<ProductData | null> {
    const content = await page.content();
    const $ = cheerio.load(content);

    const name = $('h1').first().text().trim();
    if (!name) return null;

    let priceText = $('.price').first().text().trim();
    if (!priceText) {
        priceText = $('h2').filter((_, el) => $(el).text().includes('CHF')).first().text().trim();
    }

    // Try to find the fundamental price
    const priceMatch = priceText.match(/[\d.]+/);
    let basePrice = priceMatch ? parseFloat(priceMatch[0]) : 0;

    const description = $('#tab-description').text().trim() || $('.description').text().trim() || "";
    let image = $('.thumbnails a').first().attr('href') || "";
    if (!image.startsWith('http')) {
        image = image ? `https://pizzalemon.ch/lemon/${image}` : "";
    }

    const modifiers: ProductModifier[] = [];
    const variants: ProductVariant[] = [];

    // Scrape Options (Sizes, Extra toppings, etc)
    $('#product .form-group').each((_, el) => {
        const groupLabel = $(el).find('.control-label').text().replace('*', '').trim();
        if (!groupLabel) return;

        const options: ProductChoice[] = [];

        // Check for radio buttons or checkboxes
        $(el).find('.radio, .checkbox').each((__, optEl) => {
            let optText = $(optEl).text().trim();
            let optPrice = 0;

            const pMatch = optText.match(/([+-]\s*[\d.]+)/);
            if (pMatch) {
                optPrice = parseFloat(pMatch[1].replace(/\s+/g, ''));
                optText = optText.replace(/\([+-]\s*[\d.]+\)/, '').trim();
            }

            options.push({ label: optText, price: optPrice });
        });

        // Check for select dropdown
        $(el).find('select option').each((__, optEl) => {
            let optText = $(optEl).text().trim();
            if (optText.includes('---')) return; // skip placeholder

            let optPrice = 0;
            const pMatch = optText.match(/([+-]\s*[\d.]+)/);
            if (pMatch) {
                optPrice = parseFloat(pMatch[1].replace(/\s+/g, ''));
                optText = optText.replace(/\([+-]\s*[\d.]+\)/, '').trim();
            }
            options.push({ label: optText, price: optPrice });
        });

        if (options.length > 0) {
            // If the label hints at size, transform to variants, else modifiers.
            if (groupLabel.toLowerCase().includes('size') || groupLabel.toLowerCase().includes('grösse')) {
                let isFirstSize = true;
                for (const opt of options) {
                    variants.push({
                        name: opt.label,
                        sku: `${name.substring(0, 4)}-${opt.label.substring(0, 3)}`.toUpperCase(),
                        price: isFirstSize ? basePrice + opt.price : basePrice + opt.price,
                        stock: 999
                    });
                    isFirstSize = false;
                }
            } else {
                modifiers.push({ name: groupLabel, options });
            }
        }
    });

    console.log(`[SCRAPE] Extracted: ${name} - CHF ${basePrice} (${variants.length} variants, ${modifiers.length} modifiers)`);

    return { name, description, price: basePrice, image, categoryName, modifiers, variants };
}

async function runScraper() {
    console.log('[SCRAPE] Launching browser...');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    try {
        const cats = await scrapeCategories(page);
        console.log(`[SCRAPE] Found ${cats.length} categories:`, cats.map(c => c.name).join(', '));

        // Fetch existing categories from DB for our tenant
        const existingCats = await db.select().from(dbCategories).where(eq(dbCategories.tenantId, TENANT_ID));

        let allProducts: ProductData[] = [];

        for (const c of cats) {
            // Only process distinct, meaningful categories. E.g, Pizza, Kebab, etc.
            if (!c.name || c.name.length < 2) continue;

            let dbCatId = existingCats.find(ec => ec.name.toLowerCase() === c.name.toLowerCase())?.id;

            if (!dbCatId) {
                const [newCat] = await db.insert(dbCategories).values({
                    tenantId: TENANT_ID,
                    name: c.name,
                    isActive: true,
                    color: '#eab308' // Pizza/food color
                }).returning();
                dbCatId = newCat.id;
                existingCats.push(newCat);
                console.log(`[DB] Created new category: ${c.name}`);
            }

            c.id = dbCatId;
            const prods = await scrapeProductsForCategory(page, c);
            for (const p of prods) {
                p.categoryId = dbCatId;
            }
            allProducts.push(...prods);

            console.log(`[DB] Scraped ${prods.length} products for ${c.name}`);
        }

        console.log(`[SCRAPE] Total products scraped: ${allProducts.length}`);

        // Wipe existing products to avoid duplicates and outdated prices? 
        // Wait, the user said "take correct prices and size for all items... update in production database"
        // I will delete existing products for this tenant and insert the fresh ones.
        console.log(`[DB] Cleaning up old products...`);
        await db.delete(products).where(eq(products.tenantId, TENANT_ID));

        const BATCH_SIZE = 50;
        let inserted = 0;
        for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
            const batch = allProducts.slice(i, i + BATCH_SIZE).map(p => ({
                tenantId: TENANT_ID,
                categoryId: p.categoryId,
                name: p.name,
                description: p.description,
                price: p.variants.length > 0 ? Math.min(...p.variants.map(v => v.price)).toString() : p.price.toString(),
                image: p.image,
                taxable: true,
                trackInventory: false,
                isActive: true,
                modifiers: p.modifiers,
                variants: p.variants
            }));
            await db.insert(products).values(batch as any);
            inserted += batch.length;
        }

        console.log(`[DB] Successfully inserted ${inserted} products!`);

    } catch (e) {
        console.error('[SCRAPE] Fatal error:', e);
    } finally {
        await browser.close();
        process.exit(0);
    }
}

runScraper();
