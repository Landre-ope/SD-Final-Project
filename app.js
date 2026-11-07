const screens = ["login", "dashboard", "maintenance", "review", "success", "booking", "booking-success"];
const showScreen = (name) => {
  screens.forEach((screen) => document.getElementById(`${screen}-screen`).classList.toggle("hidden", screen !== name));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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
  showScreen("booking-success");
});
