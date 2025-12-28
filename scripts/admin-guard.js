(function () {
  function getToken() {
    try {
      return localStorage.getItem("svz_admin_token");
    } catch (e) {
      return null;
    }
  }

  function isAdmin() {
    var t = getToken();
    return !!t && t !== "null" && t !== "undefined" && String(t).trim() !== "";
  }

  function revealAdminElements() {
    if (!isAdmin()) return;
    document.querySelectorAll(".admin-only").forEach(function (el) {
      el.classList.remove("admin-only");
      el.removeAttribute("aria-hidden");
    });
  }

  function enforceAdminAccess(redirectTo) {
    if (isAdmin()) return true;
    var to = redirectTo || "/blog/blog.html";
    try {
      // kratka poruka korisniku prije preusmjeravanja
      alert("Pristup odbijen. Morate biti prijavljeni kao administrator.");
    } catch (e) {}
    window.location.replace(to);
    return false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    revealAdminElements();
  });

  // Izlaganje API-ja za slučajeve kada je potrebno eksplicitno pozvati
  window.adminGuard = {
    isAdmin: isAdmin,
    revealAdminElements: revealAdminElements,
    enforceAdminAccess: enforceAdminAccess,
  };
})();
