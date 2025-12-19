(function () {
  "use strict";

  var baseUrl = (
    window.__SVZ_BASE_URL__ ||
    window.SVZ_BASE_URL ||
    "http://127.0.1:5000"
  ).replace(/\/$/, "");

  window.SVZ_CONFIG = {
    baseUrl: baseUrl,
    apiBase: baseUrl + "/api",
    adminApiBase: baseUrl + "/api/admin",
  };
  window.getSVZBaseUrl = function () {
    return window.SVZ_CONFIG.baseUrl;
  };
  window.getSVZApiBase = function () {
    return window.SVZ_CONFIG.apiBase;
  };
  window.getSVZAdminApiBase = function () {
    return window.SVZ_CONFIG.adminApiBase;
  };
})();
