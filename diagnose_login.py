#!/usr/bin/env python3
"""Final diagnostic: handle Opening Cash dialog → confirm POS reached."""
import asyncio
from playwright.async_api import async_playwright

POS_URL     = "https://pos.barmagly.tech/app/"
ADMIN_EMAIL = "admin@pizzalemon.ch"
ADMIN_PASS  = "BARMAGLY-8FBC-16DA-8BD9-E3B6"
EMP_PIN     = "1234"


async def click_text(page, text: str) -> bool:
    return bool(await page.evaluate(f"""() => {{
        const el = Array.from(document.querySelectorAll('*')).find(
            e => e.offsetParent !== null
              && (e.innerText || '').trim() === '{text}'
        );
        if (el) {{ el.click(); return true; }}
        return false;
    }}"""))


async def page_text(page) -> str:
    return await page.evaluate(
        "() => document.body?.innerText?.replace(/\\n/g,' ')?.trim() || ''")


async def dump_inputs(page):
    return await page.evaluate("""() =>
        Array.from(document.querySelectorAll('input'))
            .filter(e => e.offsetParent !== null)
            .map(e => ({type:e.type, placeholder:e.placeholder, value:e.value}))
    """)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx  = await browser.new_context(viewport={"width":1440,"height":900})
        page = await ctx.new_page()

        # ── Fresh start ──
        await page.goto(POS_URL, wait_until="domcontentloaded")
        await asyncio.sleep(1)
        await page.evaluate("()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}}")
        await page.reload(wait_until="domcontentloaded")
        await asyncio.sleep(3)

        # ── Intro → license → employee → PIN (already confirmed working) ──
        await click_text(page, "Get Started");          await asyncio.sleep(3)
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

        await click_text(page, "Admin Lemon");          await asyncio.sleep(1.5)
        for digit in EMP_PIN:
            await click_text(page, digit);              await asyncio.sleep(0.15)
        await asyncio.sleep(1)

        # ── Start Shift dialog 1 ──
        txt = await page_text(page)
        if "Start Your Shift" in txt:
            print("[dialog1] Start Your Shift found")
            await click_text(page, "Start Shift")
            await asyncio.sleep(1.5)
            txt = await page_text(page)
            print(f"[after dialog1] text: {txt[:120]}")

        # ── Opening Cash dialog 2 ──
        txt = await page_text(page)
        if "Opening Cash" in txt or "Enter Opening" in txt:
            print("[dialog2] Opening Cash found")
            inps = await dump_inputs(page)
            print(f"  inputs: {inps}")

            # Fill opening cash = 0 (or whatever is default)
            cash_inputs = page.locator('input[type="number"], input[type="text"], input')
            cnt = await cash_inputs.count()
            for i in range(cnt):
                el = cash_inputs.nth(i)
                if await el.is_visible():
                    await el.fill("0")
                    print(f"  ✔ filled cash input[{i}]")
                    break

            await asyncio.sleep(0.5)
            txt_after_fill = await page_text(page)
            print(f"  text after fill: {txt_after_fill[:150]}")

            # Click Start Shift (second time)
            await click_text(page, "Start Shift")
            print("  ✔ clicked Start Shift (dialog2)")
            await asyncio.sleep(3)
            txt = await page_text(page)
            print(f"[after dialog2] URL: {page.url}  text: {txt[:100]}")

        # ── Wait for POS ──
        print("\n⏳ Waiting for POS (15s)...")
        for i in range(15):
            await asyncio.sleep(1)
            cur = page.url
            txt = await page_text(page)
            print(f"  [{i+1:02d}s] {cur}  |  {txt[:60]}")
            if "/login" not in cur and "/intro" not in cur and "/app" in cur:
                print(f"\n  ✔✔✔ POS REACHED at {i+1}s")
                break

        await browser.close()


asyncio.run(main())
