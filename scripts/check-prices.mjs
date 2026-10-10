// Checks current prices for the trip's flights and hotels via SerpApi
// (Google Flights / Google Hotels) and appends them to data/prices.json.
// Runs from .github/workflows/prices.yml; needs the SERPAPI_KEY secret.
import { readFile, writeFile } from "node:fs/promises";

const KEY = process.env.SERPAPI_KEY;
const FILE = new URL("../data/prices.json", import.meta.url);
const PARTY = { adults: 2, children: 3, ages: "3,7,10" };

const ITEMS = [
  { id: "flights", kind: "flight", name: "✈️ טיסות אל על LY353 / LY354", paid: 8760,
    params: { departure_id: "TLV", arrival_id: "MUC", outbound_date: "2027-04-23", return_date: "2027-04-29", flight: "LY 353", back: "LY 354" } },
  { id: "centerparcs", kind: "hotel", name: "🌲 סנטר פארקס אלגוי (3 לילות)", paid: 2520,
    params: { q: "Center Parcs Park Allgäu Leutkirch", check_in_date: "2027-04-23", check_out_date: "2027-04-26", match: ["center parcs", "allg"], room: /premium/i } },
  { id: "garmisch", kind: "hotel", name: "🏔️ מלון Rheinischer Hof בגרמיש (2 לילות)", paid: 1355,
    params: { q: "Hotel Rheinischer Hof Garmisch-Partenkirchen", check_in_date: "2027-04-26", check_out_date: "2027-04-28", match: ["rheinischer"], room: /famil/i, family: true } },
  { id: "atomis", kind: "hotel", name: "🛏️ מלון Atomis ליד שדה התעופה (לילה)", paid: 643,
    params: { q: "Atomis Hotel Munich Airport", check_in_date: "2027-04-28", check_out_date: "2027-04-29", match: ["atomis"], room: /famil/i, family: true } }
];

async function serp(params) {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries({ ...params, currency: "ILS", hl: "en", gl: "il", api_key: KEY })) u.searchParams.set(k, v);
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok || (j.error && !/hasn't returned any results/i.test(j.error))) throw new Error(j.error || "HTTP " + r.status);
  return j;
}

const norm = x => (x || "").replace(/\s/g, "").toUpperCase();
const hasFlight = (o, fn) => (o.flights || []).some(f => norm(f.flight_number) === norm(fn));

// Google shows El Al's own price for the cheapest fare (Lite) for the whole party.
// It does not break fares down (Lite / Classic), so this tracks the Lite trend.
async function flightPrice(p) {
  const j = await serp({ engine: "google_flights", type: 1, departure_id: p.departure_id, arrival_id: p.arrival_id,
    outbound_date: p.outbound_date, return_date: p.return_date, adults: PARTY.adults, children: PARTY.children, include_airlines: "LY" });
  const all = [...(j.best_flights || []), ...(j.other_flights || [])];
  const ours = all.find(o => hasFlight(o, p.flight));
  const pick = ours || all.filter(o => o.price).sort((a, b) => a.price - b.price)[0];
  if (!pick || !pick.price) throw new Error("no LY flight price in results");
  return { price: pick.price, exact: !!ours, fare: "המחיר באתר אל על לתעריף לייט לכל 5 הנוסעים (אנחנו קנינו 2 קלאסיק + 3 לייט)", link: j.search_metadata?.google_flights_url };
}

// Fallback for hotels Google shows without a price: Xotelo via RapidAPI (rates from Booking.com & co.).
// Needs the RAPIDAPI_KEY secret; skipped without it.
const RAPID = process.env.RAPIDAPI_KEY;
async function xotelo(p) {
  if (!RAPID) throw new Error("no price on Google (Booking fallback needs RAPIDAPI_KEY)");
  const host = "xotelo-hotel-prices.p.rapidapi.com";
  const get = async path => {
    const r = await fetch("https://" + host + path, { headers: { "x-rapidapi-key": RAPID, "x-rapidapi-host": host } });
    const j = await r.json();
    if (!r.ok || j.error) throw new Error("xotelo " + r.status + ": " + JSON.stringify(j.error || j.message || j).slice(0, 200));
    return j.result;
  };
  const found = await get("/api/search?query=" + encodeURIComponent(p.xq || p.q));
  const list = found?.list || [];
  console.log("  xotelo search:", list.slice(0, 4).map(x => `${x.name} [${x.hotel_key}]`).join(" | ") || "(none)");
  const hit = list.find(x => p.match.every(m => (x.name || "").toLowerCase().includes(m)));
  if (!hit) throw new Error("xotelo: hotel not found");
  const res = await get(`/api/rates?hotel_key=${hit.hotel_key}&chk_in=${p.check_in_date}&chk_out=${p.check_out_date}&currency=ILS&adults=2&rooms=1`);
  const rates = (res?.rates || []).filter(r => Number.isFinite(r.rate));
  console.log("  xotelo rates (" + (res?.currency || "?") + "):", rates.map(r => `${r.name}: ${r.rate}+${r.tax || 0}`).join(" | ") || "(none)");
  const booking = rates.find(r => /booking/i.test(r.name || r.code || ""));
  const best = booking || rates.sort((a, b) => a.rate - b.rate)[0];
  if (!best) throw new Error("xotelo: no rates");
  let total = (best.rate + (best.tax || 0)) * nightsOf(p);
  if (res.currency && res.currency !== "ILS") {
    const fx = await (await fetch("https://open.er-api.com/v6/latest/" + res.currency)).json();
    total *= fx.rates.ILS;
  }
  return { price: total, exact: true, via: best.name || "Booking.com" };
}

function nightsOf(p) { return Math.round((new Date(p.check_out_date) - new Date(p.check_in_date)) / 86400000); }
function hotelTotal(h, p) {
  if (!h) return null;
  const n = nightsOf(p), offers = [...(h.featured_prices || []), ...(h.prices || [])];
  const totals = [h.total_rate?.extracted_lowest, ...offers.map(o => o.total_rate?.extracted_lowest)].filter(Number.isFinite);
  if (totals.length) return Math.min(...totals);
  const nightly = [h.rate_per_night?.extracted_lowest, ...offers.map(o => o.rate_per_night?.extracted_lowest)].filter(Number.isFinite);
  return nightly.length ? Math.min(...nightly) * n : null;
}

// We booked family rooms. Google prices one room for the given party: for 2 adults + 3 kids it often has
// no room at all, so we retry with 2 adults + 2 kids (the 3-year-old usually shares a bed) — a room that
// fits 4 is a family room. A room type named "Family…" is preferred when Google lists room types.
const PARTIES = [
  { label: "חדר משפחתי ל־5", q: { adults: 2, children: 3, children_ages: "3,7,10" } },
  { label: "חדר משפחתי (מחיר ל־2 מבוגרים + 2 ילדים)", q: { adults: 2, children: 2, children_ages: "7,10" } }
];
async function hotelPrice(p) {
  let lastErr;
  for (const party of p.family ? PARTIES : PARTIES.slice(0, 1)) {
    try {
      const r = await hotelPriceFor(p, party.q);
      if (p.family && !r.room) r.fare = party.label;
      console.log("  priced for", JSON.stringify(party.q));
      return r;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
async function hotelPriceFor(p, party) {
  const j = await serp({ engine: "google_hotels", q: p.q, check_in_date: p.check_in_date, check_out_date: p.check_out_date, ...party });
  const matches = h => p.match.every(m => (h?.name || "").toLowerCase().includes(m));
  let h = j.name && matches(j) ? j : (j.properties || []).find(matches);
  if (p.room && h) {
    // Google lists room types per booking site; pick the cheapest offer for the wanted room
    const n = nightsOf(p), rooms = [...(h.featured_prices || []), ...(h.prices || [])].flatMap(o => (o.rooms || []).map(r => ({ ...r, source: o.source })));
    console.log("  room types:", [...new Set(rooms.map(r => r.name))].join(" | ") || "(none listed)");
    const wanted = rooms.map(r => ({ name: r.name, price: r.total_rate?.extracted_lowest ?? (r.rate_per_night?.extracted_lowest ?? r.extracted_price) * n }))
      .filter(r => p.room.test(r.name || "") && Number.isFinite(r.price)).sort((a, b) => a.price - b.price)[0];
    if (wanted) return { price: wanted.price, exact: true, room: wanted.name, link: h.link || j.search_metadata?.google_hotels_url };
    const price = hotelTotal(h, p);
    if (price) return { price, exact: !!p.family, link: h.link || j.search_metadata?.google_hotels_url };
  }
  const price = hotelTotal(h, p);
  if (!price) {
    // debug: show what the response looked like so the lookup can be adjusted
    console.log("  top-level keys:", Object.keys(j).join(","));
    if (h) console.log("  hotel keys:", Object.keys(h).join(","));
    else console.log("  properties:", (j.properties || []).slice(0, 5).map(x => x.name).join(" | "));
    throw new Error(h ? "hotel found but no price" : "hotel not found in results");
  }
  return { price, exact: true, link: h.link || j.search_metadata?.google_hotels_url };
}

const today = new Date().toISOString().slice(0, 10);
let data = { items: {} };
try { data = JSON.parse(await readFile(FILE, "utf8")); } catch {}
data.items ||= {};

if (!KEY) { console.log("SERPAPI_KEY not set — skipping"); process.exit(0); }
if (today >= "2027-04-23") { console.log("Trip has started — nothing to track"); process.exit(0); }

let ok = 0;
for (const it of ITEMS) {
  const rec = data.items[it.id] ||= { history: [] };
  Object.assign(rec, { name: it.name, paid: it.paid });
  try {
    let r;
    if (it.kind === "flight") r = await flightPrice(it.params);
    else {
      try { r = await hotelPrice(it.params); }
      catch (e) { console.log("  google:", e.message, "-> trying Xotelo"); r = { ...(await xotelo(it.params)), link: undefined }; }
    }
    rec.history = rec.history.filter(h => h.d !== today);
    rec.history.push({ d: today, p: Math.round(r.price) });
    rec.history = rec.history.slice(-120);
    rec.exact = r.exact;
    for (const k of ["room", "fare", "fares", "via"]) { if (r[k]) rec[k] = r[k]; else delete rec[k]; }
    if (r.link) rec.link = r.link;
    delete rec.error;
    ok++;
    console.log(it.id, r.price, r.exact ? "" : "(closest match)");
  } catch (e) {
    rec.error = String(e.message || e).slice(0, 200);
    console.log(it.id, "failed:", rec.error);
  }
}
data.checked = new Date().toISOString();
await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`done: ${ok}/${ITEMS.length}`);
