---
name: new-trip-site
description: Build a new family-trip website (e.g. Black Forest) using this repo's Allgäu site as the template — single-page Hebrew RTL index.html on GitHub Pages with day timelines, live ticker, weather, sunrise/sunset, costs by age, map, price tracker, parking/fuel tools, webcams, emergency numbers, PDF and home-screen icon. Use when the user wants a site for another trip.
---
# New trip site from the Allgäu template

Template: `henmess/Germany-Allgau-` (`index.html`, `app.webmanifest`, `icons/`, `scripts/check-prices.mjs`,
`.github/workflows/prices.yml`, `data/prices.json`, `.claude/`, `CLAUDE.md`, `.nojekyll`).
If the target repo is a different one, read the template from GitHub (or clone it) and copy those files in.

## 1. Collect the trip facts (ask only for what is missing)
Dates; flights (numbers, times, airports); party (adults, kids' ages, stroller?); rental car model and fuel;
lodging per night (name, address, nights, what was paid in ₪); fixed costs already paid
(flights, hotels, car); the wish-list of attractions and the pace (departure time each morning).

## 2. Plan the route
Group attractions by lodging so drives are short; one "big" thing per day for young kids;
long drives on check-out days; airport day with ≥ 3 h margin for an Israel flight.
Check opening on the dates, booking needs and prices by age (same research as the `add-attraction` skill).
Show the user the day-by-day plan in chat and get a yes before building.

## 3. Build — replace content, keep the machinery
Copy the template, then change **content only**:
- `<title>`, header/kicker, hero, trip dates (`TRIP_START`, `TRIP_DATES`, `SUN_DATES`, trip-end checks),
  flight numbers/times in the ticker and day 1 / last day.
- Day sections `#day1…#dayN` and the sticky day nav (`#daynav`) — one per trip day; timeline rows as in
  the `add-attraction` skill; restaurants with kids' menus in `dialog.menu-dlg` popups.
- `DAYS` (lat/lon, place, drive, km, parking, attr keys, typical weather, lunch/dinner type),
  cost `ATTR` (per-age prices), `FIXED` costs, `MEAL` prices, default `inAges`.
- Map `ATTR` + hotel markers (square photos), webcams (`#cams`, foto-webcam.eu slugs near the route),
  `#open` table, `#sos` emergency numbers for the countries visited, tips, packing hints.
- Ticker "now" weather location (the first lodging) and fuel-price country.
- Price tracker: `ITEMS` in `scripts/check-prices.mjs` (flights TLV↔airport with flight numbers,
  each hotel with dates, `match` words, `family: true` for family rooms) and the `BASE` map in the page.
  The user must add the `SERPAPI_KEY` secret in the new repo.
- Home-screen icon: new `icons/*` (flag/theme of the region) with a new file name + `?v=` and manifest `id`,
  `name`/`short_name` in `app.webmanifest`.
- `CLAUDE.md`: keep the route-check rule; keep `.claude/agents/route-checker.md` and these skills.

Remove every Allgäu-specific leftover: `grep -n -i "allg\|leutkirch\|garmisch\|zugspitze\|LY353"`.

## 4. Verify
Playwright at 320/390/414 px and desktop: no JS errors, no horizontal scroll, every day renders,
cost table sums, map markers, PDF print preview (each day on a new page).
Run the **route-checker** agent on the new itinerary and fix 🔴 findings.

## 5. Publish
Commit and push; enable GitHub Pages (Settings → Pages → branch, root) and give the user the URL,
plus the one-time steps: `SERPAPI_KEY` secret, add to home screen.
