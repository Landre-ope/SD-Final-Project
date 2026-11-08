# TenantHub — Tenant Client Management System

A responsive frontend prototype for centralized rental property administration. It covers the tenant login, dashboard, payment overview, maintenance request, and basement reservation workflows described in the project requirements.

The demo now persists account activity in the browser with `localStorage`: submitted maintenance requests, basement reservations, and rent payments update the dashboard, activity history, notifications, and calendar after refresh. This is client-side demo persistence; a production deployment should replace it with authenticated API/database storage.

Rent payments use a two-step demo workflow: the tenant submits the payment for verification, then the landlord review controls on the Payments screen approve or decline it. Pending maintenance reports and basement bookings remain manageable from the dashboard activity history.

The prototype also includes a separate owner role. Choose **Owner sign in** on the login screen and use `owner@tenanthub.test` / `owner123`. The owner control center lists pending maintenance reports, basement bookings, and rent submissions, with approve/decline actions that update the shared browser state visible to the tenant. Tenants can only submit a payment-verification request; they cannot approve or decline their own payment.

## Multi-account server mode

Run the app with Node.js 22+:

```bash
npm install
npm start
```

Open `http://localhost:8000`. Tenants can create accounts from **Create one** or sign in with an existing account. Bookings, maintenance requests, payment submissions, approvals, and calendar events are stored per account in `tenanthub.sqlite` and survive reloads. The owner account reviews pending activity across tenant accounts.

The demo owner credentials are `owner@tenanthub.test` / `owner123`. Set `PORT` or `DATABASE_PATH` to customize the local server.

## Run locally

This is a dependency-free static prototype. Open `index.html` directly in a browser, or serve the project directory with any static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
