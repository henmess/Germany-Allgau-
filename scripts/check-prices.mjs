// Checks current prices for the trip's flights and hotels via SerpApi
// (Google Flights / Google Hotels) and appends them to data/prices.json.
// Runs from .github/workflows/prices.yml; needs the SERPAPI_KEY secret.
import { readFile, writeFile } from "node:fs/promises";

const KEY = process.env.SERPAPI_KEY;
const FILE = new URL("../data/prices.json", import.meta.url);
const PARTY = { adults: 2, children: 3, ages: "3,7,10" };

const ITEMS = [
  { id: "flights", kind: "flight", name: "✈️ טיסות אל על LY353 / LY354", paid: 8760,
    params: { departure_id: "TLV", arrival_id: "MUC", outbound_date: "2027-04-23", return_date: "2027-04-29", flight: "LY 353" } },
  { id: "centerparcs", kind: "hotel", name: "🌲 סנטר פארקס אלגוי (3 לילות)", paid: 2520,
    params: { q: "Center Parcs Park Allgäu Leutkirch", check_in_date: "2027-04-23", check_out_date: "2027-04-26", match: ["center parcs", "allg"] } },
  { id: "garmisch", kind: "hotel", name: "🏔️ מלון Rheinischer Hof בגרמיש (2 לילות)", paid: 1355,
    params: { q: "Hotel Rheinischer Hof Garmisch-Partenkirchen", check_in_date: "2027-04-26", check_out_date: "2027-04-28", match: ["rheinischer"] } },
  { id: "atomis", kind: "hotel", name: "🛏️ מלון Atomis ליד שדה התעופה (לילה)", paid: 643,
    params: { q: "Atomis Hotel Munich Airport", check_in_date: "2027-04-28", check_out_date: "2027-04-29", match: ["atomis"] } }
];

async function serp(params) {
  const u = new URL("https://serpapi.com/search.json");
  for (const [k, v] of Object.entries({ ...params, currency: "ILS", hl: "en", gl: "il", api_key: KEY })) u.searchParams.set(k, v);
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || "HTTP " + r.status);
  return j;
}

async function flightPrice(p) {
  const j = await serp({ engine: "google_flights", type: 1, departure_id: p.departure_id, arrival_id: p.arrival_id,
    outbound_date: p.outbound_date, return_date: p.return_date, adults: PARTY.adults, children: PARTY.children, include_airlines: "LY" });
  const all = [...(j.best_flights || []), ...(j.other_flights || [])];
  const ours = all.find(o => (o.flights || []).some(f => (f.flight_number || "").replace(/\s/g, "") === p.flight.replace(/\s/g, "")));
  const pick = ours || all.filter(o => o.price).sort((a, b) => a.price - b.price)[0];
  if (!pick || !pick.price) throw new Error("no LY flight price in results");
  return { price: pick.price, exact: !!ours, link: j.search_metadata?.google_flights_url };
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

async function hotelPrice(p) {
  const j = await serp({ engine: "google_hotels", q: p.q, check_in_date: p.check_in_date, check_out_date: p.check_out_date,
    adults: PARTY.adults, children: PARTY.children, children_ages: PARTY.ages });
  const matches = h => p.match.every(m => (h?.name || "").toLowerCase().includes(m));
  let h = j.name && matches(j) ? j : (j.properties || []).find(matches);
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
    const r = it.kind === "flight" ? await flightPrice(it.params) : await hotelPrice(it.params);
    rec.history = rec.history.filter(h => h.d !== today);
    rec.history.push({ d: today, p: Math.round(r.price) });
    rec.history = rec.history.slice(-120);
    rec.exact = r.exact;
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
