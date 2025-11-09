// Hamburger menu toggle
const hamburger = document.querySelector(".header__hamburger");
const nav = document.querySelector(".header__nav");
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
