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
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.background = options.background || "#222";
    toast.style.color = options.color || "#fff";
    toast.style.padding = "14px 24px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
    toast.style.fontSize = "1rem";
    toast.style.fontWeight = "500";
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";

    container.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);

    // Auto remove after 3s
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, options.duration || 3000);
  };
})();
