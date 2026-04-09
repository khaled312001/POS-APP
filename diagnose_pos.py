#!/usr/bin/env python3
"""Diagnose: full product add + all modal opens/closes."""
import asyncio
from playwright.async_api import async_playwright

POS_URL     = "https://pos.barmagly.tech/app/"
ADMIN_EMAIL = "admin@pizzalemon.ch"
ADMIN_PASS  = "BARMAGLY-8FBC-16DA-8BD9-E3B6"
EMP_PIN     = "1234"


async def click_text(page, text):
    return bool(await page.evaluate(f"""() => {{
        const el = Array.from(document.querySelectorAll('*')).find(
            e => e.offsetParent !== null && (e.innerText||'').trim() === '{text}');
        if (el) {{ el.click(); return true; }}
        return false;
    }}"""))


async def body(page):
    return await page.evaluate(
        "()=>document.body?.innerText?.replace(/\\n/g,' ')?.trim()||''")


async def leaves(page, limit=20):
    return await page.evaluate(f"""() =>
        Array.from(document.querySelectorAll('*'))
            .filter(e=>e.children.length===0&&e.offsetParent!==null
                     &&(e.innerText||'').trim().length>0)
            .slice(0,{limit}).map(e=>(e.innerText||'').trim().slice(0,50))
    """)


async def login(page):
    await page.goto(POS_URL, wait_until="domcontentloaded"); await asyncio.sleep(1)
    await page.evaluate("()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}}")
    await page.reload(wait_until="domcontentloaded"); await asyncio.sleep(3)
    await click_text(page, "Get Started"); await asyncio.sleep(3)
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
    inputs = page.locator('input')
    for i in range(await inputs.count()):
        el = inputs.nth(i)
        if (await el.get_attribute("type") or "") != "email" and await el.is_visible():
            await el.fill(ADMIN_PASS); break
    await click_text(page, "Activate Store")
    for _ in range(10):
        await asyncio.sleep(1)
        if "/login" in page.url: break
    await click_text(page, "Admin Lemon"); await asyncio.sleep(1.5)
    for d in EMP_PIN: await click_text(page, d); await asyncio.sleep(0.15)
    await asyncio.sleep(1.5)
    if "Start Your Shift" in await body(page):
        await click_text(page, "Start Shift"); await asyncio.sleep(1.5)
    if "Opening Cash" in await body(page):
        cash = page.locator('input').first
        if await cash.is_visible(): await cash.fill("0")
        await click_text(page, "Start Shift"); await asyncio.sleep(3)
    print(f"[login] {page.url}")


async def test_modal(page, btn_text, label, wait=2.0):
    """Click btn, wait, dump leaves, find close text, close."""
    print(f"\n{'─'*50}")
    print(f"TESTING: '{btn_text}' → {label}")
    ok = await click_text(page, btn_text)
    if not ok:
        print(f"  ✗ could not click '{btn_text}'")
        return
    await asyncio.sleep(wait)
    b = await body(page)
    lv = await leaves(page, 30)
    print(f"  body: {b[:120]}")
    print(f"  leaves: {lv}")

    # Find close button — try all common close texts
    closed = False
    for close_txt in ["×","✕","✖","Close","إغلاق","Cancel","إلغاء","Back","رجوع","Done","تم","No","لا"]:
        if await click_text(page, close_txt):
            print(f"  ✔ closed via '{close_txt}'")
            closed = True
            await asyncio.sleep(0.8)
            break
    if not closed:
        await page.keyboard.press("Escape")
        await asyncio.sleep(0.6)
        print(f"  closed via Escape")

    # Verify closed
    b2 = await body(page)
    still_open = label.lower() in b2.lower() if len(label) > 3 else False
    print(f"  verified closed: {not still_open}")


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx  = await browser.new_context(viewport={"width":1440,"height":900})
        page = await ctx.new_page()
        await login(page)

        # ══ Step 1: Add a product properly ════════════════════════════════════
        print("\n" + "="*50)
        print("STEP 1: ADD PRODUCT TO CART")

        # Click product
        await click_text(page, "Lemon Pizza"); await asyncio.sleep(1.5)
        b = await body(page)
        print(f"After product click: {b[:80]}")
        print(f"Leaves: {await leaves(page, 15)}")

        # Click size
        # Look for "33cm — CHF 21.00" or just "33cm"
        size_texts = ["33cm — CHF 21.00", "33cm", "33 cm", "Small", "Medium"]
        for st in size_texts:
            if await click_text(page, st):
                print(f"  ✔ Clicked size: '{st}'")
                await asyncio.sleep(1)
                break

        b = await body(page)
        print(f"After size click: {b[:80]}")
        print(f"Leaves: {await leaves(page, 20)}")

        # Check if toppings/sauces appeared or Add to Cart appeared
        if "Add to Cart" in b:
            # Select a topping first
            toppings = ["Tomato Sauce", "Mozzarella", "Mushrooms"]
            for t in toppings:
                if await click_text(page, t):
                    print(f"  ✔ Selected topping: '{t}'")
                    await asyncio.sleep(0.3)
                    break

            # Click Add to Cart
            if await click_text(page, "Add to Cart"):
                print("  ✔ Clicked 'Add to Cart'")
                await asyncio.sleep(1.5)
        elif "← Back to sizes" in b:
            # Still in toppings step
            if await click_text(page, "Add to Cart"):
                print("  ✔ Clicked 'Add to Cart'")
                await asyncio.sleep(1.5)

        b = await body(page)
        print(f"\nAfter Add to Cart: {b[:120]}")
        cart_has_item = "CHF" in b and ("Lemon Pizza" in b or "33cm" in b)
        print(f"Cart has item: {cart_has_item}")

        # If still showing size picker, click 33cm again
        if "SELECT EXTRAS" in b or "SAUCES" in b:
            await click_text(page, "Add to Cart")
            await asyncio.sleep(1)

        # Add 2 more products (simpler ones without size picker)
        for prod in ["Rivella", "Ayran 0.25 L"]:
            ok = await click_text(page, prod)
            if ok:
                await asyncio.sleep(0.8)
                # check if size needed
                b2 = await body(page)
                if "Add to Cart" in b2:
                    await click_text(page, "Add to Cart")
                    await asyncio.sleep(0.8)
                print(f"  ✔ Added: '{prod}'")
                break

        b = await body(page)
        print(f"\n[CART STATE]: {b[:200]}")
        print(f"[LEAVES]: {await leaves(page, 30)}")

        # ══ Step 2: Test all POS buttons ══════════════════════════════════════
        print("\n" + "="*50)
        print("STEP 2: TEST ALL BUTTONS")

        # Notes (uppercase NOTES in the actual DOM)
        await test_modal(page, "NOTES", "notes", 2)

        # Select Customer
        await test_modal(page, "Select Customer", "customer", 2)

        # Invoices (sجل الفواتير)
        await test_modal(page, "Invoices", "invoice", 2.5)

        # Calls
        await test_modal(page, "Calls", "call", 2)

        # Zero Out Shift
        await test_modal(page, "Zero Out Shift", "zero", 2)

        # Checkout / Pay
        await test_modal(page, "Checkout", "checkout", 2.5)

        # ══ Step 3: Test navigation tabs ══════════════════════════════════════
        print("\n" + "="*50)
        print("STEP 3: TAB NAVIGATION")
        for tab in ["Orders", "Products", "Customers", "Reports", "More"]:
            ok = await click_text(page, tab)
            await asyncio.sleep(2)
            b = await body(page)
            print(f"\n  Tab '{tab}': url={page.url}  body={b[:60]}")

        # Back to POS
        await click_text(page, "POS"); await asyncio.sleep(1.5)

        # ══ Step 4: Find settings rows in "More" ══════════════════════════════
        print("\n" + "="*50)
        print("STEP 4: MORE/SETTINGS ROWS")
        await click_text(page, "More"); await asyncio.sleep(2)
        lv = await leaves(page, 60)
        print(f"More tab leaves: {lv}")

        await browser.close()

asyncio.run(main())
