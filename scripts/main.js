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

function addLogoutNavItem() {
  if (!navList || !hasAdminToken()) return;
  if (navList.querySelector(".js-logout-nav")) return;

  const item = document.createElement("li");
  item.className = "header__nav-item";

  const btn = document.createElement("a");
  btn.href = "#";
  btn.className = "header__nav-link js-logout-nav";
  btn.textContent = "Odjava";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    removeAdminToken();
    if (nav && nav.classList.contains("is-active")) {
      toggleMenu();
    }
    window.location.href = "/index.html";
  });

  item.appendChild(btn);
  navList.appendChild(item);
}

addLogoutNavItem();
