import "./style.css";

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const status = document.querySelector("[data-status]");
const bidForm = document.querySelector("[data-bid-form]");
const homeNav = document.querySelector("[data-site-nav-home]");
const navSolidAt = document.querySelector("[data-nav-solid-at]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

/* —— Capability marquee (ABPD-style JS scrollLeft — works on iOS Safari) —— */
const capabilityTrack = document.querySelector("[data-capability-track]");
const capabilityMarquee = document.querySelector("[data-capability-marquee]");
const capabilitySet = document.querySelector("[data-capability-set]");
const CAPABILITY_PX_PER_SECOND = 40;

let capabilitySetWidth = 0;
let capabilityOffset = 0;
let capabilityLastTime = 0;
let capabilityFrame = 0;
let capabilityTimer = 0;
let capabilityViewportWidth = window.innerWidth;

function stopCapabilityMarquee() {
  if (capabilityFrame) {
    cancelAnimationFrame(capabilityFrame);
    capabilityFrame = 0;
  }
  if (capabilityTimer) {
    window.clearInterval(capabilityTimer);
    capabilityTimer = 0;
  }
}

function tickCapabilityMarquee(now) {
  if (!capabilityTrack || !capabilitySetWidth || prefersReducedMotion.matches) {
    capabilityFrame = 0;
    return;
  }

  if (!capabilityLastTime) capabilityLastTime = now;
  const delta = Math.min((now - capabilityLastTime) / 1000, 0.05);
  capabilityLastTime = now;
  capabilityOffset = (capabilityOffset + CAPABILITY_PX_PER_SECOND * delta) % capabilitySetWidth;
  capabilityTrack.scrollLeft = capabilityOffset;
  capabilityFrame = requestAnimationFrame(tickCapabilityMarquee);
}

function startCapabilityMarquee() {
  if (!capabilitySetWidth || prefersReducedMotion.matches) return;
  if (!capabilityFrame) {
    capabilityLastTime = 0;
    capabilityFrame = requestAnimationFrame(tickCapabilityMarquee);
  }
  /* Watchdog: iOS Safari can stall rAF while the page is visible */
  if (!capabilityTimer) {
    capabilityTimer = window.setInterval(() => {
      if (performance.now() - capabilityLastTime > 80) {
        tickCapabilityMarquee(performance.now());
      }
    }, 50);
  }
}

function updateCapabilityMarquee() {
  if (!capabilityTrack || !capabilityMarquee || !capabilitySet) return;

  stopCapabilityMarquee();
  capabilityMarquee.querySelectorAll("[data-capability-clone]").forEach((node) => node.remove());
  capabilityTrack.scrollLeft = 0;
  capabilityOffset = 0;

  const setWidth = capabilitySet.offsetWidth;
  const trackWidth = capabilityTrack.clientWidth;
  if (!setWidth) return;

  capabilitySetWidth = setWidth;

  if (prefersReducedMotion.matches) return;

  const copies = Math.max(2, Math.ceil((trackWidth + setWidth) / setWidth));
  for (let i = 1; i < copies; i += 1) {
    const clone = capabilitySet.cloneNode(true);
    clone.removeAttribute("data-capability-set");
    clone.setAttribute("data-capability-clone", "");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a").forEach((link) => link.setAttribute("tabindex", "-1"));
    capabilityMarquee.appendChild(clone);
  }

  startCapabilityMarquee();
}

function onCapabilityViewportChange() {
  if (window.innerWidth === capabilityViewportWidth) return;
  capabilityViewportWidth = window.innerWidth;
  updateCapabilityMarquee();
}

if (capabilityTrack && capabilityMarquee && capabilitySet) {
  updateCapabilityMarquee();
  requestAnimationFrame(() => requestAnimationFrame(updateCapabilityMarquee));
  window.addEventListener("resize", onCapabilityViewportChange);
  window.addEventListener("orientationchange", () => {
    capabilityViewportWidth = window.innerWidth;
    updateCapabilityMarquee();
  });
  window.addEventListener("pageshow", updateCapabilityMarquee);
  document.fonts?.ready.then(updateCapabilityMarquee);
  prefersReducedMotion.addEventListener?.("change", updateCapabilityMarquee);
}

/* —— Process streak (JS-driven so iOS does not freeze CSS keyframes) —— */
const processStreaks = [...document.querySelectorAll(".process-step-streak")];
const PROCESS_CYCLE_MS = 6400;
const PROCESS_STEP_DELAY_MS = 1050;
const PROCESS_TRAVEL_RATIO = 0.3;

let processLastTime = 0;
let processFrame = 0;
let processTimer = 0;
let processOrigin = performance.now();

function stopProcessStreaks() {
  if (processFrame) {
    cancelAnimationFrame(processFrame);
    processFrame = 0;
  }
  if (processTimer) {
    window.clearInterval(processTimer);
    processTimer = 0;
  }
}

function paintProcessStreaks(now) {
  if (!processStreaks.length || prefersReducedMotion.matches) return;

  processStreaks.forEach((el, index) => {
    const local = ((now - processOrigin - index * PROCESS_STEP_DELAY_MS) % PROCESS_CYCLE_MS + PROCESS_CYCLE_MS) % PROCESS_CYCLE_MS;
    const travelMs = PROCESS_CYCLE_MS * PROCESS_TRAVEL_RATIO;
    const fadeMs = travelMs * 0.06;

    if (local > travelMs + fadeMs) {
      el.style.opacity = "0";
      el.style.transform = "translate3d(240%, 0, 0)";
      return;
    }

    const progress = Math.min(local / travelMs, 1);
    const x = -120 + progress * 360;
    let opacity = 1;
    if (local < fadeMs) opacity = local / fadeMs;
    else if (local > travelMs) opacity = 1 - (local - travelMs) / fadeMs;

    el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    el.style.transform = `translate3d(${x}%, 0, 0)`;
  });
}

function tickProcessStreaks(now) {
  if (!processStreaks.length || prefersReducedMotion.matches) {
    processFrame = 0;
    return;
  }
  processLastTime = now;
  paintProcessStreaks(now);
  processFrame = requestAnimationFrame(tickProcessStreaks);
}

function startProcessStreaks() {
  if (!processStreaks.length || prefersReducedMotion.matches) {
    processStreaks.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "none";
    });
    return;
  }
  if (!processFrame) {
    processFrame = requestAnimationFrame(tickProcessStreaks);
  }
  if (!processTimer) {
    processTimer = window.setInterval(() => {
      if (performance.now() - processLastTime > 80) {
        tickProcessStreaks(performance.now());
      }
    }, 50);
  }
}

function resetProcessStreaks() {
  stopProcessStreaks();
  processOrigin = performance.now();
  startProcessStreaks();
}

if (processStreaks.length) {
  resetProcessStreaks();
  window.addEventListener("pageshow", resetProcessStreaks);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resetProcessStreaks();
  });
  prefersReducedMotion.addEventListener?.("change", resetProcessStreaks);
}
