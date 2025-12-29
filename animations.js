// Čekaj da se stranica učita
document.addEventListener("DOMContentLoaded", function () {
  // Pronađi .hero sekciju
  const heroSection = document.querySelector(".hero");
  if (!heroSection) return;

  // Pronađi sve sekcije nakon .hero
  let elementsToAnimate = [];
  let el = heroSection.nextElementSibling;
  while (el) {
    if (el.classList.contains("about-section")) {
      // O NAMA labela - animacija s lijeva na desno
      const label = el.querySelector(".hero__label");
      if (label) {
        label.classList.add("scroll-animate-x-left");
        elementsToAnimate.push(label);
      }
      // Slika - animacija s desna na lijevo
      const aboutImg = el.querySelector(".about-image img");
      if (aboutImg) {
        aboutImg.classList.add("scroll-animate-x-right");
        elementsToAnimate.push(aboutImg);
      }
      // Ostali elementi kao i prije
      elementsToAnimate.push(
        ...el.querySelectorAll(`
        h2,
        h3,
        h4,
        p,
        .badge,
        .service-card,
        .btn-primary,
        .btn--primary,
        .btn--secondary
      `)
      );
    } else if (el.classList.contains("featured-posts")) {
      // Dodaj header elemente i gumb u .featured-posts
      const header = el.querySelector(".featured-posts__header");
      if (header) {
        const headerEls = header.querySelectorAll(
          ".blog__eyebrow, h2, .text-secondary"
        );
        elementsToAnimate.push(...headerEls);
      }
      // Dodaj gumb "Pogledaj sve objave"
      const btn = el.querySelector(".btn.btn--secondary");
      if (btn) elementsToAnimate.push(btn);
      // Dodaj .post-card kartice
      elementsToAnimate.push(...el.querySelectorAll(".post-card"));
    } else {
      // Za sve ostale sekcije, animiraj naslove, paragrafe, kartice usluga, CTA dugmad itd.
      elementsToAnimate.push(
        ...el.querySelectorAll(`
        h2,
        h3,
        h4,
        p,
        .badge,
        .service-card,
        .btn-primary,
        .btn--primary,
        .btn--secondary
      `)
      );
    }
    el = el.nextElementSibling;
  }

  // SVI elementi animiraju bez odgode
  elementsToAnimate.forEach((element) => {
    // Samo za standardne scroll-animate klase
    if (
      !element.classList.contains("scroll-animate-x-left") &&
      !element.classList.contains("scroll-animate-x-right")
    ) {
      element.classList.add("scroll-animate");
      element.style.transitionDelay = "0s";
    }
  });

  // Intersection Observer koji prati kad element postane vidljiv
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Kad element postane vidljiv, dodaj klasu 'visible'
          entry.target.classList.add("visible");
          // Prestani promatrati element (animira se samo jednom)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15, // 15% elementa mora biti vidljivo
      rootMargin: "0px 0px -100px 0px", // pokreni malo prije nego element dođe do dna
    }
  );

  // Počni promatrati sve elemente
  elementsToAnimate.forEach((element) => {
    observer.observe(element);
  });
});

// Čekaj da se stranica učita
document.addEventListener("DOMContentLoaded", function () {
  // Selektiraj elemente za animaciju SAMO nakon hero sekcije
  const elementsToAnimate = document.querySelectorAll(`
    .about-section h2,
    .about-section p,
    .about-section .badge,
    .about-section h3,
    .about-section .intro-text,
    .about-section .feature-item,
    .about-section img,
    .services-section .section-title,
    .services-section .section-subtitle,
    .service-card,
    .btn-primary,
    .featured-posts__header h2,
    .featured-posts__header p,
    .featured-posts__header .blog__eyebrow,
    .post-list,
    .featured-posts .btn,

  `);

  elementsToAnimate.forEach((element) => {
    element.classList.add("scroll-animate");
    element.style.transitionDelay = "";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -100px 0px",
    }
  );

  elementsToAnimate.forEach((element) => {
    observer.observe(element);
  });
});

// Čekaj da se stranica učita
document.addEventListener("DOMContentLoaded", function () {
  // Selektiraj .service-card i .services-grid za animaciju
  const elementsToAnimate = document.querySelectorAll(
    ".services-grid, .service-card"
  );

  elementsToAnimate.forEach((element) => {
    element.classList.add("scroll-animate");
    element.style.transitionDelay = "";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -100px 0px",
    }
  );

  elementsToAnimate.forEach((element) => {
    observer.observe(element);
  });
});

// Čekaj da se stranica učita
document.addEventListener("DOMContentLoaded", function () {
  // Slide s lijeva na desno: O NAMA label
  const label = document.querySelector(".about-section .hero__label");
  if (label) {
    label.classList.add("scroll-animate-left");
  }

  // Slide s desna na lijevo: slika u about sekciji
  const aboutImage = document.querySelector(".about-section .about-image");
  if (aboutImage) {
    aboutImage.classList.add("scroll-animate-right");
  }

  // Slide up: usluge grid i kartice
  const elementsToAnimate = document.querySelectorAll(
    ".services-grid, .service-card"
  );
  elementsToAnimate.forEach((element) => {
    element.classList.add("scroll-animate");
    element.style.transitionDelay = "";
  });

  // Observer za sve animacije
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -100px 0px",
    }
  );

  // Promatraj labelu i sliku
  if (label) observer.observe(label);
  if (aboutImage) observer.observe(aboutImage);

  // Promatraj usluge grid i kartice
  elementsToAnimate.forEach((element) => {
    observer.observe(element);
  });
});
