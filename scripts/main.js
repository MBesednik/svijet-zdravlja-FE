// Floating TOC generator - sada kao funkcija
function generateFloatingTOC() {
  const postContent = document.getElementById("post-content");
  if (!postContent) return;

  const chapterTitles = postContent.querySelectorAll("h3.post-chapter__title");
  if (chapterTitles.length === 0) {
    document.getElementById("floating-toc").style.display = "none";
    return;
  }

  const tocList = document.getElementById("toc-list");
  tocList.innerHTML = "";

  // Kontrola za ručno kliknuti TOC (da scroll event ne preuzima odmah)
  let tocClickInProgress = false;
  let tocClickTimeout = null;

  chapterTitles.forEach((h3, idx) => {
    if (!h3.id) h3.id = "chapter-" + (idx + 1);
    h3.style.scrollMarginTop = "130px";

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + h3.id;
    a.textContent = h3.textContent;
    a.className = "toc__item";
    a.tabIndex = 0;
    // Smooth scroll handler - spriječi scroll event highlight dok traje scroll
    a.addEventListener("click", function (e) {
      e.preventDefault();
      document
        .querySelectorAll(".toc__item")
        .forEach((el) => el.classList.remove("toc__item--active"));
      document.getElementById(h3.id).scrollIntoView({ behavior: "smooth" });

      tocClickInProgress = true;
      a.classList.add("toc__item--active");
      // Makni focus s linka nakon klika (da ne ostane outline/tab)
      a.blur();
      if (tocClickTimeout) clearTimeout(tocClickTimeout);
      tocClickTimeout = setTimeout(() => {
        tocClickInProgress = false;
      }, 700); // dulje od trajanja scrolla
    });
    li.appendChild(a);
    tocList.appendChild(li);
  });

  // Prikaži TOC
  document.getElementById("floating-toc").style.display = "block";

  // Highlight active TOC item on scroll, ali ne dok je tocClickInProgress
  let lastActiveIdx = -1;
  window.addEventListener("scroll", function () {
    if (tocClickInProgress) return;
    let activeIdx = -1;
    let minDist = Infinity;
    chapterTitles.forEach((h3, idx) => {
      const rect = h3.getBoundingClientRect();
      const dist = Math.abs(rect.top - 140);
      if (rect.top < 140 && dist < minDist) {
        minDist = dist;
        activeIdx = idx;
      }
    });
    if (activeIdx === -1) {
      chapterTitles.forEach((h3, idx) => {
        const rect = h3.getBoundingClientRect();
        if (rect.top >= 140 && activeIdx === -1) activeIdx = idx;
      });
    }
    if (activeIdx !== lastActiveIdx) {
      document.querySelectorAll(".toc__item").forEach((el, idx) => {
        el.classList.toggle("toc__item--active", idx === activeIdx);
      });
      lastActiveIdx = activeIdx;
    }
  });
}

// Pozovi TOC generiranje na DOMContentLoaded (fallback za statički sadržaj)
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(generateFloatingTOC, 500);
});

// Ako ne možeš direktno u blog.js, možeš dodati observer:
const postContent = document.getElementById("post-content");
if (postContent) {
  const tocObserver = new MutationObserver(() => {
    generateFloatingTOC();
  });
  tocObserver.observe(postContent, { childList: true, subtree: true });
}

// Accordion logic for references
document.addEventListener("DOMContentLoaded", function () {
  const section = document.getElementById("post-references-section");
  const toggle = document.getElementById("references-toggle");
  const collapse = document.getElementById("post-references-collapse");

  if (!toggle || !collapse) return;

  toggle.addEventListener("click", function () {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    collapse.setAttribute("aria-hidden", String(expanded));
    if (!expanded) {
      collapse.classList.add("open");
      // Set to scrollHeight for smooth open
      collapse.style.maxHeight = collapse.scrollHeight + "px";
    } else {
      collapse.classList.remove("open");
      // Set to 0 for smooth close
      collapse.style.maxHeight = "0";
    }
  });

  // Optional: If references are loaded dynamically, update maxHeight
  const observer = new MutationObserver(() => {
    if (collapse.classList.contains("open")) {
      collapse.style.maxHeight = collapse.scrollHeight + "px";
    }
  });
  observer.observe(document.getElementById("post-references-list"), {
    childList: true,
    subtree: true,
  });
});

// Responsive layout for featured posts (index)
document.addEventListener("DOMContentLoaded", function () {
  const featuredPosts = document.getElementById("featured-posts");
  if (!featuredPosts) return;

  function setFeaturedPostsLayout() {
    const posts = featuredPosts.children;
    featuredPosts.classList.remove(
      "post-list--single",
      "post-list--double",
      "post-list--triple"
    );
    if (posts.length === 1) {
      featuredPosts.classList.add("post-list--single");
    } else if (posts.length === 2) {
      featuredPosts.classList.add("post-list--double");
    } else if (posts.length === 3) {
      featuredPosts.classList.add("post-list--triple");
    }
  }

  const observer = new MutationObserver(setFeaturedPostsLayout);
  observer.observe(featuredPosts, { childList: true });
  setFeaturedPostsLayout();
});

// Dinamički postavi trenutnu godinu u copyright
document.addEventListener("DOMContentLoaded", function () {
  var yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

// Hamburger menu toggle
const hamburger = document.querySelector(".header__hamburger");
const nav = document.querySelector(".header__nav");
const navList = document.querySelector(".header__nav-list");
const body = document.body;

// Kreiranje overlay elementa
const overlay = document.createElement("div");
overlay.classList.add("header-overlay");
body.appendChild(overlay);

// Toggle funkcija
function toggleMenu() {
  const isActive = hamburger.classList.contains("is-active");

  hamburger.classList.toggle("is-active");
  nav.classList.toggle("is-active");
  overlay.classList.toggle("is-active");
  hamburger.setAttribute("aria-expanded", !isActive);

  // Sprečavanje scrollanja kada je meni otvoren
  if (!isActive) {
    body.style.overflow = "hidden";
  } else {
    body.style.overflow = "";
  }
}

// Event listeneri
hamburger.addEventListener("click", toggleMenu);
overlay.addEventListener("click", toggleMenu);

// Zatvaranje menija na ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav.classList.contains("is-active")) {
    toggleMenu();
  }
});

// Zatvaranje menija kada se klikne na link
const navLinks = document.querySelectorAll(".header__nav-link");
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (nav.classList.contains("is-active")) {
      toggleMenu();
    }
  });
});

// Responsive: zatvori meni ako se pređe na desktop
window.addEventListener("resize", () => {
  if (window.innerWidth >= 768 && nav.classList.contains("is-active")) {
    toggleMenu();
  }
});

function hasAdminToken() {
  let token = null;
  try {
    token = localStorage.getItem("svz_admin_token");
  } catch (e) {
    token = null;
  }
  if (
    token &&
    token !== "null" &&
    token !== "undefined" &&
    String(token).trim() !== ""
  ) {
    return true;
  }
  const cookieMatch = document.cookie.match(/(?:^|; )svz_admin_token=([^;]+)/i);
  return !!(cookieMatch && cookieMatch[1]);
}

function removeAdminToken() {
  try {
    localStorage.removeItem("svz_admin_token");
  } catch (e) {}
  document.cookie =
    "svz_admin_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

function addAdminNavItems() {
  if (!navList || !hasAdminToken()) return;

  const ensureNavLink = function (className, text, href, onClick) {
    if (navList.querySelector("." + className)) return;
    const item = document.createElement("li");
    item.className = "header__nav-item";

    const link = document.createElement("a");
    link.href = href || "#";
    link.className = "header__nav-link " + className;
    link.textContent = text;
    if (onClick) {
      link.addEventListener("click", onClick);
    } else {
      // close menu on navigation
      link.addEventListener("click", () => {
        if (nav && nav.classList.contains("is-active")) {
          toggleMenu();
        }
      });
    }

    item.appendChild(link);
    navList.appendChild(item);
  };

  ensureNavLink("js-dashboard-nav", "Dashboard", "/admin/dashboard.html");
  ensureNavLink("js-logout-nav", "Odjava", "#", (e) => {
    e.preventDefault();
    removeAdminToken();
    if (nav && nav.classList.contains("is-active")) {
      toggleMenu();
    }
    window.location.href = "/index.html";
  });
}

addAdminNavItems();
