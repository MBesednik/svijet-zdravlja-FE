// Firebase Analytics setup (shared)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import { getPerformance, trace as perfTrace } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-performance.js";

const firebaseConfig = {
  apiKey: "AIzaSyAS9Oy88NY70Eo4lOpQDkYO0vD5FYHBUp8",
  authDomain: "jugo-projekt.firebaseapp.com",
  projectId: "jugo-projekt",
  storageBucket: "jugo-projekt.firebasestorage.app",
  messagingSenderId: "349150746918",
  appId: "1:349150746918:web:20219a6eeacc2f955e49e7",
  measurementId: "G-T903QB3RZZ",
};

let analytics = null;
let perf = null;
try {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  perf = getPerformance(app);
} catch (e) {
  console.warn("Analytics init failed", e);
}

/**
 * Global tracker helper
 * Usage: window.svzTrack('event_name', { param: value })
 */
window.svzTrack = function (eventName, params) {
  if (!analytics || !eventName) return;
  try {
    logEvent(analytics, eventName, params || {});
  } catch (e) {
    console.warn("Analytics event failed", e);
  }
};

/**
 * Performance trace helpers
 */
window.svzStartTrace = function (name, attributes) {
  if (!perf || !name || !perfTrace) return null;
  try {
    const t = perfTrace(perf, name);
    if (attributes && typeof attributes === "object") {
      Object.keys(attributes).forEach((key) => {
        if (attributes[key] != null) {
          t.putAttribute(String(key), String(attributes[key]));
        }
      });
    }
    t.start();
    return t;
  } catch (e) {
    console.warn("Trace start failed", e);
    return null;
  }
};

window.svzStopTrace = function (traceObj, metrics) {
  if (!traceObj) return;
  try {
    if (metrics && typeof metrics === "object") {
      Object.keys(metrics).forEach((key) => {
        const val = metrics[key];
        if (typeof val === "number" && !Number.isNaN(val)) {
          traceObj.putMetric(String(key), val);
        }
      });
    }
    traceObj.stop();
  } catch (e) {
    console.warn("Trace stop failed", e);
  }
};

// Custom page load trace (complements built-in automatic traces)
function initPageLoadTrace() {
  if (!perf || !perfTrace) return;
  try {
    const nav =
      performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0];
    let dcl = null;
    let load = null;
    if (nav) {
      dcl = nav.domContentLoadedEventEnd - nav.startTime;
      load = nav.loadEventEnd - nav.startTime;
    } else if (performance.timing) {
      const t = performance.timing;
      dcl = t.domContentLoadedEventEnd - t.navigationStart;
      load = t.loadEventEnd - t.navigationStart;
    }
    const t = perfTrace(perf, "page_load_custom");
    t.putAttribute("path", window.location.pathname);
    if (dcl && dcl > 0) t.putMetric("dcl_ms", Math.round(dcl));
    if (load && load > 0) t.putMetric("load_ms", Math.round(load));
    t.start();
    t.stop();
  } catch (e) {
    console.warn("page_load_custom trace failed", e);
  }
}

if (document.readyState === "complete") {
  initPageLoadTrace();
} else {
  window.addEventListener("load", initPageLoadTrace);
}

// Simple engagement timers
let svzEngageStart = Date.now();
let svzCurrentPage = window.location.pathname;

function sendEngagement(eventName) {
  if (!analytics) return;
  const durationMs = Date.now() - svzEngageStart;
  window.svzTrack(eventName, {
    path: svzCurrentPage,
    duration_ms: durationMs,
    referrer: document.referrer || undefined,
  });
  svzEngageStart = Date.now();
}

window.addEventListener("beforeunload", function () {
  sendEngagement("page_engagement");
});

document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    sendEngagement("page_engagement");
  } else if (document.visibilityState === "visible") {
    svzEngageStart = Date.now();
  }
});

// Basic click tracking for nav and marked CTAs
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".header__nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      window.svzTrack &&
        window.svzTrack("nav_click", {
          label: link.textContent || link.getAttribute("aria-label") || "nav",
          href: link.getAttribute("href"),
        });
    });
  });

  document.querySelectorAll('[data-track="cta"]').forEach(function (el) {
    el.addEventListener("click", function () {
      window.svzTrack &&
        window.svzTrack("cta_click", {
          label: el.textContent || el.getAttribute("aria-label") || "cta",
          href: el.getAttribute("href") || el.dataset.href,
        });
    });
  });
});
