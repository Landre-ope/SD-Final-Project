const crypto = require("node:crypto");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");

const PORT = Number(process.env.PORT || 8000);
const OWNER_EMAIL = "owner@tenanthub.test";
const OWNER_PASSWORD = "owner123";
const database = new DatabaseSync(process.env.DATABASE_PATH || path.join(__dirname, "tenanthub.sqlite"));
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'tenant',
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) =>
  `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
const verifyPassword = (password, stored) => {
  const [salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return expected && actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
const defaultState = () => ({ events: [], activities: [], payments: [], currentPaymentPaid: false, pendingPayment: null, paymentCycle: null, activityResetVersion: 3 });
const sessions = new Map();
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const ownerExists = database.prepare("SELECT id FROM users WHERE email = ?").get(OWNER_EMAIL);
if (!ownerExists) {
  database.prepare("INSERT INTO users (name, email, password_hash, role, state_json) VALUES (?, ?, ?, 'owner', ?)").run("Property Owner", OWNER_EMAIL, hashPassword(OWNER_PASSWORD), JSON.stringify(defaultState()));
}
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const getUser = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const id = token && sessions.get(token);
  return id ? database.prepare("SELECT * FROM users WHERE id = ?").get(id) : null;
};
const requireUser = (request, response, role) => {
  const user = getUser(request);
  if (!user || (role && user.role !== role)) {
    response.status(401).json({ error: "Unauthorized." });
    return null;
  }
  return user;
};
const issueSession = (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);
  return token;
};

app.post("/api/auth/register", (request, response) => {
  const { name, email, password } = request.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) return response.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
  try {
    const result = database.prepare("INSERT INTO users (name, email, password_hash, role, state_json) VALUES (?, ?, ?, 'tenant', ?)").run(name.trim(), email.trim().toLowerCase(), hashPassword(password), JSON.stringify(defaultState()));
    const user = database.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    response.status(201).json({ token: issueSession(user), user: publicUser(user), state: JSON.parse(user.state_json) });
  } catch (error) {
    if (error.message?.includes("UNIQUE constraint failed")) return response.status(409).json({ error: "That email is already registered." });
    response.status(500).json({ error: "Unable to create the account." });
  }
});

app.post("/api/auth/login", (request, response) => {
  const { email, password } = request.body || {};
  const user = database.prepare("SELECT * FROM users WHERE email = ?").get(email?.trim().toLowerCase());
  if (!user || !verifyPassword(password || "", user.password_hash)) return response.status(401).json({ error: "Invalid email or password." });
  response.json({ token: issueSession(user), user: publicUser(user), state: JSON.parse(user.state_json) });
});

app.post("/api/auth/logout", (request, response) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (token) sessions.delete(token);
  response.status(204).end();
});

app.get("/api/me", (request, response) => {
  const user = requireUser(request, response);
  if (user) response.json({ user: publicUser(user), state: JSON.parse(user.state_json) });
});

app.put("/api/state", (request, response) => {
  const user = requireUser(request, response, "tenant");
  if (!user) return;
  database.prepare("UPDATE users SET state_json = ? WHERE id = ?").run(JSON.stringify(request.body), user.id);
  response.json({ state: request.body });
});

app.get("/api/owner/pending", (request, response) => {
  const owner = requireUser(request, response, "owner");
  if (!owner) return;
  const tenants = database.prepare("SELECT id, name, email, state_json FROM users WHERE role = 'tenant'").all();
  const pending = [];
  tenants.forEach((tenant) => {
    const state = JSON.parse(tenant.state_json);
    state.activities.filter((item) => (item.type === "maintenance" && item.status === "In review") || (item.type === "booking" && item.status === "Pending"))
      .forEach((item) => pending.push({ ...item, tenantId: tenant.id, tenantName: tenant.name, tenantEmail: tenant.email }));
    if (state.pendingPayment) pending.push({ ...state.pendingPayment, type: "payment", title: "Rent payment submitted", status: "Owner review", tenantId: tenant.id, tenantName: tenant.name, tenantEmail: tenant.email });
  });
  response.json({ pending });
});

app.post("/api/owner/decision", (request, response) => {
  const owner = requireUser(request, response, "owner");
  if (!owner) return;
  const { tenantId, id, type, approved } = request.body || {};
  const tenant = database.prepare("SELECT * FROM users WHERE id = ? AND role = 'tenant'").get(tenantId);
  if (!tenant) return response.status(404).json({ error: "Tenant not found." });
  const state = JSON.parse(tenant.state_json);
  if (type === "payment") {
    if (!state.pendingPayment || state.pendingPayment.id !== id) return response.status(404).json({ error: "Payment request not found." });
    if (approved) {
      state.currentPaymentPaid = true;
      state.payments.unshift({ title: "Current rent", detail: "Approved by owner", amount: "₱6,000" });
      state.events = state.events.filter((event) => !(event.type === "payment" && event.date === state.paymentCycle));
      state.activities.unshift({ icon: "✓", color: "blue", title: "Rent payment approved", detail: "Approved by property owner", status: "Completed", statusClass: "" });
    } else {
      state.activities.unshift({ icon: "!", color: "peach", title: "Rent payment declined", detail: "Please submit proof of payment again.", status: "Action needed", statusClass: "pending" });
    }
    state.pendingPayment = null;
  } else {
    const activity = state.activities.find((item) => item.id === id && item.type === type);
    if (!activity) return response.status(404).json({ error: "Request not found." });
    activity.status = approved ? (type === "booking" ? "Approved" : "Scheduled") : "Declined";
    activity.statusClass = approved ? "" : "pending";
    activity.cancelable = false;
    const event = state.events.find((item) => item.id === id);
    if (event) {
      if (approved) event.title = type === "booking" ? "Basement booking approved" : "Maintenance visit approved";
      else state.events = state.events.filter((item) => item.id !== id);
    }
  }
  database.prepare("UPDATE users SET state_json = ? WHERE id = ?").run(JSON.stringify(state), tenant.id);
  response.json({ state });
});

app.get("*", (request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.listen(PORT, () => console.log(`TenantHub running at http://localhost:${PORT}`));
