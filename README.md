# TenantHub — Tenant Client Management System

A responsive frontend prototype for centralized rental property administration. It covers the tenant login, dashboard, payment overview, maintenance request, and basement reservation workflows described in the project requirements.

The prototype now includes an optional server mode with multiple accounts. Accounts and each tenant's state are stored in SQLite, while the browser receives a session token for API requests.

Rent payments use a two-step demo workflow: the tenant submits the payment for verification, then the landlord review controls on the Payments screen approve or decline it. Pending maintenance reports and basement bookings remain manageable from the dashboard activity history.

## Run as a server-backed prototype

Install Node.js 22+ (the server uses Node's built-in `node:sqlite` module) and run:

```bash
npm install
npm start
```

Then visit `http://localhost:8000`, create separate tenant accounts, and sign in. The SQLite database is created as `tenanthub.sqlite` in the project directory. Set `DATABASE_PATH` or `PORT` to customize it, for example:

```bash
PORT=8080 DATABASE_PATH=./data/tenanthub.sqlite npm start
```

The current implementation is a local prototype: sessions are held in server memory and passwords are hashed with Node's built-in `scrypt`. For production, use HTTPS, a persistent session store, CSRF protection, rate limiting, and a managed database.

## Static-only fallback

Opening `index.html` directly still works as a frontend demo using browser `localStorage`, but it cannot create shared accounts or persist data across devices.
