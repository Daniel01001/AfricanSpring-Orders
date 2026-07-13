# AfricanSpring Orders

Customer ordering portal (web + installable PWA) for AfricanSpring ice & water.
Plain static site — HTML/CSS/JS, no build step. It calls the inventory app's
public API for products, orders, and customer accounts.

## What it does
- Browse products (live from the app) and build a cart.
- Guest checkout (name / phone / address / time) → order lands in the app.
- Optional **account**: register (creates a Pending store for the team to approve)
  or log in; logged-in orders attach to the customer's store, and they can see
  their linked businesses, balances, and recent orders.
- Installable PWA (service worker + manifest) — "Add to Home Screen".

## Configuration
The only setting is the API host, at the top of [`js/app.js`](js/app.js):

```js
const API_BASE = "https://app.africanspring.co.za";
```

Change it only if the inventory app moves to a different host. The API already
allows cross-origin calls (CORS) and needs the `Portal__TokenSecret` env var set
on the inventory app for logins to work.

## Deploy on Render
Static Site, no build:
- **Build command:** _(empty)_
- **Publish directory:** `.`
- Or use the included `render.yaml` (New → Blueprint).

Then add the custom domain (e.g. `order.africanspring.co.za`) in Netlify →
Settings → Custom Domains, and point the DNS `CNAME` as Render instructs.

## Local preview
Serve the folder over HTTP (service workers need http/https, not file://):

```bash
python -m http.server 8080
# then open http://localhost:8080
```

## Files
- `index.html` — app shell + screens
- `css/styles.css` — cobalt theme (matches the staff app)
- `js/app.js` — all logic + API calls
- `manifest.webmanifest`, `service-worker.js` — PWA
- `icon-*.png`, `apple-touch-icon.png`, `favicon-32.png` — icons
