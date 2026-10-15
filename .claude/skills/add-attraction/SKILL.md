---
name: add-attraction
description: Add, replace, move or remove an attraction in a trip site built like this repo (single-page Hebrew index.html). Use whenever the user asks to add/swap/drop a sight, cable car, park, museum or other stop on a trip day, so every place on the page that mentions attractions stays in sync.
---
# Add / replace an attraction

An attraction appears in **many places** in `index.html`. Update all of them, then run the route check.
All visible text is Hebrew; wrap Latin names / times that reorder inside `<bdi dir="ltr">`.

## 1. Research first (WebSearch; official site first)
Collect, for the planned date:
- Opening season, days and hours, last ascent/entry, annual maintenance (cable cars: April/May, November).
- Prices **by age** (adult, child brackets, free-under age, family ticket) — the party is in the cost inputs
  (`inAdults`, `inAges`; default 2 adults, kids 3, 7, 10).
- Whether **advance booking** is required / recommended / not needed, and the official **English** URL
  (`/en`, `/english`, `?lang=en`). Say clearly when only last year's data exists.
- Stroller suitability, cash-only payment, parking cost.
- Exact location (lat, lon) and a good Commons photo filename (search Wikimedia Commons).

## 2. Day timeline (`<section id="dayN">`, `<ol class="tl">`)
Add an `<li class="key">` at the right time, following the existing pattern:
```html
<li class="key"><time>HH:MM</time><div class="what"><b>EMOJI שם<span class="pram ok|part|no">👶 …</span></b>
  <small class="pn">stroller note</small>
  <small class="bk need|rec|no"><span class="tg">🔴 נדרשת הזמנה מראש | 🟡 מומלץ לקנות אונליין | ✅ אין צורך בהזמנה</span>short note · <a href="ENGLISH_URL" target="_blank" rel="noopener">לאתר (EN) ↗</a></small>
  <small>description · <a class="nav" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=PLACE+NAME">🗺️ גוגל מפות</a></small>
</div></li>
```
- Waze buttons are added automatically next to every Google Maps `dir` link — don't add them by hand.
- Fix the `drive` rows (`<li class="drive">`) before/after it, and every later time in that day.
- If the risk of closure is real, add `<small class="bk rec"><span class="tg">⚠️ לבדוק שפועל</span>… + alternative</small>`.

## 3. Day header / summary data
- `DAYS[N]` in the costs script: add the key to `attr: [...]`, and update `drive`, `km`, `parking`
  if the route changes; `lat/lon/place` drive the weather badge and sunrise/sunset.
- Chips/kicker text of the day card if they name the attractions.

## 4. Cost model (`var ATTR = { … }` in the costs script)
Add an entry with per-age pricing:
```js
key: { name: "שם", ad: 12, kid: function(g){ return g < 4 ? 0 : g <= 14 ? 6 : 12; },
       fam: function(a, paying){ return a === 2 ? 30 : null; } },   // fam optional
```
Update the "הנחות החישוב" `<ul>` in `#costs` with the prices and age rules you used.

## 5. Map (`var ATTR = [ … ]` in the map script)
`{ n: "שם", ph: "Commons file.jpg|fallback.jpg", e: "EMOJI", d: "יום D.M", ll: [lat, lon], day: "dayN" }`

## 6. Other sections
- `#open` table ("פתוח בתאריכים שלנו?"): a row with ✅/⚠️/❌ status and the source year.
- `#cams`: add a foto-webcam.eu camera if one exists nearby (optional).
- Overview / attraction lists anywhere else on the page (grep the old name when replacing/removing).
- Lunch menus (`dialog.menu-dlg`) only if the restaurant changes.

## 7. Check and ship
1. `grep` the page for the old name (when replacing/removing) — no leftovers.
2. Load the page (Playwright, mobile 390px + desktop): no JS errors, no horizontal overflow,
   cost table still adds up.
3. Run the **route-checker** agent (see CLAUDE.md) — this is an itinerary change.
4. Commit, push, and tell the user in Hebrew: what changed, booking status, price, anything unverified.
   Remind them to refresh with Ctrl+Shift+R after 2–3 minutes.
