# TenantHub — Tenant Client Management System

A responsive frontend prototype for centralized rental property administration. It covers the tenant login, dashboard, payment overview, maintenance request, and basement reservation workflows described in the project requirements.

The demo now persists account activity in the browser with `localStorage`: submitted maintenance requests, basement reservations, and rent payments update the dashboard, activity history, notifications, and calendar after refresh. This is client-side demo persistence; a production deployment should replace it with authenticated API/database storage.

Rent payments use a two-step demo workflow: the tenant submits the payment for verification, then the landlord review controls on the Payments screen approve or decline it. Pending maintenance reports and basement bookings remain manageable from the dashboard activity history.

The prototype also includes a separate owner role. Choose **Owner sign in** on the login screen and use `owner@tenanthub.test` / `owner123`. The owner control center lists pending maintenance reports, basement bookings, and rent submissions, with approve/decline actions that update the shared browser state visible to the tenant. Tenants can only submit a payment-verification request; they cannot approve or decline their own payment.

## Local sign-in

No database or backend is required. Multiple tenant accounts created through **Create one** are saved in the browser's `localStorage`, and each account has separate maintenance requests, bookings, payments, notifications, and calendar activity. The default tenant account is `tenant@example.com` / `password`.

The owner credentials are `owner@tenanthub.test` / `owner123`. Owner approvals combine pending requests from all locally saved tenant accounts and update the selected tenant's browser state. This is intended for local testing and prototyping rather than production authentication.

## Run locally

This is a dependency-free static prototype. Open `index.html` directly in a browser, or serve the project directory with any static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
