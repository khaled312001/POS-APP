#!/usr/bin/env python3
"""
=============================================================
  POS SYSTEM — Professional Brochure Screenshot Script
  Website : https://pos.barmagly.tech/app/
  Store   : https://pos.barmagly.tech/store/pizza-lemon
=============================================================
Rules:
  1. ANALYSE current screen BEFORE every shot
  2. If overlays/wrong content found → FIX first, then shoot
  3. After every panel screenshot → verify it CLOSED before continuing
  4. Panels with icon-only close buttons are closed via tab navigation
"""

import asyncio
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Page

# ─── CONFIG ──────────────────────────────────────────────────────────────────
POS_URL     = "https://pos.barmagly.tech/app/"
STORE_URL   = "https://pos.barmagly.tech/store/pizza-lemon"
ADMIN_EMAIL = "admin@pizzalemon.ch"
ADMIN_PASS  = "BARMAGLY-8FBC-16DA-8BD9-E3B6"
EMP_PIN     = "1234"
VIEWPORT_W  = 1920
VIEWPORT_H  = 1080

OUT_DIR = Path("brochure_screenshots") / datetime.now().strftime("%Y-%m-%d_%H-%M")
OUT_DIR.mkdir(parents=True, exist_ok=True)

_counter   = [0]
_last_hash = [None]
_log: list = []

# ─── KNOWN OVERLAY MARKERS ───────────────────────────────────────────────────
# These only appear when a modal/panel is ACTUALLY open and visible.
# "Select Customer" and "ZERO OUT SHIFT" exist in the background DOM always,
# so they must NOT be in this list.
OVERLAY_MARKERS = [
    "Previous Invoices",   # Invoice history panel
    "Call History",        # Call history panel
    "Print & Zero Out",    # Zero out shift dialog (unique button text)
    "Order Notes",         # Notes modal header
    "Save Note",           # Notes modal save button
    "FULL NAME *",         # Customer picker form
]


# ═══════════════════════════════════════════════════════════════════════════════
#  UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

def _md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def _slug(name: str) -> str:
    s = re.sub(r'[^\x20-\x7E]', '', name)
    s = re.sub(r'[^\w\-. ]', '', s)
    s = s.strip().replace(' ', '_')
    return s or "screenshot"


def _log_entry(n, name, status, size_kb, h, desc):
    _log.append({"n": n, "name": name, "status": status,
                 "size_kb": size_kb, "hash": h, "desc": desc})
    (OUT_DIR / "log.json").write_text(
        json.dumps(_log, ensure_ascii=False, indent=2), encoding="utf-8")


def _vis_js() -> str:
    return """(e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }"""


async def all_leaves(page: Page) -> list[str]:
    """Return text of ALL visible leaf elements."""
    return await page.evaluate(f"""() => {{
        const vis = {_vis_js()};
        return Array.from(document.querySelectorAll('*'))
            .filter(e => e.children.length === 0 && vis(e)
                      && (e.innerText || '').trim().length > 0)
            .map(e => (e.innerText || '').trim().slice(0, 80));
    }}""")


async def leaves_str(page: Page) -> str:
    return " | ".join(await all_leaves(page))


async def body_text(page: Page) -> str:
    return await page.evaluate(
        "() => document.body?.innerText?.replace(/\\n/g,' ')?.trim() || ''")


async def click_text(page: Page, text: str) -> bool:
    safe = text.replace("'", "\\'")
    result = await page.evaluate(f"""() => {{
        const vis = {_vis_js()};
        const el = Array.from(document.querySelectorAll('*')).find(
            e => vis(e) && (e.innerText || '').trim() === '{safe}'
        );
        if (el) {{ el.click(); return true; }}
        return false;
    }}""")
    return bool(result)


async def click_tab(page: Page, label: str) -> bool:
    safe = label.replace("'", "\\'")
    result = await page.evaluate(f"""() => {{
        const vis = {_vis_js()};
        const label = '{safe}';
        const el = Array.from(document.querySelectorAll('*')).find(e => {{
            if (!vis(e)) return false;
            const cleaned = (e.innerText || '')
                .replace(/[^\\x20-\\x7E]/g, ' ')
                .replace(/\\s+/g, ' ')
                .trim();
            return cleaned === label;
        }});
        if (el) {{ el.click(); return true; }}
        return false;
    }}""")
    return bool(result)


# Direct URL map for reliable navigation (tab bar click_text can mis-fire
# when the same word appears in page content, e.g. "Products" in a product name)
TAB_URLS = {
    "POS":       "/app/",
    "Orders":    "/app/online-orders",
    "Products":  "/app/products",
    "Customers": "/app/customers",
    "Reports":   "/app/reports",
    "More":      "/app/settings",
}
BASE_URL = "https://pos.barmagly.tech"


async def navigate_to_tab(page: Page, tab: str) -> bool:
    # Use direct URL if we know it — avoids click_text ambiguity
    if tab in TAB_URLS:
        target = BASE_URL + TAB_URLS[tab]
        if page.url.rstrip("/") != target.rstrip("/"):
            await page.goto(target, wait_until="domcontentloaded")
            await asyncio.sleep(2.5)
        if "/login" in page.url or "/intro" in page.url:
            print(f"  ⚠️  Redirected to login after goto '{tab}'")
            return False
        print(f"  ✔ Tab '{tab}' → {page.url}")
        return True
    # Fallback: click-based nav
    ok = await click_text(page, tab) or await click_tab(page, tab)
    if not ok:
        print(f"  ⚠️  Tab '{tab}' not found")
        return False
    await asyncio.sleep(3)
    if "/login" in page.url or "/intro" in page.url:
        return False
    print(f"  ✔ Tab '{tab}' → {page.url}")
    return True


# ═══════════════════════════════════════════════════════════════════════════════
#  OVERLAY DETECTION & CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════

async def detect_overlays(page: Page) -> list[str]:
    """Return list of overlay markers currently visible on screen."""
    lv = await leaves_str(page)
    found = [m for m in OVERLAY_MARKERS if m.lower() in lv.lower()]
    return found


async def force_close_all_overlays(page: Page):
    """
    Close ALL open panels/modals by navigating to Orders tab and back to POS.
    This is the ONLY reliable method — icon-only × buttons can't be found via text.
    """
    overlays = await detect_overlays(page)
    if not overlays:
        return
    print(f"  🔧 Overlays detected: {overlays} — closing via tab navigation")
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(1.5)
    await navigate_to_tab(page, "POS")
    await asyncio.sleep(2.5)
    # Verify closed
    remaining = await detect_overlays(page)
    if remaining:
        print(f"  ⚠️  Still open after nav: {remaining} — trying Products tab")
        await navigate_to_tab(page, "Products")
        await asyncio.sleep(1.5)
        await navigate_to_tab(page, "POS")
        await asyncio.sleep(2.5)
    remaining2 = await detect_overlays(page)
    if remaining2:
        print(f"  ⚠️  Still open: {remaining2} — reloading page")
        await page.goto(POS_URL, wait_until="domcontentloaded")
        await asyncio.sleep(3)
        b = await body_text(page)
        if "PIN" in b or "Enter PIN" in b:
            for d in EMP_PIN:
                await click_text(page, d)
                await asyncio.sleep(0.15)
            await asyncio.sleep(2)
    else:
        print("  ✔ All overlays closed")


async def assert_clean_pos(page: Page, context: str = ""):
    """
    Assert POS screen is clean (no overlays). Fix if not.
    Call this BEFORE every shot that should show clean POS.
    """
    overlays = await detect_overlays(page)
    if overlays:
        print(f"  🔧 [{context}] Dirty state — {overlays}")
        await force_close_all_overlays(page)


# ═══════════════════════════════════════════════════════════════════════════════
#  SCREENSHOT WITH ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

async def shot(page: Page, name: str, desc: str = "",
               full: bool = True,
               must_differ: bool = True,
               expect: list[str] | None = None,
               no_overlay: bool = False) -> Path | None:
    """
    Take a screenshot.
    - no_overlay=True: verify no overlay panels are showing first
    - expect=[...]: verify keywords present after shot
    """
    _counter[0] += 1
    n    = _counter[0]
    slug = f"{n:03d}_{_slug(name)}"
    path = OUT_DIR / f"{slug}.png"

    # Pre-shot analysis
    if no_overlay:
        await assert_clean_pos(page, name)

    await asyncio.sleep(0.7)
    try:
        await page.wait_for_load_state("networkidle", timeout=4_000)
    except Exception:
        pass

    await page.screenshot(path=str(path), full_page=full)

    if not path.exists() or path.stat().st_size < 10_240:
        print(f"⚠️  [{n:03d}] {name} — EMPTY/TOO SMALL")
        _log_entry(n, name, "empty", 0, "", desc)
        path.unlink(missing_ok=True)
        return None

    h       = _md5(path)
    size_kb = path.stat().st_size // 1024

    if must_differ and h == _last_hash[0]:
        print(f"🔁  [{n:03d}] {name} — DUPLICATE")
        _log_entry(n, name, "duplicate", size_kb, h, desc)
        path.unlink()
        return None

    # Post-shot keyword check
    if expect:
        lv = await leaves_str(page)
        missing = [k for k in expect if k.lower() not in lv.lower()]
        if missing:
            print(f"  ⚠️  [{n:03d}] Missing keywords: {missing}")
        else:
            print(f"  ✔  [{n:03d}] Keywords OK: {expect}")

    _last_hash[0] = h
    label = f"✅  [{n:03d}] {name}  ({size_kb} KB)"
    if desc:
        label += f"  — {desc}"
    print(label)
    _log_entry(n, name, "ok", size_kb, h, desc)
    return path


# ═══════════════════════════════════════════════════════════════════════════════
#  1. LOGIN
# ═══════════════════════════════════════════════════════════════════════════════

async def do_login(page: Page):
    print("\n━━━  1 · LOGIN  ━━━")
    await page.goto(POS_URL, wait_until="domcontentloaded")
    await asyncio.sleep(1)
    await page.evaluate(
        "()=>{try{localStorage.clear();}catch(e){}"
        "try{sessionStorage.clear();}catch(e){}}")
    await page.reload(wait_until="domcontentloaded")
    await asyncio.sleep(3)
    print(f"  URL: {page.url}")

    if "/intro" in page.url:
        await shot(page, "01_intro_welcome", "Welcome screen",
                   expect=["Get Started"])
        await click_text(page, "Get Started")
        await asyncio.sleep(3)

    if "/license-gate" in page.url:
        await shot(page, "02_license_gate", "License gate",
                   expect=["Activate"])
        await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
        await asyncio.sleep(0.3)
        inputs = page.locator('input')
        for i in range(await inputs.count()):
            el = inputs.nth(i)
            tp = (await el.get_attribute("type") or "").lower()
            if tp != "email" and await el.is_visible():
                await el.fill(ADMIN_PASS)
                break
        await shot(page, "02b_license_filled", "License form filled")
        await click_text(page, "Activate Store")
        for s in range(10):
            await asyncio.sleep(1)
            if "/login" in page.url:
                break
        await shot(page, "02c_license_confirmed", "License validated")

    if "/login" in page.url:
        await asyncio.sleep(1.5)
        await shot(page, "03_employee_select", "Employee select",
                   must_differ=False, expect=["Admin"])
        await click_text(page, "Admin Lemon")
        await asyncio.sleep(1.5)

    b = await body_text(page)
    if "PIN" in b:
        await shot(page, "04_pin_pad", "PIN pad", expect=["PIN"])
        for d in EMP_PIN:
            await click_text(page, d)
            await asyncio.sleep(0.15)
        await asyncio.sleep(1.5)

    b = await body_text(page)
    if "Start Your Shift" in b:
        await shot(page, "05_start_shift", "Start shift dialog",
                   expect=["Shift"])
        await click_text(page, "Start Shift")
        await asyncio.sleep(1.5)

    b = await body_text(page)
    if "Opening Cash" in b or "Enter Opening" in b:
        await shot(page, "06_opening_cash", "Opening cash dialog")
        cash_el = page.locator('input').first
        if await cash_el.is_visible():
            await cash_el.fill("0")
        await click_text(page, "Start Shift")
        await asyncio.sleep(3)

    print(f"  URL: {page.url}")
    await shot(page, "07_pos_main_ready", "POS main screen",
               no_overlay=True, expect=["Checkout", "POS"])


# ═══════════════════════════════════════════════════════════════════════════════
#  2. POS — ADD PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════════

async def add_product_to_cart(page: Page, product_name: str,
                               size: str | None = None) -> bool:
    before = await body_text(page)
    if not await click_text(page, product_name):
        print(f"  ⚠️  Product '{product_name}' not found")
        return False
    await asyncio.sleep(1.5)
    b = await body_text(page)
    if size and size in b:
        if await click_text(page, size):
            await asyncio.sleep(1.2)
            b = await body_text(page)
    else:
        for sz in ["33cm — CHF 21.00", "33cm", "25cm"]:
            if sz in b and await click_text(page, sz):
                await asyncio.sleep(1.2)
                b = await body_text(page)
                break
    if "Add to Cart" in b:
        await click_text(page, "Add to Cart")
        await asyncio.sleep(1.5)
    return (await body_text(page)) != before


async def pos_main_screen(page: Page) -> bool:
    print("\n━━━  2 · POS MAIN  ━━━")
    await assert_clean_pos(page, "pos_overview")
    await asyncio.sleep(2)
    await shot(page, "pos_overview", "POS products + cart",
               no_overlay=True, expect=["Checkout"])

    ok = await add_product_to_cart(page, "Lemon Pizza", "33cm — CHF 21.00")
    if ok:
        await shot(page, "pos_cart_first_item", "Cart — Lemon Pizza added",
                   expect=["Lemon Pizza"])

    for prod in ["Rivella", "Ayran 0.25 L", "Coca Cola"]:
        if await click_text(page, prod):
            await asyncio.sleep(1.2)
            b = await body_text(page)
            if "Add to Cart" in b:
                await click_text(page, "Add to Cart")
                await asyncio.sleep(1)
            break

    await shot(page, "pos_cart_with_items", "Cart with multiple items",
               no_overlay=True, expect=["Checkout"])
    return True


# ═══════════════════════════════════════════════════════════════════════════════
#  2b. ORDER NOTES MODAL
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_notes_modal(page: Page):
    print("\n━━━  2b · NOTES MODAL  ━━━")
    await assert_clean_pos(page, "notes")
    before = await body_text(page)

    if not await click_text(page, "NOTES"):
        print("  ⚠️  NOTES not found")
        return
    await asyncio.sleep(1.5)
    if (await body_text(page)) == before:
        print("  ⚠️  Notes modal did not open")
        return

    await shot(page, "pos_notes_modal_open", "Order notes modal",
               expect=["NOTES"])

    try:
        ta = page.locator('textarea').first
        if await ta.is_visible():
            await ta.fill("Special note: no onions, no extra sauce, fast delivery please")
            await asyncio.sleep(0.4)
            await shot(page, "pos_notes_typed", "Note typed",
                       expect=["no onions"])
    except Exception:
        pass

    for txt in ["Save Note", "Save", "OK", "Done"]:
        if await click_text(page, txt):
            await asyncio.sleep(0.8)
            print(f"  ✔ Notes saved via '{txt}'")
            break
    else:
        await page.keyboard.press("Escape")
        await asyncio.sleep(0.8)

    # Verify modal closed
    overlays = await detect_overlays(page)
    if "Order Notes" in overlays or "Save Note" in overlays:
        await force_close_all_overlays(page)


# ═══════════════════════════════════════════════════════════════════════════════
#  2c. CUSTOMER PICKER
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_customer_picker_modal(page: Page):
    print("\n━━━  2c · CUSTOMER PICKER  ━━━")
    await assert_clean_pos(page, "customer_picker")
    before = await body_text(page)

    if not await click_text(page, "Select Customer"):
        print("  ⚠️  'Select Customer' not found")
        return
    await asyncio.sleep(1.5)
    if (await body_text(page)) == before:
        print("  ⚠️  Customer picker did not open")
        return

    await shot(page, "pos_customer_picker_open", "Customer picker modal",
               expect=["Walk-in Customer"])

    try:
        inp = page.locator('input').first
        if await inp.is_visible():
            await inp.fill("Ahmed")
            await asyncio.sleep(1.2)
            await shot(page, "pos_customer_search_results",
                       "Customer search: Ahmed")
            await inp.clear()
    except Exception:
        pass

    # Close: navigate away (icon-only × button)
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(1)
    await navigate_to_tab(page, "POS")
    await asyncio.sleep(2)
    # Verify
    overlays = await detect_overlays(page)
    if "FULL NAME *" in overlays or "Select Customer" in overlays:
        await force_close_all_overlays(page)
    print("  ✔ Customer picker closed")


# ═══════════════════════════════════════════════════════════════════════════════
#  2d. INVOICE HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_invoice_history(page: Page):
    print("\n━━━  2d · INVOICE HISTORY  ━━━")
    await assert_clean_pos(page, "invoice_history")
    before = await body_text(page)

    if not await click_text(page, "Invoices"):
        print("  ⚠️  'Invoices' not found")
        return
    await asyncio.sleep(2)
    if (await body_text(page)) == before:
        print("  ⚠️  Invoice history did not open")
        return

    await shot(page, "pos_invoice_history_open", "Invoice history",
               expect=["CHF"])

    # Close via tab navigation (icon-only × button)
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(1)
    await navigate_to_tab(page, "POS")
    await asyncio.sleep(2.5)

    # Verify closed
    if "Previous Invoices" in await leaves_str(page):
        print("  ⚠️  Invoice history still open — forcing close")
        await force_close_all_overlays(page)
    else:
        print("  ✔ Invoice history closed")


# ═══════════════════════════════════════════════════════════════════════════════
#  2e. CALL HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_call_history(page: Page):
    print("\n━━━  2e · CALL HISTORY  ━━━")
    await assert_clean_pos(page, "call_history")
    before = await body_text(page)

    if not await click_text(page, "Calls"):
        print("  ⚠️  'Calls' not found")
        return
    await asyncio.sleep(1.5)
    if (await body_text(page)) == before:
        print("  ⚠️  Call history did not open")
        return

    await shot(page, "pos_call_history_open", "Call history panel")

    # Close via tab navigation
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(1)
    await navigate_to_tab(page, "POS")
    await asyncio.sleep(2.5)

    if "Call History" in await leaves_str(page):
        await force_close_all_overlays(page)
    else:
        print("  ✔ Call history closed")


# ═══════════════════════════════════════════════════════════════════════════════
#  2f. ZERO OUT SHIFT
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_zero_out_shift(page: Page):
    print("\n━━━  2f · ZERO OUT SHIFT  ━━━")
    await assert_clean_pos(page, "zero_out_shift")
    before = await body_text(page)

    if not await click_text(page, "Zero Out Shift"):
        print("  ⚠️  'Zero Out Shift' not found")
        return
    await asyncio.sleep(1.5)
    if (await body_text(page)) == before:
        print("  ⚠️  Zero Out Shift dialog did not open")
        return

    await shot(page, "pos_zero_out_shift_dialog",
               "Zero Out Shift report dialog", expect=["Shift"])

    # Close via tab navigation (STOP and × are icon-only)
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(1)
    await navigate_to_tab(page, "POS")
    await asyncio.sleep(2.5)

    lv = await leaves_str(page)
    if "ZERO OUT SHIFT" in lv or "Print & Zero Out" in lv:
        print("  ⚠️  Zero Out still open — forcing close")
        await force_close_all_overlays(page)
    else:
        print("  ✔ Zero Out Shift closed")


# ═══════════════════════════════════════════════════════════════════════════════
#  3. CHECKOUT
# ═══════════════════════════════════════════════════════════════════════════════

async def pos_checkout_flow(page: Page):
    print("\n━━━  3 · CHECKOUT  ━━━")
    await assert_clean_pos(page, "checkout")
    before = await body_text(page)

    if not await click_text(page, "Checkout"):
        print("  ⚠️  'Checkout' not found")
        lv = await all_leaves(page)
        print(f"  Leaves: {lv[:20]}")
        return
    await asyncio.sleep(2.5)
    b = await body_text(page)
    if b == before:
        print("  ⚠️  Checkout did not open")
        return

    print("  ✔ Checkout opened")
    await shot(page, "checkout_modal_open", "Checkout — payment methods",
               expect=["Cash"])

    # Cash
    if await click_text(page, "Cash"):
        await asyncio.sleep(0.8)
        await shot(page, "checkout_cash_selected",
                   "Payment: Cash", must_differ=False, expect=["Cash"])
        try:
            inp = page.locator('input[type="number"], input[type="text"], input').first
            if await inp.is_visible():
                await inp.clear()
                await inp.fill("50")
                await asyncio.sleep(0.5)
                await shot(page, "checkout_cash_amount",
                           "Cash amount: CHF 50", must_differ=False)
        except Exception:
            pass

    # Card
    if await click_text(page, "Card"):
        await asyncio.sleep(0.8)
        await shot(page, "checkout_card_selected",
                   "Payment: Card", must_differ=False, expect=["Card"])

    # TWINT
    for lbl in ["Twint", "TWINT"]:
        if await click_text(page, lbl):
            await asyncio.sleep(0.8)
            await shot(page, "checkout_twint_selected",
                       "Payment: TWINT", must_differ=False)
            break

    # Back to Cash + confirm
    await click_text(page, "Cash")
    await asyncio.sleep(0.3)
    try:
        inp = page.locator('input[type="number"], input[type="text"], input').first
        if await inp.is_visible():
            await inp.clear()
            await inp.fill("100")
            await asyncio.sleep(0.3)
    except Exception:
        pass
    await shot(page, "checkout_ready_to_confirm",
               "Ready to confirm — total + change", expect=["CHF"])

    for txt in ["Confirm", "Complete Sale", "Complete", "Process"]:
        if await click_text(page, txt):
            print(f"  ✔ Confirmed via '{txt}'")
            await asyncio.sleep(3)
            b3 = await body_text(page)
            if "Receipt" in b3 or "CHF" in b3:
                await shot(page, "checkout_receipt_shown",
                           "Receipt — sale complete", expect=["CHF"])
            for close_txt in ["Close", "Done", "New Sale", "OK"]:
                if await click_text(page, close_txt):
                    await asyncio.sleep(0.5)
                    break
            break
    else:
        await page.keyboard.press("Escape")
        await asyncio.sleep(1)


# ═══════════════════════════════════════════════════════════════════════════════
#  4. ONLINE ORDERS TAB
# ═══════════════════════════════════════════════════════════════════════════════

async def online_orders_tab(page: Page):
    print("\n━━━  4 · ONLINE ORDERS  ━━━")
    await force_close_all_overlays(page)
    await navigate_to_tab(page, "Orders")
    await asyncio.sleep(2)
    await shot(page, "online_orders_all", "Online orders — all",
               must_differ=False, expect=["Orders"])

    # Filters
    for status in ["Pending", "Confirmed", "Ready", "Cancelled"]:
        if await click_text(page, status):
            await asyncio.sleep(0.8)
            await shot(page, f"online_orders_{status.lower()}",
                       f"Orders filtered: {status}")

    # Open first order
    lv = await all_leaves(page)
    b_before = await body_text(page)
    for leaf in lv:
        if leaf.startswith("#") or "Order" in leaf:
            if await click_text(page, leaf):
                await asyncio.sleep(1.5)
                if (await body_text(page)) != b_before:
                    await shot(page, "online_order_detail",
                               "Order detail view")
                    await navigate_to_tab(page, "Orders")
                    await asyncio.sleep(1)
                break


# ═══════════════════════════════════════════════════════════════════════════════
#  5. PRODUCTS TAB
# ═══════════════════════════════════════════════════════════════════════════════

async def products_tab(page: Page):
    print("\n━━━  5 · PRODUCTS TAB  ━━━")
    await force_close_all_overlays(page)
    await navigate_to_tab(page, "Products")
    await asyncio.sleep(2)
    await shot(page, "products_list_full", "Products list",
               must_differ=False, expect=["Pizza"])

    # Search
    try:
        inp = page.locator('input').first
        if await inp.is_visible():
            await inp.fill("pizza")
            await asyncio.sleep(1.2)
            await shot(page, "products_search_pizza", "Search: pizza",
                       expect=["pizza"])
            await inp.clear()
            await asyncio.sleep(0.5)
    except Exception:
        pass

    # Edit existing product
    lv = await all_leaves(page)
    for leaf in lv:
        if "CHF" in leaf or "Pizza" in leaf:
            before = await body_text(page)
            if await click_text(page, leaf):
                await asyncio.sleep(1.5)
                if (await body_text(page)) != before:
                    await shot(page, "products_edit_modal",
                               "Product edit modal")
                    await navigate_to_tab(page, "Orders")
                    await asyncio.sleep(1)
                    await navigate_to_tab(page, "Products")
                    await asyncio.sleep(2)
                break


# ═══════════════════════════════════════════════════════════════════════════════
#  6. CUSTOMERS TAB
# ═══════════════════════════════════════════════════════════════════════════════

async def customers_tab(page: Page):
    print("\n━━━  6 · CUSTOMERS TAB  ━━━")
    await force_close_all_overlays(page)
    await navigate_to_tab(page, "Customers")
    await asyncio.sleep(2)
    await shot(page, "customers_list_full", "Customers list",
               must_differ=False)

    # Search
    try:
        inp = page.locator('input').first
        if await inp.is_visible():
            await inp.fill("Ahmed")
            await asyncio.sleep(1.2)
            await shot(page, "customers_search_ahmed", "Search: Ahmed")
            await inp.clear()
            await asyncio.sleep(0.5)
    except Exception:
        pass

    # Click first customer
    lv = await all_leaves(page)
    for leaf in lv:
        if "+41" in leaf or (len(leaf) > 4 and leaf[0].isupper()
                              and leaf not in ["Walk-in Customer", "Customers"]):
            before = await body_text(page)
            if await click_text(page, leaf):
                await asyncio.sleep(1.5)
                if (await body_text(page)) != before:
                    await shot(page, "customers_detail_open",
                               "Customer detail + order history")
                    await navigate_to_tab(page, "Orders")
                    await asyncio.sleep(1)
                    await navigate_to_tab(page, "Customers")
                    await asyncio.sleep(2)
                break


# ═══════════════════════════════════════════════════════════════════════════════
#  7. REPORTS TAB
# ═══════════════════════════════════════════════════════════════════════════════

async def reports_tab(page: Page):
    print("\n━━━  7 · REPORTS  ━━━")
    await force_close_all_overlays(page)
    await navigate_to_tab(page, "Reports")
    await asyncio.sleep(3)
    await shot(page, "reports_overview", "Reports overview",
               must_differ=False, expect=["Sales"])

    # Skip "Overview" — already captured as reports_overview above
    for tab_en in ["Sales", "Inventory", "Returns", "Finance", "Activity"]:
        if await click_text(page, tab_en):
            await asyncio.sleep(2)
            await shot(page, f"reports_{tab_en.lower()}",
                       f"Reports: {tab_en}", must_differ=False)

    # Export
    before = await body_text(page)
    for txt in ["Export", "Download"]:
        if await click_text(page, txt):
            await asyncio.sleep(1)
            if (await body_text(page)) != before:
                await shot(page, "reports_export_options",
                           "Export options dialog")
                await navigate_to_tab(page, "Orders")
                await asyncio.sleep(1)
                await navigate_to_tab(page, "Reports")
                await asyncio.sleep(2)
            break


# ═══════════════════════════════════════════════════════════════════════════════
#  8. SETTINGS TAB
# ═══════════════════════════════════════════════════════════════════════════════

async def settings_tab(page: Page):
    print("\n━━━  8 · SETTINGS  ━━━")
    await force_close_all_overlays(page)
    await navigate_to_tab(page, "More")
    await asyncio.sleep(2)
    await shot(page, "settings_main_page", "Settings — main page",
               must_differ=False, expect=["Language"])

    # These match the actual leaf text on the settings page
    ROWS = [
        "Store Settings", "Payment Gateways", "Bulk Import",
        "Employees", "Branches", "Suppliers", "Expenses",
        "Attendance", "Shift Monitor", "Purchase Orders",
        "Activity Log", "Returns & Refunds", "Cash Drawer",
        "Warehouses", "Product Batches", "Vehicles",
        "Daily Closing", "Monthly Closing", "Accounts Receivable",
        "Language", "Receipt Printer", "Printer Configuration",
    ]

    for en in ROWS:
        await navigate_to_tab(page, "More")
        await asyncio.sleep(1.5)
        before_lv = await all_leaves(page)
        before_url = page.url
        if await click_text(page, en):
            await asyncio.sleep(2)
            after_lv  = await all_leaves(page)
            after_url = page.url
            if after_lv != before_lv or after_url != before_url:
                await shot(page, f"settings_{en.lower().replace(' ', '_').replace('&', 'and')}",
                           f"Settings: {en}", must_differ=False)
                print(f"  ✔ Settings '{en}'")
                # Close opened setting
                await navigate_to_tab(page, "Orders")
                await asyncio.sleep(1)
                await navigate_to_tab(page, "More")
                await asyncio.sleep(1.5)
            else:
                print(f"  ⚠️  Settings '{en}' — no change detected")


# ═══════════════════════════════════════════════════════════════════════════════
#  9. ONLINE STORE
# ═══════════════════════════════════════════════════════════════════════════════

async def online_store(page: Page):
    print("\n━━━  9 · ONLINE STORE  ━━━")
    await page.goto(STORE_URL, wait_until="domcontentloaded")
    await asyncio.sleep(3)

    await shot(page, "store_homepage_hero", "Store homepage — hero",
               expect=["Pizza"])
    await page.evaluate("window.scrollTo(0, 400)")
    await asyncio.sleep(0.5)
    await shot(page, "store_menu_section", "Store — menu section")
    await page.evaluate("window.scrollTo(0, 900)")
    await asyncio.sleep(1)
    await shot(page, "store_product_grid", "Store — product grid")

    # Open product modal
    for product in ["Lemon Pizza", "Porcini", "Spezial", "Margherita", "Padrone"]:
        before = await body_text(page)
        if await click_text(page, product):
            await asyncio.sleep(2)
            b2 = await body_text(page)
            if b2 != before:
                await shot(page, "store_product_detail",
                           "Product detail — size + toppings",
                           expect=["Warenkorb"])
                lv2 = await all_leaves(page)
                print(f"  Product modal: {lv2[:10]}")
                # Add to cart
                for add_txt in ["In den Warenkorb", "Add to Cart"]:
                    if await click_text(page, add_txt):
                        await asyncio.sleep(1.5)
                        await shot(page, "store_added_to_cart",
                                   "Product added — cart count updated",
                                   expect=["1"])
                        await page.keyboard.press("Escape")
                        await asyncio.sleep(1)
                        break
                break

    # Open cart sidebar
    before = await body_text(page)
    for txt in ["Warenkorb anzeigen", "View Cart", "Cart"]:
        if await click_text(page, txt):
            await asyncio.sleep(2)
            b2 = await body_text(page)
            if b2 != before:
                await shot(page, "store_cart_open",
                           "Store cart sidebar open",
                           expect=["Warenkorb"])
                break

    # Checkout form is inline in cart sidebar
    b_cart = await body_text(page)
    if "Bestellen" in b_cart or "VOLLSTÄNDIGER NAME" in b_cart:
        await shot(page, "store_checkout_form",
                   "Store checkout form in cart sidebar",
                   expect=["Bestellen"])
        # Fill form
        try:
            inps = page.locator('input, textarea')
            for i in range(await inps.count()):
                el = inps.nth(i)
                if not await el.is_visible():
                    continue
                ph = (await el.get_attribute("placeholder") or "").lower()
                tp = (await el.get_attribute("type") or "").lower()
                nm = (await el.get_attribute("name") or "").lower()
                lb = (await el.get_attribute("aria-label") or "").lower()
                combined = ph + nm + lb
                if "name" in combined or "vollständig" in combined:
                    await el.fill("Ahmed Mohamed - Test Order")
                elif "phone" in combined or tp == "tel":
                    await el.fill("+41 79 888 7766")
                elif "email" in combined or tp == "email":
                    await el.fill("ahmed@test.ch")
                elif "address" in combined or "adresse" in combined:
                    await el.fill("Limmatquai 82, 8001 Zurich")
                elif "note" in combined or "anweisung" in combined:
                    await el.fill("Please deliver quickly, ring doorbell twice")
        except Exception as e:
            print(f"  ⚠️  Form fill error: {e}")
        await asyncio.sleep(0.5)
        await shot(page, "store_checkout_form_filled",
                   "Store checkout form filled with English data")


# ═══════════════════════════════════════════════════════════════════════════════
#  10. INCOMING CALL SIMULATION
# ═══════════════════════════════════════════════════════════════════════════════

async def incoming_call_simulation(page: Page):
    print("\n━━━  10 · INCOMING CALL  ━━━")
    await click_text(page, "POS")
    await asyncio.sleep(2)
    if "barmagly.tech/app" not in page.url:
        await page.goto(POS_URL, wait_until="domcontentloaded")
        await asyncio.sleep(3)
        b = await body_text(page)
        if "PIN" in b:
            for d in EMP_PIN:
                await click_text(page, d)
                await asyncio.sleep(0.15)
            await asyncio.sleep(2)

    await force_close_all_overlays(page)
    await shot(page, "pos_before_call", "POS — before incoming call",
               no_overlay=True, expect=["POS"])

    await page.evaluate("""
    window.dispatchEvent(new CustomEvent('barmagly-incoming-call', {
        detail: {
            id: 'demo-call-001', slot: 0,
            phoneNumber: '+41 79 555 0099',
            customerName: 'Khaled Mansouri',
            customer: {
                id: 999, name: 'Khaled Mansouri',
                phone: '+41 79 555 0099',
                address: 'Bahnhofstrasse 42, 8001 Zurich',
                email: 'khaled@test.ch'
            },
            dbCallId: '999'
        }
    }));
    """)
    await asyncio.sleep(2.5)
    await shot(page, "incoming_call_popup",
               "Incoming call popup — customer data shown", must_differ=True)
    await asyncio.sleep(2)
    await shot(page, "pos_cart_linked_to_caller",
               "Cart auto-linked to caller")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

async def main():
    print("=" * 60)
    print("  POS BROCHURE SCREENSHOT SCRIPT — ANALYSE & FIX")
    print(f"  Output: {OUT_DIR}")
    print("=" * 60)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H},
            device_scale_factor=2,
        )
        page = await ctx.new_page()

        # 1. Login
        await do_login(page)

        # 2. POS main + cart
        await pos_main_screen(page)

        # 2b. Notes modal (closes cleanly via Save Note button)
        await pos_notes_modal(page)

        # 2c. Customer picker (closes via tab nav)
        await pos_customer_picker_modal(page)

        # 2d. Invoice history (closes via tab nav)
        await pos_invoice_history(page)

        # 2f. Zero Out Shift (closes via tab nav)
        await pos_zero_out_shift(page)

        # 3. Checkout (need product in cart first)
        await add_product_to_cart(page, "Lemon Pizza", "33cm — CHF 21.00")
        await pos_checkout_flow(page)

        # 2e. Call history (after checkout — panel close doesn't matter)
        await pos_call_history(page)

        # 4. Online Orders
        await online_orders_tab(page)

        # 5. Products
        await products_tab(page)

        # 6. Customers
        await customers_tab(page)

        # 7. Reports
        await reports_tab(page)

        # 8. Settings
        await settings_tab(page)

        # 9. Online Store
        await online_store(page)

        # 10. Call simulation
        await incoming_call_simulation(page)

        # Summary
        ok    = sum(1 for e in _log if e["status"] == "ok")
        dups  = sum(1 for e in _log if e["status"] == "duplicate")
        empty = sum(1 for e in _log if e["status"] == "empty")
        print("\n" + "=" * 60)
        print(f"  DONE — {ok} saved | {dups} duplicates | {empty} empty")
        print(f"  Folder: {OUT_DIR.resolve()}")
        print("=" * 60)

        await browser.close()


asyncio.run(main())
