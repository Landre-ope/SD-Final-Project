const screens = [
  "login", "dashboard", "calendar", "payments", "notifications", "profile",
  "activity", "forgot", "contact", "calendar-help", "maintenance", "review",
  "success", "booking", "booking-success",
];
const STORAGE_KEY = "tenanthub-demo-account";
const RENT_AMOUNT = "₱6,000";
const PHILIPPINE_TIME_ZONE = "Asia/Manila";
const activityResetVersion = 2;
const partsForPhilippineNow = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
  };
};
const APP_NOW = partsForPhilippineNow();
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const CURRENT_DATE_KEY = dateKey(APP_NOW.year, APP_NOW.month, APP_NOW.day);
const CURRENT_MONTH_KEY = dateKey(APP_NOW.year, APP_NOW.month, 1);
const PAYMENT_DUE_KEY = dateKey(APP_NOW.year, APP_NOW.month, 25);
const GRACE_START_KEY = dateKey(APP_NOW.year, APP_NOW.month, 26);
const GRACE_END_KEY = dateKey(APP_NOW.year, APP_NOW.month, 30);
const currentMonthLabel = new Date(`${CURRENT_MONTH_KEY}T12:00:00`).toLocaleDateString("en-US", { month: "long" });
const previousMonthDate = new Date(APP_NOW.year, APP_NOW.month - 1, 1);
const previousPreviousMonthDate = new Date(APP_NOW.year, APP_NOW.month - 2, 1);
const monthYearLabel = (date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dateLabel = (key, options = { month: "long", day: "numeric", year: "numeric" }) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", options);
const defaultEvents = [
  { date: PAYMENT_DUE_KEY, type: "payment", title: "Rent payment due", detail: `${RENT_AMOUNT} · ${currentMonthLabel} rent`, color: "payment" },
  ...[26, 27, 28, 29, 30].map((day) => ({ date: dateKey(APP_NOW.year, APP_NOW.month, day), type: "grace", title: day === 30 ? "Last day for extended payment" : "Extended payment available", detail: day === 30 ? "Late fee may apply after today" : `${day === 26 ? "Grace period starts · " : "Grace period · "}${RENT_AMOUNT}`, color: "grace" })),
];
const defaultState = { events: defaultEvents, activities: [], payments: [
  { title: `${monthYearLabel(previousMonthDate).split(" ")[0]} rent`, detail: `Paid ${dateLabel(dateKey(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1))}`, amount: RENT_AMOUNT },
  { title: `${monthYearLabel(previousPreviousMonthDate).split(" ")[0]} rent`, detail: `Paid ${dateLabel(dateKey(previousPreviousMonthDate.getFullYear(), previousPreviousMonthDate.getMonth(), 1))}`, amount: RENT_AMOUNT },
], currentPaymentPaid: false, paymentCycle: CURRENT_MONTH_KEY, activityResetVersion };
defaultState.pendingPayment = null;

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
let state;
const cloneState = (value) => JSON.parse(JSON.stringify(value));
try {
  state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || cloneState(defaultState);
} catch {
  state = cloneState(defaultState);
}
const migrateRentAmount = (value) => typeof value === "string" ? value.replace(/₱12,500/g, RENT_AMOUNT) : value;
state.events.forEach((event) => { event.detail = migrateRentAmount(event.detail); });
state.activities.forEach((activity) => { activity.detail = migrateRentAmount(activity.detail); });
state.payments.forEach((payment) => { payment.amount = migrateRentAmount(payment.amount); });
state.events = state.events.filter((event) => event.id || !["Maintenance visit", "Basement booking"].includes(event.title));
state.activities = state.activities.filter((activity) => activity.id || !["Leaking faucet reported", "Basement reservation requested"].includes(activity.title));
state.events = state.events.filter((event) => event.id || !["payment", "grace"].includes(event.type));
state.events = state.events.filter((event) => !event.date || event.date >= CURRENT_MONTH_KEY);
if (state.activityResetVersion !== activityResetVersion) {
  state.activities = [];
  state.activityResetVersion = activityResetVersion;
}
if (state.paymentCycle !== CURRENT_MONTH_KEY) {
  state.currentPaymentPaid = false;
  state.pendingPayment = null;
  state.paymentCycle = CURRENT_MONTH_KEY;
}
state.events.push(...defaultEvents.filter((event) => !state.events.some((savedEvent) => savedEvent.date === event.date && savedEvent.type === event.type)));
if (!Object.prototype.hasOwnProperty.call(state, "pendingPayment")) state.pendingPayment = null;
saveState();
let calendarDate = new Date(APP_NOW.year, APP_NOW.month, 1);
let selectedDate = CURRENT_DATE_KEY;
let pendingMaintenance = null;

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
const formatLongDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const formatShortDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const showScreen = (name) => {
  const target = screens.includes(name) ? name : "dashboard";
  screens.forEach((screen) => document.getElementById(`${screen}-screen`).classList.toggle("hidden", screen !== target));
  if (target === "dashboard") renderDashboard();
  if (target === "calendar") renderCalendar();
  if (target === "payments") renderPayments();
  if (target === "activity") renderActivity();
  if (target === "notifications") renderNotifications();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const activityMarkup = (activity) => `<div class="activity-item"><span class="activity-icon ${escapeHTML(activity.color)}">${escapeHTML(activity.icon)}</span><div><b>${escapeHTML(activity.title)}</b><small>${escapeHTML(activity.detail)}</small></div><span class="activity-status ${escapeHTML(activity.statusClass || "")}">${escapeHTML(activity.status)}</span>${activity.cancelable ? `<button class="cancel-link" data-action="cancel-item" data-id="${escapeHTML(activity.id)}" data-type="${escapeHTML(activity.type)}">Cancel</button>` : ""}</div>`;

function renderDashboard() {
  const paymentAmount = document.querySelector("#dashboard-payment-amount");
  const paymentBadge = document.querySelector("#dashboard-payment-badge");
  const paymentLabel = document.querySelector("#dashboard-payment-label");
  const paymentProgress = document.querySelector("#dashboard-payment-progress");
  paymentAmount.textContent = state.currentPaymentPaid ? "₱0" : RENT_AMOUNT;
  paymentBadge.textContent = state.currentPaymentPaid ? "Paid" : state.pendingPayment ? "Awaiting approval" : "Extended payment ended";
  paymentLabel.textContent = state.currentPaymentPaid ? `${currentMonthLabel} rent paid` : state.pendingPayment ? "Payment submitted" : `Rent for ${currentMonthLabel}`;
  paymentProgress.style.width = state.currentPaymentPaid ? "100%" : state.pendingPayment ? "90%" : "75%";

  const upcoming = [...state.events].filter((event) => ["maintenance", "booking", "payment", "grace"].includes(event.type)).slice(-4);
  document.querySelector("#dashboard-calendar-events").innerHTML = upcoming.map((event) => `<div class="mini-event"><span class="date-tile ${event.type === "booking" ? "peach-tile" : event.type === "payment" ? "due-tile" : ""}"><b>${event.date.slice(8)}</b><small>${new Date(`${event.date}T12:00:00`).toLocaleDateString("en-US", { month: "short" })}</small></span><div><b>${escapeHTML(event.title)}</b><small>${escapeHTML(event.detail)}</small></div><span class="event-dot ${event.type}-dot"></span></div>`).join("");
  document.querySelector("#dashboard-activity").innerHTML = state.activities.slice(0, 3).map(activityMarkup).join("");
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.querySelector("#calendar-month").textContent = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const grid = document.querySelector("#calendar-grid");
  grid.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let blank = 0; blank < firstDay; blank += 1) grid.appendChild(document.createElement("span"));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(year, month, day);
    const cell = document.createElement("button");
    cell.className = `calendar-day ${key === selectedDate ? "selected" : ""}`;
    cell.dataset.date = key;
    cell.innerHTML = `<b>${day}</b>`;
    state.events.filter((event) => event.date === key).slice(0, 3).forEach((event) => {
      const marker = document.createElement("i");
      marker.className = `${event.type}-dot`;
      cell.appendChild(marker);
    });
    grid.appendChild(cell);
  }
  renderSelectedDay();
}

function renderSelectedDay() {
  const dayEvents = state.events.filter((event) => event.date === selectedDate);
  document.querySelector("#selected-date").textContent = formatLongDate(selectedDate);
  document.querySelector("#selected-count").textContent = `${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`;
  document.querySelector("#selected-events").innerHTML = dayEvents.length
    ? dayEvents.map((event) => `<div class="selected-event"><span class="activity-icon ${escapeHTML(event.color)}">${event.type === "payment" || event.type === "grace" ? "₱" : event.type === "booking" ? "▣" : "⌁"}</span><div><b>${escapeHTML(event.title)}</b><small>${escapeHTML(event.detail)}</small></div></div>`).join("")
    : '<p class="muted empty-events">Nothing scheduled for this day.</p>';
}

function renderPayments() {
  const dueLabel = `${currentMonthLabel} rent`;
  const dueDateLabel = dateLabel(PAYMENT_DUE_KEY, { month: "long", day: "numeric", year: "numeric" });
  document.querySelector("#payment-page-amount").textContent = state.currentPaymentPaid ? "₱0" : RENT_AMOUNT;
  document.querySelector("#payment-page-status").textContent = state.currentPaymentPaid
    ? `${dueLabel} · Approved ${dueDateLabel}`
    : state.pendingPayment
      ? `${dueLabel} · Waiting for landlord approval`
      : `${dueLabel} · Due ${dueDateLabel}`;
  const payButton = document.querySelector("#pay-now");
  payButton.textContent = state.currentPaymentPaid ? "Rent payment approved" : state.pendingPayment ? "Payment submitted for review" : "Submit payment for verification";
  payButton.disabled = state.currentPaymentPaid || Boolean(state.pendingPayment);
  document.querySelector("#owner-payment-review").classList.toggle("hidden", !state.pendingPayment);
  const pendingMarkup = state.pendingPayment
    ? `<div class="activity-item"><span class="activity-icon peach">₱</span><div><b>${escapeHTML(currentMonthLabel)} rent payment</b><small>Submitted ${escapeHTML(state.pendingPayment.detail)}</small></div><span class="activity-status pending">Owner review</span></div>`
    : "";
  document.querySelector("#payment-history").innerHTML = pendingMarkup + state.payments.map((payment) => `<div class="activity-item"><span class="activity-icon blue">✓</span><div><b>${escapeHTML(payment.title)}</b><small>${escapeHTML(payment.detail)}</small></div><strong>${escapeHTML(payment.amount)}</strong></div>`).join("");
}

function renderActivity() {
  document.querySelector("#activity-history").innerHTML = state.activities.length
    ? state.activities.map(activityMarkup).join("")
    : '<p class="muted empty-events">No activity history yet.</p>';
}

function renderNotifications() {
  document.querySelector("#notification-list").innerHTML = state.activities.length
    ? state.activities.slice(0, 5).map((activity, index) => `<div class="notification-item ${index < 2 ? "unread" : ""}"><span class="activity-icon ${escapeHTML(activity.color)}">${escapeHTML(activity.icon)}</span><div><b>${escapeHTML(activity.title)}</b><small>${escapeHTML(activity.detail)}</small></div><i></i></div>`).join("")
    : '<p class="muted empty-events">No new notifications.</p>';
}

document.querySelector("#login-form").addEventListener("submit", (event) => { event.preventDefault(); showScreen("dashboard"); });
document.querySelector(".toggle-password").addEventListener("click", (event) => {
  const input = event.currentTarget.previousElementSibling;
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  event.currentTarget.textContent = visible ? "Show" : "Hide";
});

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    event.preventDefault();
    showScreen(routeButton.dataset.route);
    return;
  }
  const calendarAction = event.target.closest("[data-calendar-action]");
  if (calendarAction) {
    calendarDate.setMonth(calendarDate.getMonth() + (calendarAction.dataset.calendarAction === "next" ? 1 : -1));
    renderCalendar();
    return;
  }
  const calendarDay = event.target.closest(".calendar-day");
  if (calendarDay) {
    selectedDate = calendarDay.dataset.date;
    renderCalendar();
    return;
  }
  if (event.target.closest("[data-action='mark-read']")) {
    document.querySelectorAll(".notification-item.unread").forEach((item) => item.classList.remove("unread"));
    return;
  }
  const cancelButton = event.target.closest("[data-action^='cancel']");
  if (cancelButton) {
    const type = cancelButton.dataset.type || cancelButton.dataset.action.replace("cancel-", "");
    const id = cancelButton.dataset.id || (type === "maintenance" ? pendingMaintenance?.id : pendingMaintenance?.bookingId);
    if (id) cancelActivity(id, type);
  }
});

function cancelActivity(id, type) {
  const label = type === "maintenance" ? "maintenance report" : "basement booking";
  if (!window.confirm(`Cancel this ${label}? The property manager will not be notified.`)) return;
  state.events = state.events.filter((event) => event.id !== id);
  state.activities = state.activities.filter((activity) => activity.id !== id);
  saveState();
  showScreen("dashboard");
}

function submitPaymentForApproval() {
  state.pendingPayment = { id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`, detail: `${dateLabel(PAYMENT_DUE_KEY)} · ${RENT_AMOUNT}` };
  state.activities.unshift({ id: state.pendingPayment.id, type: "payment", icon: "₱", color: "peach", title: "Rent payment submitted", detail: state.pendingPayment.detail, status: "Owner review", statusClass: "pending" });
  saveState();
  renderPayments();
  renderDashboard();
  renderActivity();
}

function approvePayment() {
  if (!state.pendingPayment) return;
  const paymentId = state.pendingPayment.id;
  state.currentPaymentPaid = true;
  state.pendingPayment = null;
  state.payments.unshift({ title: `${currentMonthLabel} rent`, detail: `Approved ${dateLabel(PAYMENT_DUE_KEY)}`, amount: RENT_AMOUNT });
  state.activities = state.activities.filter((activity) => activity.id !== paymentId);
  state.activities.unshift({ icon: "✓", color: "blue", title: "Rent payment approved", detail: `${dateLabel(PAYMENT_DUE_KEY)} · ${RENT_AMOUNT}`, status: "Completed", statusClass: "" });
  state.events = state.events.filter((event) => !(event.type === "payment" && event.date === PAYMENT_DUE_KEY));
  state.events.unshift({ date: PAYMENT_DUE_KEY, type: "payment", title: "Rent payment approved", detail: `${RENT_AMOUNT} · ${currentMonthLabel} rent`, color: "payment" });
  saveState();
  renderPayments();
  renderDashboard();
  renderActivity();
}

function declinePayment() {
  if (!state.pendingPayment) return;
  const paymentId = state.pendingPayment.id;
  state.pendingPayment = null;
  state.activities = state.activities.filter((activity) => activity.id !== paymentId);
  state.activities.unshift({ icon: "!", color: "peach", title: "Rent payment declined", detail: "Please submit proof of payment again.", status: "Action needed", statusClass: "pending" });
  saveState();
  renderPayments();
  renderDashboard();
  renderActivity();
}

const maintenanceForm = document.querySelector("#maintenance-form");
maintenanceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(maintenanceForm);
  pendingMaintenance = Object.fromEntries(data.entries());
  document.querySelector("#review-category").textContent = pendingMaintenance.category || "Not specified";
  document.querySelector("#review-description").textContent = pendingMaintenance.description || "Not specified";
  document.querySelector("#review-date").textContent = formatLongDate(pendingMaintenance.date);
  document.querySelector("#review-time").textContent = pendingMaintenance.time || "Anytime";
  showScreen("review");
});

document.querySelector("#submit-maintenance").addEventListener("click", () => {
  const requestId = `#MR-${Math.floor(1000 + Math.random() * 9000)}`;
  const title = `${pendingMaintenance.category} issue`;
  pendingMaintenance.id = requestId;
  state.events.unshift({ id: requestId, date: pendingMaintenance.date, type: "maintenance", title: "Maintenance visit", detail: `${pendingMaintenance.time} · Unit 302`, color: "blue" });
  state.activities.unshift({ id: requestId, type: "maintenance", cancelable: true, icon: "⌁", color: "blue", title, detail: `${formatShortDate(pendingMaintenance.date)} · Request ${requestId}`, status: "In review", statusClass: "pending" });
  saveState();
  document.querySelector("#maintenance-request-id").textContent = requestId;
  document.querySelector("#success-maintenance-title").textContent = title;
  document.querySelector("#success-maintenance-detail").textContent = `Scheduled for ${formatLongDate(pendingMaintenance.date)} · ${pendingMaintenance.time}`;
  selectedDate = pendingMaintenance.date;
  calendarDate = new Date(`${pendingMaintenance.date}T12:00:00`);
  showScreen("success");
});

document.querySelector("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const date = data.get("date");
  const bookingId = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
  const booking = { id: bookingId, date, type: "booking", title: "Basement booking", detail: `${data.get("start")} – ${data.get("end")} · Community basement`, color: "peach" };
  state.events = state.events.filter((item) => item.type !== "booking");
  state.events.unshift(booking);
  state.activities = state.activities.filter((item) => item.type !== "booking");
  state.activities.unshift({ id: bookingId, type: "booking", cancelable: true, icon: "▣", color: "peach", title: "Basement reservation requested", detail: `${formatLongDate(date)} · Pending approval`, status: "Pending", statusClass: "pending" });
  saveState();
  selectedDate = date;
  calendarDate = new Date(`${date}T12:00:00`);
  document.querySelector("#booking-success-date").textContent = formatLongDate(date);
  document.querySelector("#booking-success-time").textContent = `${data.get("start")} – ${data.get("end")} · Community basement`;
  pendingMaintenance = { bookingId };
  showScreen("booking-success");
});

document.querySelector("#pay-now").addEventListener("click", submitPaymentForApproval);
document.querySelector("#approve-payment").addEventListener("click", approvePayment);
document.querySelector("#decline-payment").addEventListener("click", declinePayment);

renderDashboard();
renderCalendar();
renderPayments();
renderActivity();
renderNotifications();
const appDate = new Date(`${CURRENT_DATE_KEY}T12:00:00`);
document.querySelector("#dashboard-date").textContent = appDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
document.querySelector("#lease-end-date").textContent = `Dec 31, ${APP_NOW.year}`;
document.querySelector("#calendar-month").textContent = dateLabel(CURRENT_MONTH_KEY, { month: "long", year: "numeric" });
document.querySelector("#selected-date").textContent = formatLongDate(CURRENT_DATE_KEY);
document.querySelector("#payment-page-status").textContent = `${currentMonthLabel} rent · Due ${dateLabel(PAYMENT_DUE_KEY)}`;
document.querySelector("#payment-on-time-date").textContent = dateLabel(PAYMENT_DUE_KEY, { month: "short", day: "numeric" });
document.querySelector("#payment-extended-dates").textContent = `${dateLabel(GRACE_START_KEY, { month: "short", day: "numeric" })} – ${dateLabel(GRACE_END_KEY, { month: "short", day: "numeric" })}`;
document.querySelector("#maintenance-date").value = CURRENT_DATE_KEY;
document.querySelector("#booking-date").value = dateKey(APP_NOW.year, APP_NOW.month, APP_NOW.day + 7);
