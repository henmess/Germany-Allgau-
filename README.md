# הטיול שלנו לאלגוי 🏔️

אתר עם מסלול הטיול המשפחתי לאלגוי ולגרמיש-פרטנקירכן (23–29 באפריל):
לו״ז יומי (יציאה כל בוקר ב־9:00), אטרקציות, לינה, קישורי ניווט ותמונות אמיתיות מ־Wikimedia Commons.

## צפייה
- לפתוח את `index.html` בדפדפן, או
- להפעיל GitHub Pages: Settings → Pages → Deploy from a branch → בוחרים את הענף ואת התיקייה `/ (root)`.

## מעקב מחירים

`.github/workflows/prices.yml` רץ כל יומיים, מריץ את `scripts/check-prices.mjs` (בודק ב־Google Flights / Google Hotels דרך SerpApi) ושומר את התוצאות ב־`data/prices.json`. האתר מציג אותן בכרטיס "📉 מעקב מחירים" בסיכום העלויות.
כדי להפעיל: להוסיף ב־Settings → Secrets and variables → Actions סוד בשם `SERPAPI_KEY` עם המפתח מ־serpapi.com. אפשר להריץ ידנית מלשונית Actions → Price tracker → Run workflow.
