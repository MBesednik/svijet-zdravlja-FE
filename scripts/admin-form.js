/**
 * Admin Blog Post Form
 * Upravljanje kreiranjem i ažuriranjem blog objava
 * Komunikacija s backend API-jem
 */

(function () {
  "use strict";

  const API_BASE_URL = window.getSVZAdminApiBase();
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

  /**
   * Normalize string to a slug: lowercase, replace spaces and invalid chars with '-', remove diacritics
   */
  function slugify(value) {
    if (!value) return "";
    return value
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

  // Allow a test/admin token to be provided via global for quick testing
  let authToken =
    localStorage.getItem("svz_admin_token") ||
    window.__SVZ_ADMIN_TOKEN__ ||
    window.__SVZ_ADMIN_TEST_TOKEN__ ||
    null;
  let currentPost = null;
  let selectedCategories = [];
  let availableCategories = [];
  let pendingCategorySelection = null;
  let chapters = [];

  /**
   * Prikazuje poruku statusa forme
   */
  function showFormStatus(message, type = "info") {
    const statusEl = document.getElementById("post-form-status");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `form-status form-status--${type}`;
    statusEl.hidden = false;

    if (type === "success") {
      setTimeout(() => {
        statusEl.hidden = true;
      }, 3000);
    }
  }

  /**
   * Prikazuje grešku
   */
  function showError(message) {
    showFormStatus(message, "error");
    console.error(message);
  }

  /**
   * Čita datoteku kao Data URL
   */
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        reject(new Error("Podržani su samo JPG, PNG ili WEBP formati."));
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        reject(new Error("Slika mora biti manja od 2 MB."));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("Učitavanje slike nije uspjelo."));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Učitava dostupne kategorije s backenda
   */
  async function loadCategories() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error("Učitavanje kategorija nije uspjelo");

      const categories = await response.json();
      availableCategories = Array.isArray(categories) ? categories : [];
      renderCategoriesList(availableCategories);
      if (pendingCategorySelection) {
        applyPostCategories(pendingCategorySelection);
        pendingCategorySelection = null;
      }
    } catch (error) {
      console.warn("Greška pri učitavanju kategorija:", error);
    }
  }

  function normalizeSelectedCategories(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map((item) => {
        if (item && typeof item === "object") {
          if (item.id != null) {
            return {
              id: item.id,
              name: item.name || item.slug || "",
              slug: item.slug || item.name || "",
            };
          }
          if (item.slug || item.name) {
            const slug = item.slug || item.name;
            const match = availableCategories.find((cat) => cat.slug === slug);
            if (match) {
              return { id: match.id, name: match.name, slug: match.slug };
            }
            return { id: null, name: slug, slug: slug };
          }
        }
        if (typeof item === "string") {
          const match = availableCategories.find((cat) => cat.slug === item);
          if (match) {
            return { id: match.id, name: match.name, slug: match.slug };
          }
          return { id: null, name: item, slug: item };
        }
        return null;
      })
      .filter(Boolean);
  }

  function applyPostCategories(categories) {
    if (availableCategories.length) {
      selectedCategories = normalizeSelectedCategories(categories);
      updateSelectedCategories();
      renderCategoriesList(availableCategories);
    } else {
      pendingCategorySelection = categories;
    }
  }

  /**
   * Prikazuje listu dostupnih kategorija
   */
  function renderCategoriesList(categories) {
    const categoriesList = document.getElementById("categories-list");
    if (!categoriesList) return;

    categoriesList.innerHTML = "";

    categories.forEach((category) => {
      const item = document.createElement("div");
      item.className = "category-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = category.id;
      checkbox.dataset.slug = category.slug;
      checkbox.dataset.name = category.name;
      checkbox.checked = selectedCategories.some(
        (c) =>
          (c && c.id === category.id) ||
          (c && c.slug === category.slug) ||
          c === category.slug
      );

      const label = document.createElement("label");
      label.textContent = category.name;

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedCategories.push({
            id: category.id,
            name: category.name,
            slug: category.slug,
          });
        } else {
          selectedCategories = selectedCategories.filter(
            (c) => c.id !== category.id
          );
        }
        updateSelectedCategories();
      });

      item.appendChild(checkbox);
      item.appendChild(label);
      categoriesList.appendChild(item);
    });
  }

  /**
   * Ažurira prikaz odabranih kategorija
   */
  function updateSelectedCategories() {
    const container = document.getElementById("post-categories");
    let selected = container.querySelector(".categories-selected");

    if (selectedCategories.length === 0) {
      if (selected) selected.remove();
      return;
    }

    if (!selected) {
      selected = document.createElement("div");
      selected.className = "categories-selected";
      container.appendChild(selected);
    }

    selected.innerHTML = selectedCategories
      .map(
        (cat) => `
      <div class="category-badge">
        <span>${cat.name || cat.slug || ""}</span>
        <button type="button" class="category-badge__remove" data-key="${
          cat.id != null ? cat.id : cat.slug || ""
        }">×</button>
      </div>
    `
      )
      .join("");

    selected.querySelectorAll(".category-badge__remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const rawKey = btn.dataset.key;
        const id = parseInt(rawKey);
        if (!Number.isNaN(id)) {
          selectedCategories = selectedCategories.filter((c) => c.id !== id);
        } else {
          selectedCategories = selectedCategories.filter(
            (c) => c.slug !== rawKey && c !== rawKey
          );
        }

        const checkbox = document.querySelector(`input[value="${id}"]`);
        if (checkbox) checkbox.checked = false;

        updateSelectedCategories();
      });
    });
  }

  /**
   * Dodaje novo poglavlje
   */
  function addChapter(type = "TEXT") {
    const chapter = {
      id: Date.now(),
      type: type,
      position: chapters.length,
      title: "",
      text_content: "",
      caption: "",
      alt_text: "",
      media_file: null,
    };

    chapters.push(chapter);
    renderChapters();
  }

  /**
   * Prikazuje listu poglavlja
   */
  function renderChapters() {
    const list = document.getElementById("chapters-list");
    if (!list) return;

    list.innerHTML = chapters
      .map(
        (ch, idx) => `
      <div class="chapter-item" data-id="${ch.id}">
        <div class="chapter-item__header">
          <select class="chapter-type-select" data-id="${ch.id}">
            <option value="TEXT" ${
              ch.type === "TEXT" ? "selected" : ""
            }>Tekst</option>
            <option value="IMAGE" ${
              ch.type === "IMAGE" ? "selected" : ""
            }>Slika</option>
            <option value="VIDEO" ${
              ch.type === "VIDEO" ? "selected" : ""
            }>Video</option>
          </select>
          <span class="chapter-item__type">Pozicija: ${idx + 1}</span>
          <button type="button" class="chapter-item__remove" data-id="${
            ch.id
          }">Ukloni</button>
        </div>

        ${
          ch.type === "TEXT"
            ? `
          <textarea placeholder="Unesite tekst poglavlja..." class="chapter-text" data-id="${
            ch.id
          }" rows="4">${ch.text_content || ""}</textarea>
        `
            : ""
        }

        ${
          ch.type === "IMAGE"
            ? `
          <input type="text" placeholder="Tekst naslova poglavlja (opcionalno)" class="chapter-title" data-id="${
            ch.id
          }" value="${ch.title || ""}">
          <input type="file" accept="image/*" class="chapter-image" data-id="${
            ch.id
          }">
          <input type="text" placeholder="Opis slike (caption)" class="chapter-caption" data-id="${
            ch.id
          }" value="${ch.caption || ""}">
          <input type="text" placeholder="Alt tekst (opcionalno)" class="chapter-alt" data-id="${
            ch.id
          }" value="${ch.alt_text || ""}">
        `
            : ""
        }

        ${
          ch.type === "VIDEO"
            ? `
          <input type="text" placeholder="URL video zapisa ili YouTube link" class="chapter-video-url" data-id="${
            ch.id
          }" value="${ch.external_video_url || ""}">
          <input type="text" placeholder="Opis videa (caption)" class="chapter-caption" data-id="${
            ch.id
          }" value="${ch.caption || ""}">
        `
            : ""
        }
      </div>
    `
      )
      .join("");

    // Event listeneri
    list.querySelectorAll(".chapter-type-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) {
          chapter.type = e.target.value;
          renderChapters();
        }
      });
    });

    list.querySelectorAll(".chapter-text").forEach((textarea) => {
      textarea.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) chapter.text_content = e.target.value;
      });
    });

    list.querySelectorAll(".chapter-title").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) chapter.title = e.target.value;
      });
    });

    list.querySelectorAll(".chapter-caption").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) chapter.caption = e.target.value;
      });
    });

    list.querySelectorAll(".chapter-alt").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) chapter.alt_text = e.target.value;
      });
    });

    list.querySelectorAll(".chapter-video-url").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter) chapter.external_video_url = e.target.value;
      });
    });

    list.querySelectorAll(".chapter-item__remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = parseInt(btn.dataset.id);
        chapters = chapters.filter((c) => c.id !== id);
        chapters = chapters.map((ch, idx) => ({ ...ch, position: idx }));
        renderChapters();
      });
    });

    list.querySelectorAll(".chapter-image").forEach((input) => {
      input.addEventListener("change", (e) => {
        const id = parseInt(e.target.dataset.id);
        const chapter = chapters.find((c) => c.id === id);
        if (chapter && e.target.files[0]) {
          chapter.media_file = e.target.files[0];
        }
      });
    });
  }

  /**
   * Prikazuje/skriva polje za zakazivanje
   */
  function handleStatusChange(status) {
    const scheduledGroup = document.getElementById("scheduled-date-group");
    if (status === "SCHEDULED") {
      scheduledGroup.hidden = false;
      document.getElementById("post-scheduled-for").required = true;
    } else {
      scheduledGroup.hidden = true;
      document.getElementById("post-scheduled-for").required = false;
    }
  }

  /**
   * Sprema sliku kao skicu i vraća FormData
   */
  function buildPayload(options) {
    const includeChapterImageField =
      options && options.includeChapterImageField;
    const payload = {
      slug: slugify(document.getElementById("post-slug").value.trim()),
      title: document.getElementById("post-title").value.trim(),
      summary: document.getElementById("post-summary").value.trim(),
      status: document.getElementById("post-status").value,
      is_featured: document.getElementById("post-featured").checked,
      meta_title:
        document.getElementById("post-meta-title").value.trim() || null,
      meta_description:
        document.getElementById("post-meta-description").value.trim() || null,
      lang: document.getElementById("post-lang").value,
      category_ids: selectedCategories
        .map((c) => c.id)
        .filter((id) => id != null),
      chapters: chapters.map((ch, idx) => {
        const base = {
          position: idx,
          type: ch.type,
          title: ch.title || null,
          text_content: ch.type === "TEXT" ? ch.text_content : null,
          caption: ch.caption || null,
          alt_text: ch.alt_text || null,
          external_video_url: ch.type === "VIDEO" ? ch.external_video_url : null,
        };
        if (includeChapterImageField && ch.type === "IMAGE" && ch.media_file) {
          base.chapter_image_field = `chapter_${idx}_image`;
        }
        return base;
      }),
    };

    if (document.getElementById("post-status").value === "SCHEDULED") {
      payload.scheduled_for =
        document.getElementById("post-scheduled-for").value;
    }

    return payload;
  }

  async function getFormDataForSubmit() {
    const form = document.getElementById("post-form");
    const formData = new FormData();

    // Osnovno polje payload
    const payload = buildPayload({ includeChapterImageField: true });

    formData.append("payload", JSON.stringify(payload));

    // Naslovna slika
    const heroInput = document.getElementById("post-hero-image");
    if (heroInput && heroInput.files[0]) {
      formData.append("hero_image", heroInput.files[0]);
    }

    // Slike iz poglavlja
    chapters.forEach((ch, idx) => {
      if (ch.type === "IMAGE" && ch.media_file) {
        formData.append(`chapter_${idx}_image`, ch.media_file);
      }
    });

    return formData;
  }

  async function getJsonPayloadForSubmit() {
    const payload = buildPayload();
    const heroInput = document.getElementById("post-hero-image");
    if (heroInput && heroInput.files[0]) {
      const dataUrl = await fileToDataURL(heroInput.files[0]);
      payload.hero_image_data = dataUrl;
      payload.hero_image_filename = heroInput.files[0].name || null;
    }
    if (Array.isArray(payload.chapters)) {
      const updatedChapters = await Promise.all(
        payload.chapters.map(async (chapter, idx) => {
          const source = chapters[idx];
          if (chapter.type === "IMAGE" && source && source.media_file) {
            const dataUrl = await fileToDataURL(source.media_file);
            return {
              ...chapter,
              image_data: dataUrl,
              image_filename: source.media_file.name || null,
            };
          }
          return chapter;
        })
      );
      payload.chapters = updatedChapters;
    }
    return payload;
  }

  /**
   * Validira formu
   */
  function validateForm() {
    const form = document.getElementById("post-form");
    // Normalize slug before browser validation so the pattern requirement passes
    const slugEl = document.getElementById("post-slug");
    if (slugEl) {
      const normalized = slugify(slugEl.value || "");
      if (normalized !== slugEl.value) {
        slugEl.value = normalized;
      }
    }

    if (!form.checkValidity()) {
      // find the first invalid element to give a friendlier error message
      const invalid = form.querySelector(":invalid");
      if (invalid) {
        let msg = "Molimo popunite sva obavezna polja.";
        switch (invalid.id) {
          case "post-hero-image":
            msg = "Naslovna slika je obavezna.";
            break;
          case "post-status":
            msg = "Odaberite status objave.";
            break;
          case "post-title":
            msg = "Naslov objave je obavezan.";
            break;
          case "post-slug":
            msg =
              "Slug je obavezan i mora biti valjan (mala slova, brojevi i crtice). Polje se automatski normalizira.";
            break;
          case "post-summary":
            msg = "Sažetak je obavezan (minimalno 10 znakova).";
            break;
        }
        showError(msg);
        // let browser also show native validation message when supported
        if (typeof invalid.reportValidity === "function")
          invalid.reportValidity();
      } else {
        showError("Molimo popunite sva obavezna polja.");
      }
      return false;
    }

    // If scheduled, ensure scheduled date is provided
    if (document.getElementById("post-status").value === "SCHEDULED") {
      const sched = document.getElementById("post-scheduled-for");
      if (!sched || !sched.value) {
        showError("Unesite datum i vrijeme za zakazivanje objave.");
        if (sched) sched.focus();
        return false;
      }
    }

    return true;
  }

  /**
   * Šalje formu na backend
   */
  async function submitForm(e) {
    e.preventDefault();

    if (!authToken) {
      showError("Niste prijavljeni. Molimo prijavite se prvo.");
      window.location.href = "/admin/login.html";
      return;
    }

    if (!validateForm()) return;

    showFormStatus("Slanje objave...", "info");

    try {
      const method = currentPost ? "PUT" : "POST";
      const url = currentPost
        ? `${API_BASE_URL}/posts/${currentPost.id}`
        : `${API_BASE_URL}/posts`;
      const body = currentPost
        ? JSON.stringify(await getJsonPayloadForSubmit())
        : await getFormDataForSubmit();
      const headers = {
        Authorization: `Bearer ${authToken}`,
      };
      if (currentPost) {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Greška pri spremanju objave");
      }

      const result = await response.json();

      showFormStatus(
        currentPost ? "Objava je ažurirana!" : "Objava je uspješno kreirana!",
        "success"
      );

      setTimeout(() => {
        window.location.href = `index.html?status=${
          currentPost ? "updated" : "created"
        }&id=${result.id}`;
      }, 1500);
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Sprema kao skicu
   */
  async function saveDraft(e) {
    e.preventDefault();

    const statusSelect = document.getElementById("post-status");
    const originalStatus = statusSelect.value;
    statusSelect.value = "DRAFT";

    try {
      await submitForm({ preventDefault: () => {} });
    } finally {
      statusSelect.value = originalStatus;
    }
  }

  /**
   * Učitava podatke postojeće objave za uređivanje
   */
  async function loadPostForEdit(postId) {
    try {
      showFormStatus("Učitavanje objave...", "info");

      const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) throw new Error("Objava nije pronađena");

      currentPost = await response.json();

      // Popunavanje forme
      document.getElementById("post-title").value = currentPost.title || "";
      document.getElementById("post-slug").value = currentPost.slug || "";
      document.getElementById("post-summary").value = currentPost.summary || "";
      document.getElementById("post-status").value =
        currentPost.status || "DRAFT";
      document.getElementById("post-meta-title").value =
        currentPost.meta_title || "";
      document.getElementById("post-meta-description").value =
        currentPost.meta_description || "";
      document.getElementById("post-lang").value = currentPost.lang || "hr";
      document.getElementById("post-featured").checked =
        currentPost.is_featured || false;

      if (currentPost.scheduled_for) {
        document.getElementById("post-scheduled-for").value =
          currentPost.scheduled_for;
        handleStatusChange("SCHEDULED");
      }

      // Poglavlja
      if (currentPost.chapters && Array.isArray(currentPost.chapters)) {
        chapters = currentPost.chapters.map((ch) => ({
          id: ch.id || Date.now(),
          ...ch,
        }));
        renderChapters();
      }

      // Kategorije
      if (currentPost.categories && Array.isArray(currentPost.categories)) {
        applyPostCategories(currentPost.categories);
      }

      // Naslovna slika
      const heroInput = document.getElementById("post-hero-image");
      if (currentPost.hero_media && currentPost.hero_media.storage_path) {
        const preview = document.getElementById("post-hero-preview");
        preview.src = currentPost.hero_media.storage_path;
        preview.hidden = false;
        if (heroInput) {
          heroInput.required = false;
          heroInput.dataset.hasExistingHero = "true";
        }
      } else if (currentPost.hero_media_url) {
        const preview = document.getElementById("post-hero-preview");
        preview.src = currentPost.hero_media_url;
        preview.hidden = false;
        if (heroInput) {
          heroInput.required = false;
          heroInput.dataset.hasExistingHero = "true";
        }
      } else if (heroInput) {
        heroInput.required = true;
        delete heroInput.dataset.hasExistingHero;
      }

      document.getElementById("post-form-heading").textContent =
        "Uređivanje objave";
      document.getElementById("post-save").textContent = "Ažuriraj objavu";

      showFormStatus(
        "Objava učitana. Izvršite izmjene i ažurirajte.",
        "success"
      );
    } catch (error) {
      showError(error.message);
    }
  }

  /**
   * Inicijalizacija forme
   */
  function initForm() {
    const form = document.getElementById("post-form");
    if (!form) return;

    // If a global test token is present but not stored, persist it for convenience
    if (
      !localStorage.getItem("svz_admin_token") &&
      (window.__SVZ_ADMIN_TOKEN__ || window.__SVZ_ADMIN_TEST_TOKEN__)
    ) {
      const t = window.__SVZ_ADMIN_TOKEN__ || window.__SVZ_ADMIN_TEST_TOKEN__;
      try {
        localStorage.setItem("svz_admin_token", t);
        authToken = t;
      } catch (e) {
        console.warn("Could not persist test admin token to localStorage", e);
      }

      // show visible banner to indicate test token is active
      const header = document.querySelector("main") || document.body;
      const banner = document.createElement("div");
      banner.id = "admin-test-banner";
      banner.style.cssText =
        "background:#fff7f6;border:1px solid #ffd6d0;padding:10px 12px;margin:12px 0;border-radius:6px;color:#7a271f;display:flex;align-items:center;justify-content:space-between;gap:12px";
      banner.innerHTML =
        "<div><strong>Test token aktivan</strong> — koristit će se privremeni JWT za administraciju.</div>";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Ukloni test token";
      btn.style.cssText =
        "background:#7a271f;color:#fff;border:0;padding:6px 10px;border-radius:6px;cursor:pointer";
      btn.addEventListener("click", function () {
        try {
          localStorage.removeItem("svz_admin_token");
        } catch (e) {}
        authToken = null;
        banner.remove();
        showFormStatus("Testni token uklonjen. Molimo prijavite se.", "info");
      });
      banner.appendChild(btn);
      header.insertBefore(banner, header.firstChild);
    }

    // Event listeneri
    form.addEventListener("submit", submitForm);

    // Auto-generate / normalize slug from title unless user edits slug manually
    let slugManuallyEdited = false;
    const titleInput = document.getElementById("post-title");
    const slugInput = document.getElementById("post-slug");
    if (slugInput) {
      slugInput.addEventListener("input", function () {
        slugManuallyEdited = true;
      });
      slugInput.addEventListener("blur", function () {
        slugInput.value = slugify(slugInput.value || "");
      });
    }
    if (titleInput && slugInput) {
      titleInput.addEventListener("input", function () {
        if (!slugManuallyEdited || !slugInput.value) {
          slugInput.value = slugify(titleInput.value || "");
        }
      });
    }

    const saveBtn = document.getElementById("post-save-draft");
    if (saveBtn) {
      saveBtn.addEventListener("click", saveDraft);
    }

    const addChapterBtn = document.getElementById("add-chapter-btn");
    if (addChapterBtn) {
      addChapterBtn.addEventListener("click", (e) => {
        e.preventDefault();
        addChapter("TEXT");
      });
    }

    const statusSelect = document.getElementById("post-status");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        handleStatusChange(e.target.value);
      });
      // Ensure a sensible default for new posts so required validation doesn't fail
      if (!statusSelect.value) {
        statusSelect.value = "DRAFT";
        handleStatusChange(statusSelect.value);
      }
    }

    const heroImageInput = document.getElementById("post-hero-image");
    if (heroImageInput) {
      heroImageInput.addEventListener("change", async (e) => {
        try {
          if (e.target.files[0]) {
            const dataUrl = await fileToDataURL(e.target.files[0]);
            const preview = document.getElementById("post-hero-preview");
            preview.src = dataUrl;
            preview.hidden = false;
          }
        } catch (error) {
          showError(error.message);
          e.target.value = "";
        }
      });

      // Drag and drop
      const dropzone = document.querySelector(".file-upload__dropzone");
      if (dropzone) {
        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#3d4a2c";
          dropzone.style.backgroundColor = "#f0f9ff";
        });

        dropzone.addEventListener("dragleave", () => {
          dropzone.style.borderColor = "#d8dcd3";
          dropzone.style.backgroundColor = "#fafbf9";
        });

        dropzone.addEventListener("drop", async (e) => {
          e.preventDefault();
          dropzone.style.borderColor = "#d8dcd3";
          dropzone.style.backgroundColor = "#fafbf9";

          if (e.dataTransfer.files[0]) {
            heroImageInput.files = e.dataTransfer.files;
            const event = new Event("change", { bubbles: true });
            heroImageInput.dispatchEvent(event);
          }
        });
      }
    }

    // Učitavanje kategorija
    loadCategories();

    // Ako je edit mode, učitaj post
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");
    if (postId && parseInt(postId)) {
      loadPostForEdit(parseInt(postId));
    }
  }

  // Inicijalizacija pri učitavanju stranice
  document.addEventListener("DOMContentLoaded", initForm);

  // Isporuka javnog API-ja
  window.SVZBlogAdmin = {
    loadCategories,
    addChapter,
    showFormStatus,
    showError,
  };
})();
