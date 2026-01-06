// Toast helper za prikazivanje poruka

(function () {
  // Dodaj toast container ako ne postoji
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.top = "32px";
    container.style.right = "32px";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "12px";
    document.body.appendChild(container);
  }

  window.showToast = function (message, options = {}) {
    const duration = Number(options.duration) || 3000;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.style.background = options.background || "rgba(79, 107, 58, 0.85)";
    toast.style.color = options.color || "#f7f8f4";
    toast.style.boxShadow =
      options.shadow || "0 18px 35px rgba(79, 107, 58, 0.18)";

    const text = document.createElement("div");
    text.className = "toast__message";
    text.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast__close";
    closeBtn.setAttribute("aria-label", "Zatvori obavijest");
    closeBtn.innerHTML = "&times;";

    const progress = document.createElement("div");
    progress.className = "toast__progress";
    progress.style.background =
      options.progressColor || "rgba(245, 249, 242, 0.9)";
    progress.style.animationDuration = duration + "ms";

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    toast.appendChild(progress);

    container.appendChild(toast);

    const hideToast = function () {
      toast.classList.add("toast--hide");
      progress.style.animationPlayState = "paused";
      setTimeout(function () {
        toast.remove();
      }, 300);
    };

    // Slide in
    requestAnimationFrame(function () {
      toast.classList.add("toast--visible");
    });

    const autoHide = setTimeout(hideToast, duration);
    closeBtn.addEventListener("click", function () {
      clearTimeout(autoHide);
      hideToast();
    });
  };
})();
