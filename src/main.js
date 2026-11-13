import "./style.css";

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const status = document.querySelector("[data-status]");
const bidForm = document.querySelector("[data-bid-form]");
const homeNav = document.querySelector("[data-site-nav-home]");
const navSolidAt = document.querySelector("[data-nav-solid-at]");
const siteNav = document.querySelector(".site-nav");
const servicesMenu = document.querySelector("[data-services-menu]");
const servicesToggle = document.querySelector("[data-services-toggle]");
const servicesOpenBtn = document.querySelector("[data-services-open]");
const servicesMega = document.querySelector("[data-services-mega]");
const servicesClose = document.querySelector("[data-services-close]");
const desktopNav = window.matchMedia("(min-width: 1024px)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

let servicesCloseTimer = 0;

function setStatus(message) {
  if (status) status.textContent = message;
}

function syncHomeNavSolid() {
  if (!homeNav || !navSolidAt) return;
  const navBottom = homeNav.getBoundingClientRect().bottom;
  const triggerTop = navSolidAt.getBoundingClientRect().top;
  homeNav.classList.toggle("is-solid", triggerTop <= navBottom);
}

function setServicesOpen(open) {
  if (!servicesMega) return;
  servicesMega.hidden = !open;
  siteNav?.classList.toggle("is-services-open", open);
  servicesMenu?.classList.toggle("is-open", open);
  const expanded = open ? "true" : "false";
  servicesToggle?.setAttribute("aria-expanded", expanded);
  servicesOpenBtn?.setAttribute("aria-expanded", expanded);
  if (!open) window.clearTimeout(servicesCloseTimer);
}

function servicesFocusInside() {
  const active = document.activeElement;
  return Boolean(
    (servicesMenu && active && servicesMenu.contains(active)) ||
      (servicesMega && active && servicesMega.contains(active)),
  );
}

function queueServicesClose() {
  window.clearTimeout(servicesCloseTimer);
  servicesCloseTimer = window.setTimeout(() => {
    if (servicesFocusInside()) return;
    setServicesOpen(false);
  }, 180);
}

function cancelServicesClose() {
  window.clearTimeout(servicesCloseTimer);
}

function closeMobileNav() {
  mobileNav?.classList.remove("is-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}

servicesMega?.querySelectorAll("a[href]").forEach((link) => {
  const path = new URL(link.getAttribute("href"), window.location.origin).pathname;
  if (path === window.location.pathname) link.setAttribute("aria-current", "page");
});

menuToggle?.addEventListener("click", () => {
  const open = mobileNav?.classList.toggle("is-open");
  if (!open) setServicesOpen(false);
  menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileNav();
    setServicesOpen(false);
  });
});

servicesMenu?.addEventListener("pointerenter", () => {
  if (!desktopNav.matches || !finePointer.matches) return;
  cancelServicesClose();
  setServicesOpen(true);
});

servicesMenu?.addEventListener("pointerleave", () => {
  if (!desktopNav.matches || !finePointer.matches) return;
  queueServicesClose();
});

servicesMega?.addEventListener("pointerenter", () => {
  if (!desktopNav.matches || !finePointer.matches) return;
  cancelServicesClose();
});

servicesMega?.addEventListener("pointerleave", () => {
  if (!desktopNav.matches || !finePointer.matches) return;
  queueServicesClose();
});

servicesMenu?.addEventListener("keydown", (event) => {
  if (!desktopNav.matches || event.key !== "ArrowDown") return;
  event.preventDefault();
  setServicesOpen(true);
  servicesMega?.querySelector("a")?.focus();
});

servicesToggle?.addEventListener("click", () => {
  setServicesOpen(Boolean(servicesMega?.hidden));
});

servicesMenu?.querySelector(".nav-services-link")?.addEventListener("click", (event) => {
  if (!desktopNav.matches || finePointer.matches || !servicesMega?.hidden) return;
  event.preventDefault();
  setServicesOpen(true);
});

servicesToggle?.addEventListener("keydown", (event) => {
  if (!desktopNav.matches || event.key !== "Tab" || event.shiftKey || servicesMega?.hidden) return;
  const first = servicesMega.querySelector("a");
  if (!first) return;
  event.preventDefault();
  first.focus();
});

servicesMega?.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || !desktopNav.matches) return;
  const items = [...servicesMega.querySelectorAll("a")];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!event.shiftKey && event.target === last) {
    event.preventDefault();
    setServicesOpen(false);
    const projects = servicesMenu?.nextElementSibling;
    if (projects instanceof HTMLElement) projects.focus();
  }
  if (event.shiftKey && event.target === first) {
    event.preventDefault();
    servicesToggle?.focus();
  }
});

servicesOpenBtn?.addEventListener("click", () => {
  mobileNav?.classList.add("is-open");
  menuToggle?.setAttribute("aria-expanded", "true");
  setServicesOpen(true);
  servicesClose?.focus();
});

servicesClose?.addEventListener("click", () => {
  setServicesOpen(false);
  servicesOpenBtn?.focus();
});

servicesMega?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    setServicesOpen(false);
    closeMobileNav();
  });
});

document.addEventListener("pointerdown", (event) => {
  if (!servicesMega || servicesMega.hidden) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (servicesMega.contains(target) || servicesMenu?.contains(target)) return;
  if (target.closest("[data-menu-toggle], [data-services-open], [data-services-close]")) return;
  if (!desktopNav.matches) closeMobileNav();
  setServicesOpen(false);
});

document.addEventListener("focusin", (event) => {
  if (!servicesMega || servicesMega.hidden) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (servicesMega.contains(target) || servicesMenu?.contains(target)) return;
  setServicesOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !servicesMega || servicesMega.hidden) return;
  setServicesOpen(false);
  if (desktopNav.matches) servicesToggle?.focus();
  else servicesOpenBtn?.focus();
});

desktopNav.addEventListener("change", () => {
  setServicesOpen(false);
  closeMobileNav();
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
