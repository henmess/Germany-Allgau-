# Trip website — instructions for Claude

This repo is a single-page Hebrew trip site (`index.html`, RTL) published with GitHub Pages.

## Route check after every itinerary change
Whenever you change the itinerary — days, stops, times, order of attractions, lodging, drive info,
flights or opening-hours notes — run the **route-checker** agent (`.claude/agents/route-checker.md`)
before you commit and push:
- If the `route-checker` agent type is available, use it. Otherwise start a general-purpose agent
  and give it the full instructions from `.claude/agents/route-checker.md` as its prompt.
- Ask it to write the report to the scratchpad (not into the repo).
- Fix clear mistakes you introduced; report the rest to the user in Hebrew, short:
  verdict, the 🔴/🟡 findings with a suggested fix, and what could not be verified.
Changes that don't touch the itinerary (styling, price tracker, icons) don't need a route check.

## Conventions
- All user-facing text is Hebrew; wrap numbers/times inside Hebrew text in `<bdi dir="ltr">` when they reorder.
- Check mobile widths (320–414px) for horizontal overflow after layout changes.
- Users refresh with Ctrl+Shift+R; Pages updates take 2–3 minutes after a push.
