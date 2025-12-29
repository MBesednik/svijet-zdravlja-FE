(function () {
  // timings (ms)
  const TEXT_END = 1500;
  const LOGO_SHOW_AT = 1500; // logo prikaz odmah nakon riječi
  const FADE_START = 3700;
  const FADE_DURATION = 300;
  const REMOVE_AT = FADE_START + FADE_DURATION; // 4000

  function initPreloader() {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    const textBlock = preloader.querySelector(".preloader__text");
    const logoWrap = preloader.querySelector(".preloader__logo");

    preloader.classList.add("preloader--active");

    setTimeout(() => {
      textBlock.classList.add("text--exit");
      logoWrap.classList.add("logo--show");
    }, TEXT_END);

    setTimeout(() => {
      preloader.classList.add("preloader--fade");
      document.documentElement.classList.add("preloaded");
      preloader.setAttribute("aria-hidden", "true");
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
})();
