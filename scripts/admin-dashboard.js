(function () {
  "use strict";

  const ADMIN_API_BASE = window.getSVZAdminApiBase
    ? window.getSVZAdminApiBase()
    : "";

  const state = {
    categories: [],
    editingId: null,
    topPosts: [],
    postStatuses: {},
  };

  const els = {
    metricsForm: document.getElementById("metrics-form"),
    startInput: document.getElementById("metrics-start"),
    endInput: document.getElementById("metrics-end"),
    topLimitInput: document.getElementById("metrics-top-limit"),
    status: document.getElementById("metrics-status"),
    totals: {
      views: document.getElementById("metric-views"),
      likes: document.getElementById("metric-likes"),
      shares: document.getElementById("metric-shares"),
    },
    dailyBody: document.getElementById("metrics-daily-body"),
    topBody: document.getElementById("metrics-top-body"),
    rangeLabel: document.getElementById("metrics-range-label"),
    topLabel: document.getElementById("metrics-top-label"),
    topStatusFilter: document.getElementById("top-status-filter"),
    catForm: document.getElementById("category-form"),
    catName: document.getElementById("cat-name"),
    catSlug: document.getElementById("cat-slug"),
    catDesc: document.getElementById("cat-description"),
    catVisible: document.getElementById("cat-visible"),
    catSave: document.getElementById("cat-save"),
    catCancel: document.getElementById("cat-cancel"),
    catStatus: document.getElementById("category-status"),
    catBody: document.getElementById("categories-body"),
  };

  function showToastMessage(message, type) {
    if (typeof showToast === "function") {
      showToast(message, {
        background: type === "error" ? "#9b1c1c" : "#0b1f1a",
      });
    } else {
      console.log(type || "info", message);
    }
  }

  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return [y, m, d].join("-");
  }

  function slugify(value) {
    return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getAdminToken() {
    try {
      return localStorage.getItem("svz_admin_token");
    } catch (e) {
      return null;
    }
  }

  function clearAdminToken() {
    try {
      localStorage.removeItem("svz_admin_token");
    } catch (e) {}
  }

  async function refreshAdminToken() {
    const token = getAdminToken();
    if (!token || !ADMIN_API_BASE) return null;
    try {
      const resp = await fetch(`${ADMIN_API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        clearAdminToken();
        return null;
      }
      const data = await resp.json().catch(() => ({}));
      const newToken = data.token || data.access_token || data.accessToken;
      if (!newToken) {
        clearAdminToken();
        return null;
      }
      localStorage.setItem("svz_admin_token", newToken);
      return newToken;
    } catch (e) {
      clearAdminToken();
      return null;
    }
  }

  async function adminFetch(url, options = {}, retry = true) {
    const opts = Object.assign({ headers: {} }, options);
    const headers = new Headers(opts.headers || {});
    const token = getAdminToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    opts.headers = headers;

    const resp = await fetch(url, opts);
    if (resp.status === 401 && retry) {
      const newToken = await refreshAdminToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        return adminFetch(url, { ...opts, headers }, false);
      }
      clearAdminToken();
      window.location.href = "/admin/login.html";
      throw new Error("Sesija je istekla. Prijavite se ponovno.");
    }
    return resp;
  }

  function isVisibleForPublic(value) {
    return (
      value === true ||
      value === "true" ||
      value === 1 ||
      value === "1" ||
      value === undefined
    );
  }

  function setMetricsStatus(text) {
    if (els.status) {
      els.status.textContent = text || "";
    }
  }

  function setCategoryStatus(text, type) {
    if (els.catStatus) {
      els.catStatus.textContent = text || "";
      els.catStatus.className = "status muted";
      if (type === "error") {
        els.catStatus.classList.add("status--error");
      } else if (type === "success") {
        els.catStatus.classList.add("status--success");
      }
    }
  }

  function renderTotals(totals) {
    els.totals.views.textContent = (totals && totals.views) || 0;
    els.totals.likes.textContent = (totals && totals.likes) || 0;
    els.totals.shares.textContent = (totals && totals.shares) || 0;
  }

  function renderDaily(rows) {
    if (!els.dailyBody) return;
    els.dailyBody.innerHTML = "";
    if (!rows || !rows.length) {
      els.dailyBody.innerHTML =
        '<tr><td colspan="4" class="muted center">Nema podataka za prikaz.</td></tr>';
      return;
    }
    let totals = { views: 0, likes: 0, shares: 0 };
    rows.forEach(function (row) {
      totals.views += row.views || 0;
      totals.likes += row.likes || 0;
      totals.shares += row.shares || 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.date || ""}</td>
        <td>${row.views || 0}</td>
        <td>${row.likes || 0}</td>
        <td>${row.shares || 0}</td>
      `;
      applyDataLabels(tr, ["Datum", "Pregledi", "Sviđanja", "Dijeljenja"]);
      els.dailyBody.appendChild(tr);
    });
    const totalRow = document.createElement("tr");
    totalRow.className = "summary-row";
    totalRow.innerHTML = `
      <td><strong>Ukupno</strong></td>
      <td><strong>${totals.views}</strong></td>
      <td><strong>${totals.likes}</strong></td>
      <td><strong>${totals.shares}</strong></td>
    `;
    applyDataLabels(totalRow, ["", "Pregledi", "Sviđanja", "Dijeljenja"]);
    els.dailyBody.appendChild(totalRow);
  }

  function renderTopPosts(rows, limit) {
    if (!els.topBody) return;
    const statusFilter =
      els.topStatusFilter && els.topStatusFilter.value !== "all"
        ? els.topStatusFilter.value
        : null;
    els.topBody.innerHTML = "";
    const filtered =
      rows && rows.length
        ? rows.filter(function (row) {
            const status = getPostStatus(row);
            if (!statusFilter) return true;
            return status && status.toUpperCase() === statusFilter;
          })
        : [];
    if (!filtered.length) {
      els.topBody.innerHTML =
        '<tr><td colspan="5" class="muted center">Nema podataka za prikaz.</td></tr>';
      return;
    }
    els.topLabel.textContent = `Top ${limit || filtered.length} po pregledima`;
    let totals = { views: 0, unique_sessions: 0, likes: 0, shares: 0 };
    filtered.forEach(function (row) {
      totals.views += row.views || 0;
      totals.likes += row.likes || 0;
      totals.shares += row.shares || 0;
      const tr = document.createElement("tr");
      const title = row.title || row.slug || row.post_id || "–";
      const slug = row.slug;
      const postId = row.post_id;
      let postHref = "";
      if (slug) {
        postHref = `/blog/post.html?slug=${encodeURIComponent(slug)}`;
      } else if (postId) {
        postHref = `/blog/post.html?id=${encodeURIComponent(postId)}`;
      }
      const status = getPostStatus(row);
      const statusBadge = status
        ? `<span class="badge badge--status badge--status-${status
            .toString()
            .toLowerCase()}">${formatStatusLabel(status)}</span>`
        : "";
      const titleCell = postHref
        ? `<a href="${postHref}" class="link">${title}</a> ${statusBadge}`
        : `${title} ${statusBadge}`;
      tr.innerHTML = `
        <td>${titleCell}</td>
        <td>${row.views || 0}</td>
        <td>${row.likes || 0}</td>
        <td>${row.shares || 0}</td>
      `;
      applyDataLabels(tr, ["Naslov", "Pregledi", "Sviđanja", "Dijeljenja"]);
      els.topBody.appendChild(tr);
    });
    const totalRow = document.createElement("tr");
    totalRow.className = "summary-row";
    totalRow.innerHTML = `
      <td><strong>Ukupno</strong></td>
      <td><strong>${totals.views}</strong></td>
      <td><strong>${totals.likes}</strong></td>
      <td><strong>${totals.shares}</strong></td>
    `;
    applyDataLabels(totalRow, ["", "Pregledi", "Sviđanja", "Dijeljenja"]);
    els.topBody.appendChild(totalRow);
  }

  async function loadMetrics() {
    if (!els.startInput || !els.endInput) return;
    const start = els.startInput.value;
    const end = els.endInput.value;
    const top = parseInt(els.topLimitInput.value, 10) || 5;

    setMetricsStatus("Učitavanje podataka...");
    try {
      const resp = await adminFetch(
        `${ADMIN_API_BASE}/metrics?start_date=${encodeURIComponent(
          start
        )}&end_date=${encodeURIComponent(end)}&top_limit=${encodeURIComponent(
          top
        )}`
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Ne možemo učitati metrike.");
      }
      const data = await resp.json();
      els.rangeLabel.textContent = `${data.range.start_date} — ${data.range.end_date}`;
      renderTotals(data.totals);
      renderDaily(data.by_day);
      state.topPosts = data.top_posts || [];
      renderTopPosts(state.topPosts, top);
      setMetricsStatus("");
    } catch (err) {
      console.warn("Failed to load metrics", err);
      setMetricsStatus(err.message || "Greška pri dohvaćanju metrika.");
      renderTotals(null);
      renderDaily([]);
      state.topPosts = [];
      renderTopPosts([], top);
      showToastMessage("Nismo mogli učitati metrike.", "error");
    }
  }

  async function loadPostStatuses() {
    try {
      const resp = await adminFetch(`${ADMIN_API_BASE}/posts`);
      if (!resp.ok) {
        throw new Error("Ne možemo učitati statuse objava.");
      }
      const posts = await resp.json();
      const map = {};
      if (Array.isArray(posts)) {
        posts.forEach(function (p) {
          const key = p.id || p.slug;
          if (key) {
            map[key] = p.status || (p.published ? "PUBLISHED" : null);
          }
        });
      }
      state.postStatuses = map;
      if (state.topPosts && state.topPosts.length) {
        renderTopPosts(state.topPosts, els.topLimitInput.value);
      }
    } catch (err) {
      console.warn("Failed to load post statuses", err);
    }
  }

  function resetCategoryForm() {
    state.editingId = null;
    els.catName.value = "";
    els.catSlug.value = "";
    els.catDesc.value = "";
    els.catVisible.checked = true;
    els.catSave.textContent = "Spremi kategoriju";
    els.catCancel.hidden = true;
    syncSlugFromName();
  }

  function formatStatusLabel(status) {
    const s = (status || "").toString().toUpperCase();
    if (s === "PUBLISHED") return "Objavljeno";
    if (s === "DRAFT") return "Skica";
    if (s === "SCHEDULED") return "Zakazano";
    if (s === "HIDDEN") return "Sakriveno";
    if (s === "ARCHIVED") return "Arhivirano";
    return status || "—";
  }

  function getPostStatus(row) {
    if (!row) return null;
    if (row.status) return row.status;
    if (row.post_id && state.postStatuses[row.post_id]) {
      return state.postStatuses[row.post_id];
    }
    if (row.slug && state.postStatuses[row.slug]) {
      return state.postStatuses[row.slug];
    }
    return null;
  }

  function syncSlugFromName() {
    if (!els.catName || !els.catSlug) return true;
    const slug = slugify(els.catName.value || "");
    els.catSlug.value = slug;
    if (els.catSave) {
      els.catSave.disabled = false;
    }
    setCategoryStatus("");
    return true;
  }

  function applyDataLabels(tr, labels) {
    if (!tr || !Array.isArray(labels)) return;
    const cells = tr.querySelectorAll("td");
    cells.forEach(function (cell, idx) {
      if (labels[idx]) {
        cell.setAttribute("data-label", labels[idx]);
      }
    });
  }

  function fillCategoryForm(cat) {
    state.editingId = cat.id;
    els.catName.value = cat.name || "";
    els.catSlug.value = slugify(cat.name || cat.slug || "");
    els.catDesc.value = cat.description || "";
    els.catVisible.checked = isVisibleForPublic(cat.is_visible_for_public);
    els.catSave.textContent = "Ažuriraj kategoriju";
    els.catCancel.hidden = false;
    syncSlugFromName();
  }

  function renderCategories(list) {
    if (!els.catBody) return;
    els.catBody.innerHTML = "";
    if (!list || !list.length) {
      els.catBody.innerHTML =
        '<tr><td colspan="5" class="muted center">Nema kategorija za prikaz.</td></tr>';
      return;
    }
    list.forEach(function (cat) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${cat.name || ""}</td>
        <td>${cat.slug || ""}</td>
        <td>
          <span class="badge ${
            isVisibleForPublic(cat.is_visible_for_public)
              ? "badge--success"
              : "badge--danger"
          }">
            ${
              isVisibleForPublic(cat.is_visible_for_public)
                ? "Vidljivo"
                : "Sakriveno"
            }
          </span>
        </td>
        <td>${cat.description || ""}</td>
        <td class="actions">
          <button class="button button--ghost" data-edit="${
            cat.id
          }">Uredi</button>
          <button class="button button--ghost" data-toggle="${cat.id}">${
        isVisibleForPublic(cat.is_visible_for_public) ? "Sakrij" : "Prikaži"
      }</button>
        </td>
      `;
      els.catBody.appendChild(tr);
    });
  }

  async function loadCategories() {
    try {
      setCategoryStatus("Učitavanje kategorija...");
      const resp = await adminFetch(`${ADMIN_API_BASE}/categories`);
      if (!resp.ok) {
        throw new Error("Učitavanje kategorija nije uspjelo.");
      }
      const data = await resp.json();
      state.categories = Array.isArray(data) ? data : [];
      renderCategories(state.categories);
      setCategoryStatus("");
    } catch (err) {
      console.warn("Failed to load categories", err);
      renderCategories([]);
      setCategoryStatus(
        err.message || "Greška pri dohvaćanju kategorija.",
        "error"
      );
      showToastMessage("Nismo mogli učitati kategorije.", "error");
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    const name = els.catName.value.trim();
    const slugInput = slugify(name);
    const payload = {
      name: name,
      slug: slugInput,
      description: els.catDesc.value.trim() || null,
      is_visible_for_public: !!els.catVisible.checked,
    };
    if (!payload.name || !payload.slug) {
      setCategoryStatus("Naziv i slug su obavezni.", "error");
      return;
    }
    setCategoryStatus(
      state.editingId ? "Ažuriranje kategorije..." : "Spremanje kategorije..."
    );
    try {
      const url = state.editingId
        ? `${ADMIN_API_BASE}/categories/${state.editingId}`
        : `${ADMIN_API_BASE}/categories`;
      const resp = await adminFetch(url, {
        method: state.editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Spremanje nije uspjelo.");
      }
      showToastMessage(
        state.editingId ? "Kategorija ažurirana." : "Kategorija kreirana.",
        "info"
      );
      resetCategoryForm();
      await loadCategories();
      setCategoryStatus("");
    } catch (err) {
      console.warn("Failed to save category", err);
      setCategoryStatus(
        err.message || "Greška pri spremanju kategorije.",
        "error"
      );
      showToastMessage("Spremanje kategorije nije uspjelo.", "error");
    }
  }

  async function toggleVisibility(id) {
    const cat = state.categories.find(function (c) {
      return String(c.id) === String(id);
    });
    if (!cat) return;
    try {
      const resp = await adminFetch(`${ADMIN_API_BASE}/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cat.name,
          slug: cat.slug,
          description: cat.description || null,
          is_visible_for_public: !isVisibleForPublic(cat.is_visible_for_public),
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Promjena vidljivosti nije uspjela.");
      }
      showToastMessage("Vidljivost ažurirana.", "info");
      await loadCategories();
    } catch (err) {
      console.warn("Failed to toggle visibility", err);
      showToastMessage("Nismo mogli promijeniti vidljivost.", "error");
    }
  }

  function wireEvents() {
    if (els.metricsForm) {
      els.metricsForm.addEventListener("submit", function (e) {
        e.preventDefault();
        loadMetrics();
      });
    }
    if (els.catForm) {
      els.catForm.addEventListener("submit", saveCategory);
    }
    if (els.catCancel) {
      els.catCancel.addEventListener("click", function () {
        resetCategoryForm();
        setCategoryStatus("");
      });
    }
    if (els.catBody) {
      els.catBody.addEventListener("click", function (e) {
        const editId = e.target && e.target.getAttribute("data-edit");
        const toggleId = e.target && e.target.getAttribute("data-toggle");
        if (editId) {
          const cat = state.categories.find(function (c) {
            return String(c.id) === String(editId);
          });
          if (cat) {
            fillCategoryForm(cat);
          }
        }
        if (toggleId) {
          toggleVisibility(toggleId);
        }
      });
    }
    if (els.catName && els.catSlug) {
      els.catSlug.setAttribute("readonly", "readonly");
      els.catName.addEventListener("input", function () {
        syncSlugFromName();
      });
      syncSlugFromName();
    }
    if (els.topStatusFilter) {
      els.topStatusFilter.addEventListener("change", function () {
        renderTopPosts(state.topPosts, els.topLimitInput.value);
      });
    }
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    if (els.startInput) els.startInput.value = formatDateInput(start);
    if (els.endInput) els.endInput.value = formatDateInput(end);
  }

  function init() {
    if (window.adminGuard && window.adminGuard.enforceAdminAccess) {
      window.adminGuard.enforceAdminAccess("../404.html");
    } else {
      const token = getAdminToken();
      if (!token) {
        window.location.href = "/admin/login.html";
        return;
      }
    }
    setDefaultDates();
    wireEvents();
    loadMetrics();
    loadPostStatuses();
    loadCategories();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
