// AfricanSpring ordering portal. Talks to the inventory app's public API.
// If Render gives the app a different host, change API_BASE below.
const API_BASE = "https://app.africanspring.co.za";

const T_KEY = "as.token", CART_KEY = "as.cart", PROD_KEY = "as.products", STORE_KEY = "as.store";
const WHATSAPP = "27839580908";

let products = [];
let me = null;
let activeStoreId = Number(localStorage.getItem(STORE_KEY)) || null;
const cart = new Map(loadCart());

const $ = (id) => document.getElementById(id);
const money = (n) => "R" + Number(n).toFixed(2);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const token = () => localStorage.getItem(T_KEY);
const byId = (id) => products.find((p) => p.id === id);
const count = () => [...cart.values()].reduce((a, b) => a + b, 0);
const subtotal = () => [...cart.entries()].reduce((s, [id, q]) => s + q * (byId(id)?.unitPrice || 0), 0);

function loadCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } }
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify([...cart.entries()])); }

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.auth && token()) headers.Authorization = "Bearer " + token();
  try {
    const res = await fetch(API_BASE + path, {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
}

/* ---------- Navigation ---------- */
function go(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
  $("screen-" + name).classList.add("on");
  window.scrollTo(0, 0);
  if (name === "checkout") renderCheckout();
  if (name === "account") renderAccount();
  if (name === "changepw") $("cpwHint").textContent = me && me.mustChangePassword
    ? "You're using a temporary password from AfricanSpring. Choose your own to finish." : "Choose a new password.";
}

/* ---------- Products + cart ---------- */
async function loadProducts() {
  const r = await api("/api/products");
  if (r.ok && Array.isArray(r.data) && r.data.length) {
    products = r.data;
    localStorage.setItem(PROD_KEY, JSON.stringify(products));
  } else {
    try { products = JSON.parse(localStorage.getItem(PROD_KEY) || "[]"); } catch { products = []; }
  }
  renderProducts();
}
function iconFor(p) { return /water|litre|liter/i.test((p.name || "") + (p.unitType || "")) ? "i-drop" : "i-flake"; }
function renderProducts() {
  const el = $("products");
  if (!products.length) { el.innerHTML = `<div class="loading">Loading products…</div>`; return; }
  el.innerHTML = products.map((p) => {
    const q = cart.get(p.id) || 0;
    const right = q > 0
      ? `<span class="stepper"><button data-dec="${p.id}" aria-label="Less">&minus;</button><span class="n">${q}</span><button data-inc="${p.id}" aria-label="More">+</button></span>`
      : `<button class="addbtn" data-add="${p.id}">Add</button>`;
    return `<div class="prod">
      <span class="thumb"><svg class="icon"><use href="#${iconFor(p)}"/></svg></span>
      <span class="p-main"><div class="p-name">${esc(p.name)}</div><div class="p-unit">${esc(p.unitType || "")}</div><div class="p-price num">${money(p.unitPrice)}</div></span>
      ${right}</div>`;
  }).join("");
}
function setQty(id, q) { q = Math.max(0, q); if (q === 0) cart.delete(id); else cart.set(id, q); saveCart(); renderProducts(); updateCart(); }
function updateCart() {
  const n = count();
  const badge = $("cartBadge");
  if (n) { badge.hidden = false; badge.textContent = n; } else badge.hidden = true;
  $("barTotal").textContent = money(subtotal());
  $("barCount").textContent = n + (n === 1 ? " item" : " items");
  $("cartbar").hidden = n === 0;
}

/* ---------- Checkout ---------- */
function renderCheckout() {
  if (count() === 0) { go("shop"); return; }
  const lines = [...cart.entries()].map(([id, q]) => {
    const p = byId(id); if (!p) return "";
    return `<div class="li"><div><div style="font-weight:600">${esc(p.name)}</div><div class="l-s">${q} &times; ${money(p.unitPrice)} &middot; ${esc(p.unitType || "")}</div><button class="rm" data-rm="${id}">Remove</button></div><div class="l-a num">${money(q * p.unitPrice)}</div></div>`;
  }).join("");

  const picker = (me && me.stores && me.stores.length)
    ? `<div class="field"><label>Business</label><select id="cstore">${me.stores.map((s) => `<option value="${s.id}" ${s.id === activeStoreId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>` : "";
  const acct = me
    ? `<div class="acct">Ordering as <strong>${esc(me.name)}</strong> &middot; <a href="#" data-logout>log out</a></div>`
    : `<div class="acct">Ordering as guest. <a href="#" data-go="login">Log in</a> for saved details.</div>`;

  $("checkout").innerHTML = `
    <div class="card">${lines}
      <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:10px">
        <div class="trow"><span class="m">Subtotal</span><span class="num">${money(subtotal())}</span></div>
        <div class="trow"><span class="m">Delivery</span><span class="free">Free</span></div>
        <div class="trow big"><span>Total</span><span class="num">${money(subtotal())}</span></div>
      </div>
    </div>
    ${acct}
    <form id="orderForm">
      ${picker}
      <div class="field"><label>Name</label><input id="cname" value="${me ? esc(me.name) : ""}" placeholder="Your name" required></div>
      <div class="two">
        <div class="field"><label>Phone</label><input id="cphone" type="tel" value="${me ? esc(me.phone) : ""}" placeholder="083 000 0000" required></div>
        <div class="field"><label>Time</label><select id="ctime"><option>As soon as possible</option><option>Today, afternoon</option><option>Tomorrow, morning</option><option>Tomorrow, afternoon</option></select></div>
      </div>
      <div class="field"><label>Delivery address</label><input id="caddr" placeholder="Street / section" required></div>
      <div class="field"><label>Notes</label><textarea id="cnote" placeholder="Gate code, landmark (optional)"></textarea></div>
      <div class="pay">Pay cash on delivery <span class="tag">Card coming soon</span></div>
      <p class="err" id="orderErr" hidden></p>
      <button class="btn" type="submit" id="placeBtn">Place order &middot; ${money(subtotal())}</button>
    </form>`;

  prefillAddress();
  $("checkout").querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { setQty(Number(b.dataset.rm), 0); count() ? renderCheckout() : go("shop"); }));
  const sel = $("cstore");
  if (sel) sel.addEventListener("change", () => { activeStoreId = Number(sel.value); localStorage.setItem(STORE_KEY, activeStoreId); prefillAddress(); });
  $("orderForm").addEventListener("submit", placeOrder);
}
function prefillAddress() {
  if (!me) return;
  const s = (me.stores || []).find((x) => x.id === activeStoreId);
  const addr = $("caddr");
  if (s && s.location && addr && !addr.value) addr.value = s.location;
}

async function placeOrder(e) {
  e.preventDefault();
  const name = $("cname").value.trim(), phone = $("cphone").value.trim(), addr = $("caddr").value.trim();
  const err = $("orderErr");
  if (!name || !phone || !addr) { err.textContent = "Please add your name, phone and address."; err.hidden = false; return; }
  const time = $("ctime").value, note = $("cnote").value.trim();

  const short = [...cart.entries()].map(([id, q]) => { const p = byId(id); return p ? `${q}x ${p.name}` : ""; }).filter(Boolean).join(", ");
  const itemized = [...cart.entries()].map(([id, q]) => { const p = byId(id); return p ? `${q} x ${p.name} @ ${money(p.unitPrice)}` : ""; }).filter(Boolean).join("\n");
  const details = `Items:\n${itemized}\nTotal: ${money(subtotal())}\nDeliver to: ${addr}\nWhen: ${time}${note ? "\nNotes: " + note : ""}`;

  const body = { name, phone, product: short.slice(0, 120), details, website: "" };
  if (me) { const s = $("cstore"); if (s) body.storeId = Number(s.value); }

  const btn = $("placeBtn"); btn.disabled = true; const label = btn.textContent; btn.textContent = "Placing…";
  const r = await api("/api/orders", { method: "POST", auth: !!me, body });
  btn.disabled = false; btn.textContent = label;
  if (!r.ok) { err.textContent = (r.data && r.data.error) || "Could not place the order. Please try again."; err.hidden = false; return; }

  showConfirm(name.split(" ")[0]);
  cart.clear(); saveCart(); updateCart(); renderProducts();
}

function showConfirm(firstName) {
  $("refCode").textContent = "AS-" + Math.floor(1000 + Math.random() * 9000);
  $("confirmSub").textContent = `We'll WhatsApp ${firstName} shortly to confirm delivery.`;
  const STEPS = [
    ["Order received", "We've got your request."],
    ["Confirmed", "We message you to lock in details."],
    ["Out for delivery", "On the way to you."],
    ["Delivered", "Pay the driver, enjoy."]
  ];
  $("steps").innerHTML = STEPS.map((s, i) => `<li class="${i === 0 ? "now" : "todo"}"><span class="bead"></span><span><div class="st">${s[0]}</div><div class="sd">${s[1]}</div></span></li>`).join("");
  go("confirm");
}

/* ---------- Auth + account ---------- */
async function loadMe() {
  if (!token()) { me = null; return; }
  const r = await api("/api/portal/me", { auth: true });
  if (r.ok && r.data) {
    me = r.data;
    if (!activeStoreId && me.stores && me.stores.length) { activeStoreId = me.stores[0].id; localStorage.setItem(STORE_KEY, activeStoreId); }
  } else if (r.status === 401) {
    localStorage.removeItem(T_KEY); me = null;
  }
}
function renderAccount() {
  if (!me) { go("login"); return; }
  const stores = (me.stores || []).map((s) => {
    const right = s.outstanding > 0 ? `<span class="owe num">${money(s.outstanding)}</span>` : `<span class="settled">Settled</span>`;
    const pill = s.status === "Supplying" ? `<span class="pill ok">Supplying</span>` : `<span class="pill new">${esc(s.status)}</span>`;
    return `<div class="store-row"><span class="av"><svg class="icon sm"><use href="#i-store"/></svg></span><span class="s-main"><div class="s-name">${esc(s.name)} ${pill}</div><div class="s-sub">${esc(s.location || "")}</div></span>${right}</div>`;
  }).join("");
  $("account").innerHTML = `
    <div class="panel">
      <h2>Hi ${esc(me.name)}</h2>
      <p class="muted">${esc(me.phone)}</p>
      ${me.mustChangePassword ? `<button class="btn" data-go="changepw" style="margin:12px 0">Set your password</button>` : ""}
      <div class="sec-label">Your businesses</div>
      ${stores || `<p class="muted">No businesses linked yet. Ask AfricanSpring to link your store.</p>`}
      <div class="sec-label">Recent orders</div>
      <div id="history" class="muted">Loading…</div>
      <div class="row-btns" style="margin-top:18px">
        <button class="btn ghost" data-go="shop">Order more</button>
        <button class="btn ghost" data-logout><svg class="icon sm"><use href="#i-out"/></svg> Log out</button>
      </div>
    </div>`;
  loadHistory();
}
async function loadHistory() {
  const r = await api("/api/portal/orders", { auth: true });
  const el = $("history"); if (!el) return;
  if (!r.ok || !Array.isArray(r.data) || !r.data.length) { el.innerHTML = `<p class="muted">No orders yet.</p>`; return; }
  el.classList.remove("muted");
  el.innerHTML = r.data.map((o) => {
    const d = new Date(o.createdAt);
    const pill = o.status === "Fulfilled" ? "grey" : "new";
    return `<div class="store-row"><span class="s-main"><div class="s-name">${esc(o.productName || "Order")}</div><div class="s-sub">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></span><span class="pill ${pill}">${esc(o.status)}</span></div>`;
  }).join("");
}
function logout() { localStorage.removeItem(T_KEY); localStorage.removeItem(STORE_KEY); me = null; activeStoreId = null; toast("Logged out"); go("shop"); }

/* ---------- Misc ---------- */
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }

document.addEventListener("click", (e) => {
  const goEl = e.target.closest("[data-go]");
  if (goEl) { e.preventDefault(); go(goEl.dataset.go); return; }
  if (e.target.closest("[data-logout]")) { e.preventDefault(); logout(); return; }
  const add = e.target.closest("[data-add]"); if (add) { setQty(Number(add.dataset.add), (cart.get(Number(add.dataset.add)) || 0) + 1); return; }
  const inc = e.target.closest("[data-inc]"); if (inc) { setQty(Number(inc.dataset.inc), (cart.get(Number(inc.dataset.inc)) || 0) + 1); return; }
  const dec = e.target.closest("[data-dec]"); if (dec) { setQty(Number(dec.dataset.dec), (cart.get(Number(dec.dataset.dec)) || 0) - 1); return; }
});

$("homeBtn").addEventListener("click", () => go("shop"));
$("accountBtn").addEventListener("click", () => go(token() ? "account" : "login"));
$("cartBtn").addEventListener("click", () => count() ? go("checkout") : toast("Your cart is empty"));
$("toCheckout").addEventListener("click", () => go("checkout"));
$("waBtn").addEventListener("click", () => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hi AfricanSpring, I just placed an order online (ref " + $("refCode").textContent + ").")}`, "_blank"));

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("loginErr"); err.hidden = true;
  const r = await api("/api/portal/login", { body: { phone: $("lphone").value.trim(), password: $("lpass").value } });
  if (!r.ok) { err.textContent = (r.data && r.data.error) || "Could not log in."; err.hidden = false; return; }
  localStorage.setItem(T_KEY, r.data.token);
  await loadMe();
  toast("Logged in");
  go(r.data.mustChangePassword ? "changepw" : "account");
});
$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("regErr"); err.hidden = true;
  const r = await api("/api/portal/register", { body: { name: $("rname").value.trim(), phone: $("rphone").value.trim(), password: $("rpass").value, address: $("raddr").value.trim() } });
  if (!r.ok) { err.textContent = (r.data && r.data.error) || "Could not create the account."; err.hidden = false; return; }
  localStorage.setItem(T_KEY, r.data.token);
  await loadMe();
  toast("Account created — sent to AfricanSpring for approval");
  go("account");
});
$("changePwForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("cpwErr"); err.hidden = true;
  const r = await api("/api/portal/change-password", { auth: true, body: { newPassword: $("npass").value } });
  if (!r.ok) { err.textContent = (r.data && r.data.error) || "Could not save the password."; err.hidden = false; return; }
  if (me) me.mustChangePassword = false;
  $("npass").value = "";
  toast("Password saved");
  go("account");
});

/* ---------- Startup ---------- */
updateCart();
loadProducts();
if (token()) loadMe();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
