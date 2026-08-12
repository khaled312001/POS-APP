# Kassenta website — image brief and generation prompts

Every image slot on **kassenta.com** is listed below with the exact file name, size
and a ready-to-paste prompt for ChatGPT / DALL·E / Midjourney.

> ## ✅ All 16 images are live
>
> Delivered on 12 August 2026 and processed by
> [`scripts/optimize-site-images.py`](../scripts/optimize-site-images.py):
> **28.9 MB → 1.4 MB** (95% smaller) as WebP q82, capped at a 1600 px long edge.
>
> **Nothing was cropped.** The generator returned different aspect ratios than the
> brief asked for on several slots, so the page layout follows the artwork instead —
> the ratios below are the delivered ones, not the requested ones.
>
> To replace an image: drop the new file in `new images/`, re-run the script, then
> rebuild and deploy. Update the ratio in `server/site/pages.ts` if the shape changed.

| Slot | Delivered | Ratio | WebP |
|---|---|---|---|
| `hero-pos-tablet` | 1122 × 1402 | 4 / 5 | 56 KB |
| `home-order-flow` | 1600 × 900 | 16 / 9 | 75 KB |
| `home-swiss-receipt` | 1122 × 1402 | 4 / 5 | 66 KB |
| `home-devices` | 1536 × 1024 | 3 / 2 | 101 KB (alpha kept — cut-out) |
| `feature-pos-grid` | 1448 × 1086 | 4 / 3 | 67 KB |
| `feature-online-store` | 1024 × 1536 | 2 / 3 | 119 KB |
| `feature-modules` | 1536 × 1024 | 3 / 2 | 81 KB |
| `industry-cafe` | 1122 × 1402 | 4 / 5 | 91 KB |
| `industry-restaurant` | 1122 × 1402 | 4 / 5 | 83 KB |
| `industry-supermarket` | 1122 × 1402 | 4 / 5 | 96 KB |
| `industry-pharmacy` | 1402 × 1122 | 5 / 4 | 50 KB |
| `industry-bakery` | 1198 × 1313 | 21 / 23 | 177 KB |
| `industry-retail` | 1402 × 1122 | 5 / 4 | 99 KB |
| `compliance-audit` | 1402 × 1122 | 5 / 4 | 109 KB |
| `about-team` | 1023 × 1537 | 2 / 3 | 86 KB |
| `og-image` | 1200 × 630 | — | 74 KB JPEG, typography composited by `generate-og-image.py` |

---

## How to use this document

1. Generate the image with the prompt under each slot.
2. Save it as **`<slot-id>.webp`** — the file name must match exactly.
3. Drop it into `public/brand/site/` in the repository.
4. Deploy. No code change is needed; the page picks the file up automatically.

Until a file exists, the page shows a neutral striped placeholder with the slot id
on it, so an incomplete set never breaks the layout.

### Export settings

| Setting | Value |
|---|---|
| Format | WebP, quality 82 (fall back to JPEG only if WebP is unavailable) |
| Colour profile | sRGB |
| Target file size | under 250 KB per image; under 400 KB for the two 1920 px wide ones |
| Naming | lowercase, exactly the slot id, `.webp` extension |

> Resize to the pixel size given for each slot **before** exporting. Generators
> usually output a square; crop to the stated aspect ratio rather than letting the
> browser squash it.

---

## House style — prepend this to every prompt

Paste this block first, then the slot-specific prompt underneath it.

```
STYLE GUIDE — Kassenta POS (Swiss point-of-sale software)

Look: modern editorial product photography. Clean, calm, premium, understated.
Think Swiss design magazine, not stock-photo website.

Lighting: soft, natural, directional daylight from one side. Gentle shadows.
No harsh flash, no heavy vignette, no HDR, no lens flare.

Colour: neutral warm-grey and off-white base. The only saturated accents are
deep navy #040E32 and teal #00C1B0, used sparingly and only on the software
interface itself or on small brand details.

Composition: generous negative space, especially on the side where text will sit.
Shallow depth of field. Shot at eye level or slightly above. Realistic proportions.

Absolutely avoid: emoji, cartoon or 3D-render style, illustrated flat-vector people,
stock-photo grins, thumbs-up gestures, floating UI cards in mid-air, glowing neon,
lens flare, fake dashboard charts with meaningless spikes, text or logos other than
the word "Kassenta", watermarks, borders, drop shadows baked into the image.

Text in the image: only render the word "Kassenta" if a logo is called for. Do not
generate any other readable words — placeholder text must be blurred or abstracted,
because generated lettering always comes out misspelled.

People: if people appear they are real working staff in ordinary work clothes,
mid-task, not looking at the camera. Diverse and age-appropriate for the setting.
Hands doing real work are preferred over faces.
```

---

# Home page

## 1. `hero-pos-tablet`

- **File:** `public/brand/site/hero-pos-tablet.webp`
- **Size:** 1200 × 1500 px (portrait 4:5)
- **Where:** the main hero, right-hand column, first thing visitors see
- **Alt text:** Kassenta POS running on a tablet at a restaurant counter

```
A 12-inch tablet in a matte black stand on a clean restaurant service counter,
photographed slightly from the side at eye level, portrait orientation.

The tablet screen shows a point-of-sale interface: a grid of food item tiles on
the left two thirds and a running order list on the right third. The interface is
light — near-white background, dark navy text, one teal accent button in the lower
right. The screen is crisp and clearly the focus.

Behind the counter, softly out of focus: a warm timber and pale stone bar back,
a matte black espresso machine edge, one small green plant. Late-morning daylight
from a window on the left. Nobody in frame.

Leave the upper-left area of the frame calm and uncluttered.
```

## 2. `home-order-flow`

- **File:** `public/brand/site/home-order-flow.webp`
- **Size:** 1600 × 1100 px (16:11)
- **Where:** "How it flows" section, paired with the four numbered steps
- **Alt text:** Order flow from customer to kitchen to driver

```
A wide overhead-angled photograph of a small restaurant pass — the counter where
finished orders are handed over.

Three things are visible in one frame, left to right: a phone lying flat showing a
customer ordering screen, a tablet mounted upright showing a live order queue, and
an insulated delivery bag with its flap open, waiting.

Warm stainless steel and pale timber surfaces. Soft daylight from above and left.
A pair of hands at the right edge of the frame reaching for the delivery bag,
sleeve of a plain dark work shirt visible, face not in frame.

Both screens read as light-themed software interfaces with dark navy text and small
teal accents. Keep the middle of the frame uncluttered.
```

## 3. `home-swiss-receipt`

- **File:** `public/brand/site/home-swiss-receipt.webp`
- **Size:** 1250 × 1500 px (portrait 5:6)
- **Where:** "The Swiss details" section
- **Alt text:** Receipt showing Swiss VAT split and cash rounding

```
A close, macro-leaning photograph of a thermal receipt curling out of a compact
white receipt printer on a clean counter, portrait orientation.

The receipt is crisp and clearly readable as a document, with a structured layout:
a small logo block at the top, item lines, then a clearly separated block of
totals at the bottom with two tax lines and a rounding line. Do not render legible
words — keep the type fine and slightly soft so it reads as a real receipt without
spelling anything.

Beside the printer: a few Swiss franc coins, including a 5-rappen piece, lying
naturally. A card terminal edge out of focus in the background.

Cool neutral daylight, shallow depth of field focused on the totals block at the
bottom of the receipt.
```

## 4. `home-devices`

- **File:** `public/brand/site/home-devices.webp`
- **Size:** 1920 × 960 px (16:8, **transparent or pure-white background**)
- **Where:** "Everywhere you work" section — rendered with `object-fit: contain`
- **Alt text:** Kassenta shown on a phone, a tablet and a desktop browser

> This one is a **product mock-up**, not a photograph. It sits on the page
> background, so a transparent PNG converted to WebP works best.

```
A clean product mock-up on a pure white (or transparent) background: three devices
arranged in a row, evenly spaced, all standing upright and facing forward with a
very slight perspective.

Left: a modern smartphone, portrait. Centre: a 12-inch tablet in landscape,
slightly larger and slightly forward. Right: a thin-bezel desktop monitor on a
minimal stand.

Every screen shows the same light-themed point-of-sale software: near-white
background, dark navy typography, a teal primary button, a left product grid and a
right order panel. The layout visibly adapts per device — the phone shows a single
column with a bottom bar, the tablet shows a two-column split, the monitor shows a
three-column layout with a sidebar.

Devices are matte dark grey with no visible brand marks. Soft even studio lighting,
one very subtle contact shadow under each device. No reflections, no gradients in
the background, no floating elements.
```

---

# Features page

## 5. `feature-pos-grid`

- **File:** `public/brand/site/feature-pos-grid.webp`
- **Size:** 1600 × 1100 px (16:11)
- **Alt text:** The Kassenta product grid and cart during a busy service

```
Over-the-shoulder photograph of a member of staff using a tablet point-of-sale
during a busy lunch service. The camera is behind and above their right shoulder;
only the back of the shoulder and one hand touching the screen are in frame.

The tablet screen fills the right two thirds of the image and is sharp: a light
interface with a grid of coloured category chips at the top, product tiles below,
and an order list down the right side with a teal total button at the bottom.

The blurred background shows a busy counter — a queue of two people at the far
edge, warm interior lighting, movement blur on one figure. The staff member wears
a plain dark apron.

Daylight mixed with warm interior light. Keep the left third of the frame calm.
```

## 6. `feature-online-store`

- **File:** `public/brand/site/feature-online-store.webp`
- **Size:** 1600 × 1100 px (16:11)
- **Alt text:** A branded Kassenta online storefront on a phone

```
A customer's hands holding a smartphone at a small café table, photographed from
just above and behind, so the screen is clearly visible and fills a third of the
frame.

The phone shows a food ordering page: a wide restaurant header image at the top, a
horizontal row of category chips, then a vertical list of menu items each with a
small square photo, and a teal "add to cart" button. Light interface, dark navy
type.

On the table beside the phone: a cappuccino in a stoneware cup, a folded paper
napkin, and a small square QR code card standing in a metal holder, slightly out of
focus.

Warm morning daylight from a window on the right. Shallow depth of field on the
phone screen.
```

## 7. `feature-modules`

- **File:** `public/brand/site/feature-modules.webp`
- **Size:** 1400 × 1050 px (4:3)
- **Alt text:** Module switches in the Kassenta owner console

```
A laptop on a tidy back-office desk, photographed at a low three-quarter angle so
the screen is readable and the desk recedes into soft focus.

The screen shows a settings page of business software: a vertical list of rows,
each with a small icon, a label and a toggle switch on the right. Roughly half the
toggles are on and rendered teal, half are off and grey. Light interface, generous
white space, dark navy text.

On the desk: a closed notebook, a black pen, a small potted plant, a ceramic mug.
Nothing branded. Soft daylight from the left, warm neutral wood desk surface.

Keep the right side of the frame open and calm.
```

---

# Industries page

All six use **1400 × 1050 px (4:3)**. Each pairs with a text column on the
opposite side, so keep one side of the frame quiet.

## 8. `industry-cafe`

```
Interior of a small independent café at mid-morning, photographed from the customer
side of the counter at eye level.

On the counter: a tablet in a low black stand showing a light point-of-sale screen
with large square drink tiles. Beside it, a matte black espresso machine with a
barista's hands working the portafilter — face not in frame, plain dark apron.

Background softly out of focus: a shelf of ceramic cups, a small blackboard with
illegible chalk marks, warm pendant lighting.

Warm daylight from the left. Leave the right third of the frame calm.
```

## 9. `industry-restaurant`

```
A restaurant host station at the edge of a dining room, early evening, photographed
at eye level from slightly to the side.

On the station: a tablet showing a table-plan screen — a light interface with a grid
of rounded rectangles in three states (green, amber, grey) representing tables. The
screen is sharp and clearly readable as a floor plan.

Behind it, softly out of focus: laid tables with folded napkins and small glass
candle holders, warm low lighting, a member of waiting staff in dark clothing
walking through with a tray, slightly motion-blurred.

Warm interior light with one cool daylight source from a window. Keep the left third
of the frame quiet.
```

## 10. `industry-supermarket`

```
A supermarket checkout lane photographed from just behind the till, at eye level.

A cashier's hands pass a boxed grocery item over a flatbed scanner. Beside the
scanner, a tablet in a stand shows a light point-of-sale screen with a scrolling
list of scanned items and a large total at the bottom. Screen is sharp.

Background softly out of focus: a conveyor belt with a few everyday grocery items
in neutral unbranded packaging, a shopping basket, aisle shelving receding into
depth.

Even, cool retail lighting with no colour cast. Realistic, ordinary, unglamorous.
Keep the upper right of the frame open.
```

## 11. `industry-pharmacy`

```
A pharmacy counter photographed at eye level from the customer side.

A pharmacist in a white coat, hands only in frame, holds a small unbranded medicine
box beside a tablet in a stand. The tablet shows a light software screen with a
product record: a short list of fields on the left and a small highlighted panel on
the right. Screen is sharp but the field text is fine enough not to be readable.

Background softly out of focus: neat white shelving with uniform pale boxes, a
glass partition, a small green plant.

Clean, cool, even lighting. Clinical but warm, not cold or sterile. Keep the left
third of the frame quiet.
```

## 12. `industry-bakery`

```
A bakery counter in the early morning, photographed at a slight downward angle.

Fresh bread and pastries in wicker baskets fill the lower half of the frame. On the
counter, a small digital scale with a loaf on it, and next to it a tablet showing a
light point-of-sale screen with a weight figure and a price.

A baker's floured hands are reaching in from the right edge, sleeves of a plain
shirt rolled up. Face not in frame.

Warm golden morning daylight from a shopfront window. Flour dust visible in the
light. Keep the upper left of the frame open.
```

## 13. `industry-retail`

```
A small independent clothing shop counter, photographed at eye level.

On the counter: a folded knit garment, a tablet in a stand showing a light
point-of-sale screen with a size-and-colour selection grid, and a small handheld
barcode scanner resting in its cradle.

Background softly out of focus: a clothing rail with neutral-toned garments evenly
spaced, a full-length mirror edge, warm track lighting.

Soft daylight from a shopfront on the left. Calm, minimal, well-merchandised.
Keep the right third of the frame quiet.
```

---

# Compliance page

## 14. `compliance-audit`

- **File:** `public/brand/site/compliance-audit.webp`
- **Size:** 1400 × 1050 px (4:3)
- **Alt text:** Audit trail and permission settings in the Kassenta console

```
A desktop monitor on a tidy accountant's desk, photographed at a slight angle so
the screen is readable.

The screen shows a light software interface: a table of log entries with a
timestamp column, a user column and a small coloured status badge on each row. The
rows are evenly spaced and clearly structured. Keep the text fine enough not to be
readable.

On the desk beside the keyboard: a closed ring binder, a pair of reading glasses, a
paper printout with a printed table lying face up, a black pen.

Neutral cool daylight from the left. Serious, orderly, professional. Keep the right
side of the frame open.
```

---

# About page

## 15. `about-team`

- **File:** `public/brand/site/about-team.webp`
- **Size:** 1200 × 1500 px (portrait 4:5)
- **Alt text:** The Kassenta team working alongside restaurant staff

```
Two people standing at a restaurant counter after service, photographed candidly
from a few metres away at eye level, portrait orientation.

One is a restaurant owner in a dark apron; the other is a software specialist in a
plain shirt holding a tablet slightly angled so a light interface is visible but
not readable. They are looking at the tablet together and talking, mid-gesture.
Neither looks at the camera. Natural, unposed, no smiling at the lens.

The restaurant is empty and softly lit — chairs on tables in the background, one
warm pendant lamp, late-afternoon daylight from a window on the right.

Documentary tone. Warm, real, slightly imperfect.
```

---

# Social sharing image

## 16. `og-image`

- **File:** `public/brand/og-image.png` (note: **not** in `site/`, and **PNG**)
- **Size:** 1200 × 630 px
- **Where:** the link preview card on WhatsApp, LinkedIn, Slack, X, iMessage

> This is a graphic, not a photograph. Text on it must be typeset by hand
> afterwards — do not rely on the generator to spell anything.

```
A wide 1200 × 630 social preview graphic on a deep navy (#040E32) background.

Right half: a clean product mock-up of a tablet standing upright, angled very
slightly, showing a light point-of-sale interface with a product grid and an order
panel. Soft teal glow behind it, low intensity.

Left half: empty space reserved for typography, with a very subtle darker navy
radial gradient. No text generated in the image.

Bottom edge: a thin teal (#00C1B0) accent line running about a third of the width.

Flat, calm, premium. No noise texture, no stars, no abstract particles.
```

After generating, add in a design tool:

- **Headline (left half, 64 px, weight 800, white):** `Kassenta POS`
- **Sub-line (left half, 30 px, weight 500, #B9C3D8):** `Point of sale, online ordering and delivery in one system`
- **Logo mark** in the top-left corner at 48 px

---

# Checklist

| # | Slot id | Size | Page | Done |
|---|---|---|---|---|
| 1 | `hero-pos-tablet` | 1200 × 1500 | Home | ☐ |
| 2 | `home-order-flow` | 1600 × 1100 | Home | ☐ |
| 3 | `home-swiss-receipt` | 1250 × 1500 | Home | ☐ |
| 4 | `home-devices` | 1920 × 960 | Home | ☐ |
| 5 | `feature-pos-grid` | 1600 × 1100 | Features | ☐ |
| 6 | `feature-online-store` | 1600 × 1100 | Features | ☐ |
| 7 | `feature-modules` | 1400 × 1050 | Features | ☐ |
| 8 | `industry-cafe` | 1400 × 1050 | Industries | ☐ |
| 9 | `industry-restaurant` | 1400 × 1050 | Industries | ☐ |
| 10 | `industry-supermarket` | 1400 × 1050 | Industries | ☐ |
| 11 | `industry-pharmacy` | 1400 × 1050 | Industries | ☐ |
| 12 | `industry-bakery` | 1400 × 1050 | Industries | ☐ |
| 13 | `industry-retail` | 1400 × 1050 | Industries | ☐ |
| 14 | `compliance-audit` | 1400 × 1050 | Compliance | ☐ |
| 15 | `about-team` | 1200 × 1500 | About | ☐ |
| 16 | `og-image` (PNG) | 1200 × 630 | Social preview | ☐ |

---

# Adding a new image slot

In `server/site/pages.ts`, call the `shot()` helper:

```ts
${"${shot({"}
  id: "my-new-slot",          // becomes public/brand/site/my-new-slot.webp
  ratio: "16 / 10",           // CSS aspect-ratio
  size: "1600 × 1000",        // shown in the placeholder
  alt: { en: "…", de: "…", ar: "…" },
})}
```

Then add a matching prompt here so the set stays documented.
