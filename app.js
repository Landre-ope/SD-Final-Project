const screens = [
  "login", "dashboard", "calendar", "payments", "notifications", "profile",
  "activity", "forgot", "contact", "calendar-help", "maintenance", "review",
  "success", "booking", "booking-success",
];

const events = [
  { date: "2024-10-18", type: "maintenance", title: "Maintenance visit", detail: "10:00 AM · Unit 302", color: "blue" },
  { date: "2024-10-26", type: "booking", title: "Basement booking", detail: "09:00 AM – 12:00 PM · Community basement", color: "peach" },
  { date: "2024-11-01", type: "payment", title: "Rent payment due", detail: "₱12,500 · November rent", color: "payment" },
  { date: "2024-11-02", type: "grace", title: "Extended payment available", detail: "Grace period starts · ₱12,500", color: "grace" },
  { date: "2024-11-03", type: "grace", title: "Extended payment available", detail: "Grace period · ₱12,500", color: "grace" },
  { date: "2024-11-04", type: "grace", title: "Extended payment available", detail: "Grace period · ₱12,500", color: "grace" },
  { date: "2024-11-05", type: "grace", title: "Extended payment available", detail: "Grace period · ₱12,500", color: "grace" },
  { date: "2024-11-06", type: "grace", title: "Last day for extended payment", detail: "Late fee may apply after today", color: "grace" },
];

let calendarDate = new Date(2024, 9, 1);
let selectedDate = "2024-10-18";

const showScreen = (name) => {
  const target = screens.includes(name) ? name : "dashboard";
  screens.forEach((screen) => {
    document.getElementById(`${screen}-screen`).classList.toggle("hidden", screen !== target);
  });
  if (target === "calendar") renderCalendar();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const formatLongDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
    const dayEvents = events.filter((event) => event.date === key);
    if (dayEvents.length) {
      const markers = document.createElement("span");
      markers.className = "day-markers";
      dayEvents.slice(0, 3).forEach((event) => {
        const marker = document.createElement("i");
        marker.className = `${event.type}-dot`;
        markers.appendChild(marker);
      });
      cell.appendChild(markers);
    }
    grid.appendChild(cell);
  }
  renderSelectedDay();
}

function renderSelectedDay() {
  const dayEvents = events.filter((event) => event.date === selectedDate);
  document.querySelector("#selected-date").textContent = formatLongDate(selectedDate);
  document.querySelector("#selected-count").textContent = `${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`;
  const list = document.querySelector("#selected-events");
  list.innerHTML = dayEvents.length
    ? dayEvents.map((event) => `<div class="selected-event"><span class="activity-icon ${event.color}">${event.type === "payment" || event.type === "grace" ? "₱" : event.type === "booking" ? "▣" : "⌁"}</span><div><b>${event.title}</b><small>${event.detail}</small></div></div>`).join("")
    : '<p class="muted empty-events">Nothing scheduled for this day.</p>';
}

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showScreen("dashboard");
});

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
  document.querySelector("#review-category").textContent = data.get("category") || "Not specified";
  document.querySelector("#review-description").textContent = data.get("description") || "Not specified";
  document.querySelector("#review-time").textContent = data.get("time") || "Anytime";
  showScreen("review");
});

document.querySelector("#submit-maintenance").addEventListener("click", () => showScreen("success"));

document.querySelector("#booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const date = data.get("date");
  if (date) {
    const existing = events.find((item) => item.type === "booking");
    if (existing) existing.date = date;
    selectedDate = date;
    calendarDate = new Date(`${date}T12:00:00`);
    document.querySelector("#booking-success-date").textContent = formatLongDate(date);
    document.querySelector("#booking-success-time").textContent = `${data.get("start")} – ${data.get("end")} · Community basement`;
  }
  showScreen("booking-success");
});

renderCalendar();
