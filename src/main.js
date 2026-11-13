import "./style.css";

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const status = document.querySelector("[data-status]");
const bidForm = document.querySelector("[data-bid-form]");
const homeNav = document.querySelector("[data-site-nav-home]");
const navSolidAt = document.querySelector("[data-nav-solid-at]");

function setStatus(message) {
  if (status) status.textContent = message;
}

function syncHomeNavSolid() {
  if (!homeNav || !navSolidAt) return;
  const navBottom = homeNav.getBoundingClientRect().bottom;
  const triggerTop = navSolidAt.getBoundingClientRect().top;
  homeNav.classList.toggle("is-solid", triggerTop <= navBottom);
}

menuToggle?.addEventListener("click", () => {
  const open = mobileNav?.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

if (homeNav && navSolidAt) {
  syncHomeNavSolid();
  window.addEventListener("scroll", syncHomeNavSolid, { passive: true });
  window.addEventListener("resize", syncHomeNavSolid);
}

document.querySelectorAll("[data-faq]").forEach((item) => {
  const trigger = item.querySelector("summary");
  trigger?.addEventListener("click", () => {
    requestAnimationFrame(() => {
      trigger.setAttribute("aria-expanded", item.open ? "true" : "false");
    });
  });
});

bidForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(bidForm);
  const required = ["name", "email", "projectType", "location", "trades", "details"];
  const missing = required.some((key) => !String(data.get(key) || "").trim());
  if (missing) {
    setStatus("Please complete all fields before requesting a bid.");
    return;
  }
  setStatus("Thanks — your bid request is ready to send. Email wiring comes next.");
  bidForm.reset();
});
