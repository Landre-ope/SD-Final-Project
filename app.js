const screens = [
  "login", "dashboard", "calendar", "payments", "notifications", "profile",
  "activity", "forgot", "contact", "calendar-help", "maintenance", "review",
  "success", "booking", "booking-success",
];
const STORAGE_KEY = "tenanthub-demo-account";
const RENT_AMOUNT = "₱6,000";
const defaultEvents = [
  { date: "2024-10-18", type: "maintenance", title: "Maintenance visit", detail: "10:00 AM · Unit 302", color: "blue" },
  { date: "2024-10-26", type: "booking", title: "Basement booking", detail: "09:00 AM – 12:00 PM · Community basement", color: "peach" },
  { date: "2024-11-01", type: "payment", title: "Rent payment due", detail: "₱6,000 · November rent", color: "payment" },
  { date: "2024-11-02", type: "grace", title: "Extended payment available", detail: "Grace period starts · ₱6,000", color: "grace" },
  { date: "2024-11-03", type: "grace", title: "Extended payment available", detail: "Grace period · ₱6,000", color: "grace" },
  { date: "2024-11-04", type: "grace", title: "Extended payment available", detail: "Grace period · ₱6,000", color: "grace" },
  { date: "2024-11-05", type: "grace", title: "Extended payment available", detail: "Grace period · ₱6,000", color: "grace" },
  { date: "2024-11-06", type: "grace", title: "Last day for extended payment", detail: "Late fee may apply after today", color: "grace" },
];
const defaultActivities = [
  { icon: "✓", color: "blue", title: "Rent payment received", detail: "October 01, 2024 · ₱6,000", status: "Completed", statusClass: "" },
  { icon: "⌁", color: "peach", title: "Leaking faucet reported", detail: "September 28, 2024 · Request #MR-1048", status: "In review", statusClass: "pending" },
  { icon: "▣", color: "peach", title: "Basement reservation requested", detail: "October 26, 2024 · Pending approval", status: "Pending", statusClass: "pending" },
];
const defaultState = { events: defaultEvents, activities: defaultActivities, payments: [
  { title: "October rent", detail: "Paid October 01, 2024", amount: "₱6,000" },
  { title: "September rent", detail: "Paid September 01, 2024", amount: "₱6,000" },
], currentPaymentPaid: false };

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
saveState();
let calendarDate = new Date(2024, 9, 1);
let selectedDate = "2024-10-18";
let pendingMaintenance = null;

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

const activityMarkup = (activity) => `<div class="activity-item"><span class="activity-icon ${escapeHTML(activity.color)}">${escapeHTML(activity.icon)}</span><div><b>${escapeHTML(activity.title)}</b><small>${escapeHTML(activity.detail)}</small></div><span class="activity-status ${escapeHTML(activity.statusClass || "")}">${escapeHTML(activity.status)}</span></div>`;

function renderDashboard() {
  const paymentAmount = document.querySelector("#dashboard-payment-amount");
  const paymentBadge = document.querySelector("#dashboard-payment-badge");
  const paymentLabel = document.querySelector("#dashboard-payment-label");
  const paymentProgress = document.querySelector("#dashboard-payment-progress");
  paymentAmount.textContent = state.currentPaymentPaid ? "₱0" : RENT_AMOUNT;
  paymentBadge.textContent = state.currentPaymentPaid ? "Paid" : "Due in 7 days";
  paymentLabel.textContent = state.currentPaymentPaid ? "November rent paid" : "Rent for November";
  paymentProgress.style.width = state.currentPaymentPaid ? "100%" : "75%";

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
  document.querySelector("#payment-page-amount").textContent = state.currentPaymentPaid ? "₱0" : RENT_AMOUNT;
  document.querySelector("#payment-page-status").textContent = state.currentPaymentPaid ? "November rent · Paid November 01, 2024" : "November rent · Due November 1, 2024";
  const payButton = document.querySelector("#pay-now");
  payButton.textContent = state.currentPaymentPaid ? "Rent paid successfully" : "Mark rent as paid";
  payButton.disabled = state.currentPaymentPaid;
  document.querySelector("#payment-history").innerHTML = state.payments.map((payment) => `<div class="activity-item"><span class="activity-icon blue">✓</span><div><b>${escapeHTML(payment.title)}</b><small>${escapeHTML(payment.detail)}</small></div><strong>${escapeHTML(payment.amount)}</strong></div>`).join("");
}

function renderActivity() {
  document.querySelector("#activity-history").innerHTML = state.activities.map(activityMarkup).join("");
}

function renderNotifications() {
  document.querySelector("#notification-list").innerHTML = state.activities.slice(0, 5).map((activity, index) => `<div class="notification-item ${index < 2 ? "unread" : ""}"><span class="activity-icon ${escapeHTML(activity.color)}">${escapeHTML(activity.icon)}</span><div><b>${escapeHTML(activity.title)}</b><small>${escapeHTML(activity.detail)}</small></div><i></i></div>`).join("");
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
  }
});

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
  state.events.unshift({ date: pendingMaintenance.date, type: "maintenance", title: "Maintenance visit", detail: `${pendingMaintenance.time} · Unit 302`, color: "blue" });
  state.activities.unshift({ icon: "⌁", color: "blue", title, detail: `${formatShortDate(pendingMaintenance.date)} · Request ${requestId}`, status: "In review", statusClass: "pending" });
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
  const booking = { date, type: "booking", title: "Basement booking", detail: `${data.get("start")} – ${data.get("end")} · Community basement`, color: "peach" };
  state.events = state.events.filter((item) => item.type !== "booking");
  state.events.unshift(booking);
  state.activities.unshift({ icon: "▣", color: "peach", title: "Basement reservation requested", detail: `${formatLongDate(date)} · Pending approval`, status: "Pending", statusClass: "pending" });
  saveState();
  selectedDate = date;
  calendarDate = new Date(`${date}T12:00:00`);
  document.querySelector("#booking-success-date").textContent = formatLongDate(date);
  document.querySelector("#booking-success-time").textContent = `${data.get("start")} – ${data.get("end")} · Community basement`;
  showScreen("booking-success");
});

document.querySelector("#pay-now").addEventListener("click", () => {
  state.currentPaymentPaid = true;
  state.payments.unshift({ title: "November rent", detail: "Paid November 01, 2024", amount: RENT_AMOUNT });
  state.activities.unshift({ icon: "✓", color: "blue", title: "Rent payment completed", detail: `November 01, 2024 · ${RENT_AMOUNT}`, status: "Completed", statusClass: "" });
  state.events.unshift({ date: "2024-11-01", type: "payment", title: "Rent payment completed", detail: `${RENT_AMOUNT} · November rent`, color: "payment" });
  saveState();
  renderPayments();
  renderDashboard();
});

renderDashboard();
renderCalendar();
renderPayments();
renderActivity();
renderNotifications();
