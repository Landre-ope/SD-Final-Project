const crypto = require("node:crypto");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const express = require("express");

const PORT = Number(process.env.PORT || 8000);
const database = new DatabaseSync(process.env.DATABASE_PATH || path.join(__dirname, "tenanthub.sqlite"));
database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};
const verifyPassword = (password, stored) => {
  const [salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  return expected && actual.length === expected.length && crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
};
const sessions = new Map();
const defaultState = () => ({ events: [], activities: [], payments: [], currentPaymentPaid: false, pendingPayment: null, paymentCycle: null, activityResetVersion: 2 });
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const sessionUser = (request) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const userId = token && sessions.get(token);
  return userId ? database.prepare("SELECT id, name, email, state_json FROM users WHERE id = ?").get(userId) : null;
};
const requireUser = (request, response) => {
  const user = sessionUser(request);
  if (!user) {
    response.status(401).json({ error: "Sign in required." });
    return null;
  }
  return user;
};

app.post("/api/auth/register", (request, response) => {
  const { name, email, password } = request.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return response.status(400).json({ error: "Name, email, and a password of at least 6 characters are required." });
  }
  try {
    const result = database.prepare("INSERT INTO users (name, email, password_hash, state_json) VALUES (?, ?, ?, ?)").run(
      name.trim(),
      email.trim().toLowerCase(),
      hashPassword(password),
      JSON.stringify(defaultState()),
    );
    const user = database.prepare("SELECT id, name, email, state_json FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user.id);
    response.status(201).json({ token, user: publicUser(user), state: JSON.parse(user.state_json) });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.message?.includes("UNIQUE constraint failed")) return response.status(409).json({ error: "That email is already registered." });
    return response.status(500).json({ error: "Unable to create the account." });
  }
});

app.post("/api/auth/login", (request, response) => {
  const { email, password } = request.body || {};
  const user = database.prepare("SELECT id, name, email, password_hash, state_json FROM users WHERE email = ?").get(email?.trim().toLowerCase());
  if (!user || !verifyPassword(password || "", user.password_hash)) return response.status(401).json({ error: "Invalid email or password." });
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, user.id);
  response.json({ token, user: publicUser(user), state: JSON.parse(user.state_json) });
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
  const user = requireUser(request, response);
  if (!user) return;
  if (!request.body || typeof request.body !== "object") return response.status(400).json({ error: "State must be a JSON object." });
  database.prepare("UPDATE users SET state_json = ? WHERE id = ?").run(JSON.stringify(request.body), user.id);
  response.json({ state: request.body });
});

app.get("*", (request, response) => response.sendFile(path.join(__dirname, "index.html")));
app.listen(PORT, () => console.log(`TenantHub running at http://localhost:${PORT}`));
