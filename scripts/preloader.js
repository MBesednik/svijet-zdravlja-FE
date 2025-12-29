(function () {
  // timings (ms)
  const TEXT_END = 800;
  const LOGO_SHOW_AT = 500; // logo prikaz odmah nakon riječi
  const FADE_START = 4500;
  const FADE_DURATION = 100;
  const REMOVE_AT = FADE_START + FADE_DURATION; // ~4.8s
  const SKIP_KEY = "svz_preloader_seen";

  function removePreloaderInstant() {
    const preloader = document.getElementById("preloader");
    if (preloader && preloader.parentNode) {
      preloader.parentNode.removeChild(preloader);
    }
    document.documentElement.classList.add("preloaded");
  }

  let logoReadyPromise = null;

  async function inlinePreloaderLogo(logoWrap) {
    if (!logoWrap) return null;
    const src = logoWrap.getAttribute("data-svg-src");
    if (!src) return null;

    const fallback = logoWrap.innerHTML;
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error("SVG load failed");
      const svgText = await resp.text();
      logoWrap.innerHTML = svgText;
      const svgEl = logoWrap.querySelector("svg");
      if (!svgEl) throw new Error("SVG missing");
      svgEl.setAttribute("aria-hidden", "true");
      svgEl.removeAttribute("width");
      svgEl.removeAttribute("height");
      svgEl.setAttribute("viewBox", "0 0 886 886");
      svgEl.classList.add("preloader__logo-svg");

      const LAYER_GAP = 0.1; // seconds between sloj layers
      const PATH_GAP = 0.01; // seconds between paths in same layer
      const layerIds = ["3sloj", "2sloj", "1sloj"];
      const processed = new Set();

      function decoratePath(path, layerIndex, pathIndex) {
        const length = Math.ceil(path.getTotalLength());
        const fill = path.getAttribute("fill") || "#3d4a2c";
        const delay = layerIndex * LAYER_GAP + pathIndex * PATH_GAP;
        path.setAttribute("stroke", fill);
        path.setAttribute("stroke-width", "2.5");
        path.style.setProperty("--path-length", length);
        path.style.setProperty("--path-index", pathIndex);
        path.style.setProperty("--path-fill", fill);
        path.style.setProperty("--path-delay", `${delay}s`);
        path.style.setProperty("--stroke-color", fill);
        path.style.strokeDasharray = length;
        path.style.strokeDashoffset = length;
        path.setAttribute("fill", "transparent");
        path.classList.add("preloader__logo-path");
        processed.add(path);
      }

      layerIds.forEach(function (id, layerIdx) {
        const group = svgEl.querySelector(`[id="${id}"]`);
        if (!group) return;
        const paths = group.querySelectorAll("path");
        paths.forEach(function (path, idx) {
          decoratePath(path, layerIdx, idx);
        });
      });

      // Decorate any remaining paths not caught above (fallback)
      const allPaths = svgEl.querySelectorAll("path");
      allPaths.forEach(function (path, idx) {
        if (processed.has(path)) return;
        decoratePath(path, layerIds.length, idx);
      });
      return svgEl;
    } catch (err) {
      console.warn("Failed to inline logo SVG", err);
      logoWrap.innerHTML = fallback;
      return null;
    }
  }

  function initPreloader() {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    // If preloader already shown this session, skip entirely
    try {
      if (sessionStorage.getItem(SKIP_KEY) === "1") {
        removePreloaderInstant();
        return;
      }
    } catch (e) {}

    const textBlock = preloader.querySelector(".preloader__text");
    const logoWrap = preloader.querySelector(".preloader__logo");

    if (!logoReadyPromise) {
      logoReadyPromise = inlinePreloaderLogo(logoWrap);
    }

    preloader.classList.add("preloader--active");

    setTimeout(() => {
      textBlock.classList.add("text--exit");
      logoWrap.classList.add("logo--show");
    }, TEXT_END);

    setTimeout(() => {
      preloader.classList.add("preloader--fade");
      document.documentElement.classList.add("preloaded");
      preloader.setAttribute("aria-hidden", "true");
      try {
        sessionStorage.setItem(SKIP_KEY, "1");
      } catch (e) {}
    }, FADE_START);

    setTimeout(() => {
      if (preloader && preloader.parentNode)
        preloader.parentNode.removeChild(preloader);
    }, REMOVE_AT + 50);
  }

  if (document.readyState === "complete") {
    initPreloader();
  } else {
    window.addEventListener("load", initPreloader);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;
    try {
      if (sessionStorage.getItem(SKIP_KEY) === "1") {
        removePreloaderInstant();
        return;
      }
    } catch (e) {}
    const logoWrap = preloader.querySelector(".preloader__logo");

    if (!logoReadyPromise) {
      logoReadyPromise = inlinePreloaderLogo(logoWrap);
    }

    // Show logo after words animate in
    setTimeout(() => {
      preloader.classList.add("logo-visible");
      if (logoWrap && logoReadyPromise) {
        logoReadyPromise.then(() => {
          setTimeout(() => {
            logoWrap.classList.add("is-filled");
          }, 300);
        });
      }
    }, LOGO_SHOW_AT);

    // Hide preloader after animation finishes (~11s)
    setTimeout(() => {
      preloader.classList.add("hide");
      preloader.setAttribute("aria-hidden", "true");
    }, FADE_START);
  });
})();
