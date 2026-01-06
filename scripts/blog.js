(function () {
  "use strict";

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f4f6f2"/><text x="50%" y="50%" fill="%235a5f56" font-size="24" font-family="Inter,Arial,sans-serif" text-anchor="middle">Svijet Zdravlja</text></svg>';
  const ADMIN_API_BASE = window.getSVZAdminApiBase
    ? window.getSVZAdminApiBase()
    : null;

  function getPosts() {
    return [];
  }

  function savePosts(posts) {
    // no-op: persistence removed
  }

  function clearPostsCache() {
    // no-op: persistence removed
  }

  function generateId() {
    return (
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8)
    );
  }

  function slugify(value) {
    return (value || "")
      .toString()
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function ensureUniqueSlug(baseSlug, posts, currentId) {
    if (!baseSlug) {
      return "";
    }
    const exists = function (slug) {
      return posts.some(function (post) {
        return post.slug === slug && post.id !== currentId;
      });
    };
    if (!exists(baseSlug)) {
      return baseSlug;
    }
    let suffix = 1;
    let slug = baseSlug + "-" + suffix;
    while (exists(slug)) {
      suffix += 1;
      slug = baseSlug + "-" + suffix;
    }
    return slug;
  }

  function parseDelimited(value) {
    if (!value) {
      return [];
    }
    const items = Array.isArray(value) ? value : value.split(",");
    const trimmed = items
      .map(function (item) {
        return item.toString().trim();
      })
      .filter(Boolean);
    return Array.from(new Set(trimmed));
  }

  // Public API base (allow override from pages that set it)
  const API_BASE = window.getSVZApiBase();
  const DEFAULT_SORT_OPTIONS = [];
  let sortAliases = {};
  let adminTokenCache = null;
  let hiddenCategorySlugs = new Set();
  let allPostsCache = null;
  let lastRenderedPosts = [];
  let lastCategoryOptions = [];
  const trackApiError = function (endpoint, status, message) {
    if (!window.svzTrack) return;
    window.svzTrack("api_error", {
      endpoint: endpoint || "",
      status: status || 0,
      message: message || "",
      path: window.location.pathname,
    });
  };

  function getAdminToken() {
    try {
      if (adminTokenCache) return adminTokenCache;
      const t = localStorage.getItem("svz_admin_token");
      adminTokenCache = t;
      return t;
    } catch (e) {
      return null;
    }
  }

  function clearAdminToken() {
    adminTokenCache = null;
    try {
      localStorage.removeItem("svz_admin_token");
    } catch (e) {}
  }

  function buildAuthHeaders(base) {
    const headers = Object.assign({ Accept: "application/json" }, base || {});
    const token = getAdminToken();
    if (
      token &&
      token !== "null" &&
      token !== "undefined" &&
      String(token).trim() !== ""
    ) {
      headers.Authorization = "Bearer " + token;
    }
    return headers;
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
      adminTokenCache = newToken;
      try {
        localStorage.setItem("svz_admin_token", newToken);
      } catch (e) {}
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
    }
    return resp;
  }

  function normalizeApiPost(p) {
    if (!p || typeof p !== "object") {
      return null;
    }
    return {
      id: p.id || p._id || generateId(),
      slug: p.slug || (p.title && slugify(p.title)) || "",
      title: p.title || "",
      excerpt: p.summary || p.excerpt || "",
      content: p.content || "",
      author:
        (p.author && p.author.display_name) || p.author || "Svijet Zdravlja",
      createdAt: p.published_at || p.created_at || new Date().toISOString(),
      updatedAt: p.updated_at || p.updatedAt || p.created_at,
      status: p.status,
      categories: Array.isArray(p.categories)
        ? p.categories.map(function (c) {
            return c.name || c;
          })
        : p.categories || [],
      tags: p.tags || [],
      featuredImage:
        (p.hero_media && p.hero_media.storage_path) || p.featuredImage || "",
      published: p.status === "PUBLISHED" || p.published === true,
      is_featured: p.is_featured || p.isFeatured || false,
      lang: p.lang || p.language || undefined,
      chapters: p.chapters || [],
      hero_media: p.hero_media,
      scheduled_for:
        p.scheduled_for || p.scheduledFor || p.scheduled_at || null,
      reading_time_minutes: p.reading_time_minutes || null,
      references: p.reference || p.reference || [],
    };
  }

  function resolveSortAlias(value) {
    if (!value) {
      return value;
    }
    return sortAliases[value] || value;
  }

  function buildPostsQuery(filters) {
    const params = new URLSearchParams();
    const sortValue = resolveSortAlias((filters && filters.sort) || "newest");
    if (sortValue) {
      params.set("sort", sortValue);
    }
    if (filters && filters.category && filters.category !== "all") {
      params.set("category", filters.category);
    }
    if (filters && filters.q) {
      params.set("search", filters.q);
    }
    const query = params.toString();
    return query ? "?" + query : "";
  }

  async function fetchWithAuthFallback(
    url,
    parseResponse,
    trackPath,
    errorMsg
  ) {
    const fetchWithHeaders = function (headers) {
      return fetch(url, { headers: headers });
    };

    const fetchPublic = async function () {
      const resp = await fetchWithHeaders({ Accept: "application/json" });
      if (!resp.ok) {
        trackApiError(trackPath, resp.status, "list");
        throw new Error(errorMsg);
      }
      return parseResponse(resp);
    };

    const token = getAdminToken();
    if (token) {
      let resp = await fetchWithHeaders(buildAuthHeaders());
      if (resp.status === 401) {
        const newToken = await refreshAdminToken();
        if (newToken) {
          resp = await fetchWithHeaders(buildAuthHeaders());
        } else {
          clearAdminToken();
        }
      }
      if (resp.ok) {
        return parseResponse(resp);
      }
      if (resp.status === 401) {
        clearAdminToken();
        return fetchPublic();
      }
      trackApiError(trackPath, resp.status, "list");
    }
    return fetchPublic();
  }

  async function fetchPostsFromApi(filters) {
    const url = API_BASE + "/posts" + buildPostsQuery(filters);

    const parseResponse = async function (resp) {
      const data = await resp.json();
      if (!Array.isArray(data)) return null;
      const normalized = data.map(normalizeApiPost).filter(Boolean);
      if (window.svzTrack) {
        window.svzTrack("post_list_view", {
          count: normalized.length,
          filters: JSON.stringify(filters || {}),
        });
        window.svzTrack("blog_filter", {
          category: (filters && filters.category) || "all",
          sort: (filters && filters.sort) || "newest",
          search: (filters && filters.q) || "",
          count: normalized.length,
        });
      }
      return normalized;
    };

    try {
      return await fetchWithAuthFallback(
        url,
        parseResponse,
        "/posts",
        "Nismo mogli učitati objave. Osvježite stranicu i pokušajte ponovno."
      );
    } catch (err) {
      console.warn("Failed to fetch posts from API", err);
      throw err;
    }
  }

  async function fetchPostFromApi(identifier, fetchById) {
    if (!identifier) {
      return null;
    }
    const path = fetchById ? "/posts/id/" : "/posts/";
    const url = API_BASE + path + encodeURIComponent(identifier);
    const parseResponse = async function (resp) {
      if (!resp.ok) {
        trackApiError(
          path + encodeURIComponent(identifier),
          resp.status,
          "fetch"
        );
        return null;
      }
      const data = await resp.json();
      if (window.svzTrack && data) {
        window.svzTrack("blog_post_view", {
          id: data.id || data.slug || identifier,
          slug: data.slug || identifier,
        });
      }
      // Track time-on-post when unloading the page
      if (window.svzTrack && data) {
        const start = Date.now();
        const handler = function () {
          const durationMs = Date.now() - start;
          window.svzTrack("blog_post_engagement", {
            id: data.id || data.slug || identifier,
            slug: data.slug || identifier,
            duration_ms: durationMs,
          });
          window.removeEventListener("beforeunload", handler);
          document.removeEventListener("visibilitychange", visHandler);
        };
        const visHandler = function () {
          if (document.visibilityState === "hidden") {
            handler();
          }
        };
        window.addEventListener("beforeunload", handler);
        document.addEventListener("visibilitychange", visHandler);
      }
      return normalizeApiPost(data);
    };
    try {
      return await fetchWithAuthFallback(
        url,
        parseResponse,
        path + encodeURIComponent(identifier),
        "Nismo mogli dohvatiti objavu. Pokušajte ponovno."
      );
    } catch (err) {
      console.warn("Failed to fetch post from API", err);
      return null;
    }
  }

  function normalizeSortResponse(raw) {
    const aliases =
      raw && typeof raw === "object" && raw.aliases ? raw.aliases : {};
    if (!raw) {
      return { options: [], aliases: aliases };
    }
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.sort_options)
      ? raw.sort_options
      : Array.isArray(raw.options)
      ? raw.options
      : Array.isArray(raw.data)
      ? raw.data
      : [];
    const options = list
      .map(function (item) {
        if (typeof item === "string") {
          return { value: item, label: item };
        }
        if (item && typeof item === "object") {
          const value = item.value || item.slug || item.id || item.key;
          const label = item.label || item.name || item.title || value;
          if (value) {
            return { value: value, label: label };
          }
        }
        return null;
      })
      .filter(Boolean);
    return { options: options, aliases: aliases };
  }

  async function fetchSortOptionsFromApi() {
    try {
      const url = API_BASE + "/posts/sort-options";
      const parseResponse = async function (resp) {
        const data = await resp.json();
        const normalized = normalizeSortResponse(data);
        sortAliases = normalized.aliases || {};
        return normalized.options.length ? normalized.options : null;
      };
      return await fetchWithAuthFallback(
        url,
        parseResponse,
        "/posts/sort-options",
        "Ne možemo učitati opcije sortiranja. Pokušajte ponovno."
      );
    } catch (err) {
      console.warn("Failed to fetch sort options", err);
      showToast(
        "Ne možemo učitati opcije sortiranja. Pokušajte ponovno.",
        "error"
      );
      return null;
    }
  }

  function normalizeCategoryOptions(raw) {
    const list = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.categories)
      ? raw.categories
      : Array.isArray(raw.data)
      ? raw.data
      : [];
    return list
      .map(function (item) {
        if (typeof item === "string") {
          return {
            slug: item,
            name: item,
            is_visible_for_public: true,
            post_count: 0,
          };
        }
        if (item && typeof item === "object") {
          var rawVisible =
            item.is_visible_for_public !== undefined
              ? item.is_visible_for_public
              : true;
          var isVisible =
            rawVisible === true ||
            rawVisible === "true" ||
            rawVisible === 1 ||
            rawVisible === "1";
          const slug =
            item.slug || item.value || item.id || item.key || item.name;
          const name = item.name || item.label || item.title || slug;
          var parsedCount =
            item.post_count !== undefined ? Number(item.post_count) : 0;
          if (!Number.isFinite(parsedCount)) {
            parsedCount = 0;
          }
          var postCount = Math.max(0, parsedCount);
          if (slug) {
            return {
              slug: slug,
              name: name,
              is_visible_for_public: isVisible,
              post_count: postCount,
            };
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  function filterVisibleCategories(categories) {
    const hasToken = Boolean(getAdminToken());
    const hidden = hiddenCategorySlugs || new Set();
    return (categories || []).filter(function (category) {
      const slug = (category && category.slug) || "";
      const count = Number(category && category.post_count);
      if (!slug) return false;
      if (!Number.isFinite(count) || count <= 0) return false;
      if (hasToken) return true;
      if (hidden.has(slug.toLowerCase())) return false;
      return category.is_visible_for_public !== false;
    });
  }

  function renderCategoryButtons(categories, selectedSlug) {
    const container = document.getElementById("category-buttons");
    if (!container) return;
    const list = Array.isArray(categories) ? categories : [];
    const selected = (selectedSlug || "all").toString();
    container.innerHTML = "";
    if (!list.length) return;
    const totalCount = list.reduce(function (acc, cat) {
      const count = Number(cat && cat.post_count);
      if (!Number.isFinite(count) || count <= 0) {
        return acc;
      }
      return acc + count;
    }, 0);
    const withAll = [
      { name: "Sve kategorije", slug: "all", post_count: totalCount },
    ].concat(list);
    withAll.forEach(function (cat) {
      const slug = cat.slug || cat.name || "";
      const count = Math.max(0, Number(cat.post_count) || 0);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-btn" + (selected === slug ? " active" : "");
      btn.innerHTML = `
        <span class="cat-label">${cat.name}</span>
        <span class="category-count-badge">${count}</span>
      `;
      btn.addEventListener("click", function () {
        // If already selected, do nothing
        if (btn.classList.contains("active")) return;
        const select = document.getElementById("posts-filter-category");
        if (select) {
          select.value = slug;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        Array.from(container.children).forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
      });
      container.appendChild(btn);
    });
  }

  async function fetchCategoriesFromApi() {
    try {
      const url = API_BASE + "/categories";
      const parseResponse = async function (resp) {
        const data = await resp.json();
        const normalized = normalizeCategoryOptions(data);
        const hasToken = Boolean(getAdminToken());
        const hidden = normalized
          .filter(function (c) {
            return c.is_visible_for_public === false;
          })
          .map(function (c) {
            return c.slug && c.slug.toLowerCase();
          })
          .filter(Boolean);
        hiddenCategorySlugs = hasToken ? new Set() : new Set(hidden);
        const visible = filterVisibleCategories(normalized);
        return visible.length ? visible : null;
      };
      return await fetchWithAuthFallback(
        url,
        parseResponse,
        "/categories",
        "Nismo mogli učitati kategorije. Osvježite stranicu i pokušajte ponovno."
      );
    } catch (err) {
      console.warn("Failed to fetch categories", err);
      showToast("Ne možemo učitati kategorije. Pokušajte ponovno.", "error");
      return null;
    }
  }

  function getCategoryOptionsFromPosts(posts) {
    const hidden = hiddenCategorySlugs || new Set();
    const counts = {};
    (posts || []).forEach(function (post) {
      if (!Array.isArray(post.categories)) return;
      post.categories.forEach(function (cat) {
        if (!cat) return;
        const name = cat.toString().trim();
        if (!name) return;
        const lower = name.toLowerCase();
        if (hidden.has(lower)) return;
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        return a.localeCompare(b, "hr");
      })
      .map(function (name) {
        return {
          slug: name,
          name: name,
          is_visible_for_public: true,
          post_count: counts[name],
        };
      });
  }

  function populateCategoryFilterOptions(categories, selectEl, currentValue) {
    if (!selectEl) {
      return;
    }
    const normalized = filterVisibleCategories(
      normalizeCategoryOptions(categories || [])
    );
    lastCategoryOptions = normalized;
    selectEl.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "all";
    defaultOption.textContent = "Sve kategorije";
    selectEl.appendChild(defaultOption);

    normalized.forEach(function (category) {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name || category.slug;
      selectEl.appendChild(option);
    });

    const target = currentValue || "all";
    if (selectEl.querySelector('[value="' + target + '"]')) {
      selectEl.value = target;
    } else {
      selectEl.value = "all";
    }
  }

  function populateSortFilterOptions(options, selectEl, currentValue) {
    if (!selectEl) {
      return;
    }
    const normalized = normalizeSortResponse(
      options || DEFAULT_SORT_OPTIONS
    ).options;
    selectEl.innerHTML = "";
    normalized.forEach(function (optionData) {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      selectEl.appendChild(option);
    });
    const preferred = resolveSortAlias(currentValue);
    const target =
      preferred && selectEl.querySelector('[value="' + preferred + '"]')
        ? preferred
        : normalized[0]
        ? normalized[0].value
        : "newest";
    selectEl.value = target;
  }

  function createExcerpt(content, manual) {
    if (manual && manual.trim()) {
      return manual.trim();
    }
    const normalized = (content || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= 180) {
      return normalized;
    }
    return normalized.slice(0, 177).trim() + "...";
  }

  function calculateReadTime(content) {
    const words = (content || "").trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.round(words / 200) || 1;
    return Math.max(1, minutes);
  }

  let scrollDepthCleanup = null;
  function initPostScrollDepth(post) {
    if (!window.svzTrack || !post) return;
    if (scrollDepthCleanup) {
      scrollDepthCleanup();
      scrollDepthCleanup = null;
    }
    const postId = post.id || post.slug;
    if (!postId) return;
    const thresholds = [0.5, 0.75, 1];
    const fired = new Set();

    const handler = function () {
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const progress = (window.scrollY || doc.scrollTop || 0) / maxScroll;
      thresholds.forEach(function (t) {
        if (progress >= t && !fired.has(t)) {
          fired.add(t);
          window.svzTrack("blog_post_scroll", {
            id: post.id || "",
            slug: post.slug || "",
            depth: Math.round(t * 100),
          });
        }
      });
      if (fired.size === thresholds.length) {
        cleanup();
      }
    };

    const cleanup = function () {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("beforeunload", handler);
    };

    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("beforeunload", handler);
    scrollDepthCleanup = cleanup;
  }

  function normalizePostInput(raw, posts, currentId) {
    const title = (raw.title || "").trim();
    if (title.length < 3) {
      throw new Error("Naslov mora imati najmanje 3 znaka.");
    }

    const content = (raw.content || "").trim();
    if (content.length < 50) {
      throw new Error("Sadržaj mora imati najmanje 50 znakova.");
    }

    const slugInput = (raw.slug || title).trim();
    const slug = slugify(slugInput);
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugPattern.test(slug)) {
      throw new Error(
        "Slug mora sadržavati samo mala slova, brojeve i crtice."
      );
    }

    const postsSnapshot = posts || getPosts();
    const uniqueSlug = ensureUniqueSlug(slug, postsSnapshot, currentId);

    return {
      id: raw.id,
      slug: uniqueSlug,
      title: title,
      excerpt: createExcerpt(content, raw.excerpt),
      content: content,
      author:
        getAdminUserId() ||
        (raw.author && raw.author.trim()) ||
        "Svijet Zdravlja",
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      status: raw.status || (raw.published ? "PUBLISHED" : undefined),
      categories: parseDelimited(raw.categories),
      tags: parseDelimited(raw.tags),
      featuredImage: raw.featuredImage || "",
      published: Boolean(raw.published),
      readTime: raw.readTime || calculateReadTime(content),
      metaDescription:
        (raw.metaDescription && raw.metaDescription.trim()) ||
        createExcerpt(content, raw.excerpt),
    };
  }

  function fileToDataURL(file) {
    if (!file) {
      return Promise.resolve("");
    }
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return Promise.reject(
        new Error("Podržani su samo JPG, PNG ili WEBP formati.")
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return Promise.reject(new Error("Slika mora biti manja od 2 MB."));
    }
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error("Učitavanje slike nije uspjelo. Pokušajte ponovno."));
      };
      reader.readAsDataURL(file);
    });
  }

  function createPost(data) {
    const posts = getPosts();
    const normalized = normalizePostInput(data, posts);
    const now = new Date().toISOString();
    const post = Object.assign({}, normalized, {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    });
    posts.push(post);
    savePosts(posts);
    return post;
  }

  function updatePost(id, updates) {
    const posts = getPosts();
    const index = posts.findIndex(function (post) {
      return post.id === id;
    });
    if (index === -1) {
      throw new Error("Tražena objava ne postoji.");
    }
    const normalized = normalizePostInput(
      Object.assign({}, posts[index], updates, { id: id }),
      posts,
      id
    );
    const updatedPost = Object.assign({}, posts[index], normalized, {
      updatedAt: new Date().toISOString(),
    });
    posts[index] = updatedPost;
    savePosts(posts);
    return updatedPost;
  }

  function deletePost(id) {
    const posts = getPosts();
    const index = posts.findIndex(function (post) {
      return post.id === id;
    });
    if (index === -1) {
      return false;
    }
    const confirmed = window.confirm(
      "Jeste li sigurni da želite izbrisati ovu objavu?"
    );
    if (!confirmed) {
      return false;
    }
    posts.splice(index, 1);
    savePosts(posts);
    return true;
  }

  function getPostById(id) {
    return (
      getPosts().find(function (post) {
        console.log("LOLOLO Comparing post id:", post.id, "with", id);
        return post.id == id;
      }) || null
    );
  }

  function getPostBySlug(slug) {
    return (
      getPosts().find(function (post) {
        console.log("LOLOLO Comparing post slug:", post.slug, "with", slug);
        return post.slug == slug;
      }) || null
    );
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    try {
      return new Date(value).toLocaleDateString("hr-HR", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    } catch (error) {
      return value;
    }
  }

  function resolveCategoryName(value, categories) {
    if (!value || value === "all") {
      return "";
    }
    const normalized = normalizeCategoryOptions(categories || []);
    const match = normalized.find(function (category) {
      return category.slug === value;
    });
    return match ? match.name || match.slug : value;
  }

  function sortPosts(a, b, mode) {
    const createdA = new Date(a.createdAt || 0).getTime();
    const createdB = new Date(b.createdAt || 0).getTime();
    const updatedA = new Date(a.updatedAt || createdA).getTime();
    const updatedB = new Date(b.updatedAt || createdB).getTime();
    const viewsA = a.total_views || a.view_count || a.views || 0;
    const viewsB = b.total_views || b.view_count || b.views || 0;

    if (mode === "oldest") {
      return createdA - createdB;
    }
    if (mode === "updated" || mode === "recently-updated") {
      return updatedB - updatedA;
    }
    if (mode === "popular") {
      if (viewsB !== viewsA) {
        return viewsB - viewsA;
      }
      return createdB - createdA;
    }
    return createdB - createdA;
  }

  function filterPostsLocally(posts, filters, categoryOptions) {
    const searchTerm = filters && filters.q ? filters.q.toLowerCase() : "";
    const rawCategory =
      filters && filters.category && filters.category !== "all"
        ? filters.category.toLowerCase()
        : "";
    const categoryName = resolveCategoryName(rawCategory, categoryOptions);
    const categoryFilter = categoryName
      ? categoryName.toLowerCase()
      : rawCategory;
    const sortValue = resolveSortAlias((filters && filters.sort) || "newest");

    return (posts || [])
      .filter(function (post) {
        const categories = Array.isArray(post.categories)
          ? post.categories
          : [];
        const matchesCategory =
          !categoryFilter ||
          categories.some(function (category) {
            const normalized = category.toString().toLowerCase();
            return normalized === rawCategory || normalized === categoryFilter;
          });

        if (!searchTerm) {
          return matchesCategory;
        }

        const haystack = categories.concat(
          (Array.isArray(post.tags) ? post.tags : []).concat([
            post.title || "",
            post.excerpt || "",
            post.content || "",
          ])
        );

        const matchesSearch = haystack.some(function (value) {
          return value.toString().toLowerCase().includes(searchTerm);
        });

        return matchesCategory && matchesSearch;
      })
      .sort(function (a, b) {
        return sortPosts(a, b, sortValue);
      });
  }

  function renderList(posts) {
    const listEl = document.getElementById("posts-list");
    if (!listEl) {
      return [];
    }
    const items = Array.isArray(posts) ? posts : [];
    lastRenderedPosts = items.slice();

    listEl.setAttribute("aria-busy", "true");
    listEl.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "blog__empty";
      empty.textContent = "Još nema objava...";
      listEl.appendChild(empty);
      listEl.setAttribute("aria-busy", "false");
      return items;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(function (post) {
      const article = document.createElement("article");
      article.className = "post-card";
      article.dataset.id = post.id;

      // Dodaj obrub/badge prema statusu
      if (post.status == "SCHEDULED") {
        article.classList.add("post-card--scheduled");
        const scheduledBadge = document.createElement("span");
        scheduledBadge.className =
          "post-card__badge post-card__badge--scheduled";
        scheduledBadge.textContent = "Zakazano";
        article.appendChild(scheduledBadge);
        if (post.scheduled_for) {
          const whenBadge = document.createElement("span");
          whenBadge.className = "post-card__when";
          const dt = new Date(post.scheduled_for);
          const formatted = isNaN(dt.getTime())
            ? post.scheduled_for
            : dt.toLocaleString("hr-HR");
          whenBadge.textContent = formatted;
          article.appendChild(whenBadge);
        }
      } else if (post.status == "DRAFT") {
        article.classList.add("post-card--draft");
        const draftBadge = document.createElement("span");
        draftBadge.className = "post-card__badge post-card__badge--draft";
        draftBadge.textContent = "Skica";
        article.appendChild(draftBadge);
      } else if (post.status == "HIDDEN" || post.status == "ARCHIVED") {
        article.classList.add("post-card--draft");
        const hiddenBadge = document.createElement("span");
        hiddenBadge.className = "post-card__badge post-card__badge--draft";
        hiddenBadge.textContent =
          post.status === "HIDDEN" ? "Sakriveno" : "Arhivirano";
        article.appendChild(hiddenBadge);
      }

      // Slika gore, od ruba do ruba
      const image = document.createElement("img");
      image.className = "post-card__image";
      image.src = post.featuredImage || FALLBACK_IMAGE;
      image.alt = post.title || "Naslovna slika objave";
      article.appendChild(image);

      // Sadržaj ispod slike
      const contentDiv = document.createElement("div");
      contentDiv.className = "post-card__content";

      // 1. RED: kategorija (badge) + datum (horizontalno)
      const row1 = document.createElement("div");
      row1.classList.add("post-card__meta-row");
      row1.style.display = "flex";
      row1.style.alignItems = "center";
      row1.style.flexWrap = "nowrap";
      row1.style.gap = "1em";
      row1.style.width = "100%";
      row1.style.marginBottom = "0.5em";
      row1.style.minHeight = "32px";

      // kategorija badge
      if (post.categories && post.categories.length) {
        post.categories.forEach(function (cat) {
          const badge = document.createElement("span");
          badge.className = "post-card__category-badge";
          badge.style.alignSelf = "center";
          badge.textContent = (cat || "")
            .toString()
            .trim()
            .replace(/^[a-zA-Z\u00c0-\u017f]/, function (c) {
              return c.toUpperCase();
            });
          row1.appendChild(badge);
        });
      }

      // datum + pregledi (desno)
      const date = document.createElement("span");
      date.className = "post-card__meta";
      date.textContent = formatDate(post.createdAt);
      date.style.display = "inline-flex";
      date.style.alignItems = "center";
      date.style.alignSelf = "center";
      row1.appendChild(date);

      const viewsWrapper = document.createElement("span");
      viewsWrapper.className = "post-card__readtime";
      viewsWrapper.style.marginLeft = "auto";
      viewsWrapper.style.display = "inline-flex";
      viewsWrapper.style.alignItems = "center";
      viewsWrapper.style.alignSelf = "center";
      viewsWrapper.style.gap = "6px";
      viewsWrapper.style.flexShrink = "0";
      const viewsIcon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      viewsIcon.classList.add("post-card__readtime-icon");
      viewsIcon.setAttribute("width", "20");
      viewsIcon.setAttribute("height", "20");
      viewsIcon.setAttribute("viewBox", "0 0 24 24");
      viewsIcon.setAttribute("fill", "none");
      viewsIcon.setAttribute("stroke", "#3d4a2c");
      viewsIcon.setAttribute("stroke-width", "2");
      viewsIcon.setAttribute("stroke-linecap", "round");
      viewsIcon.setAttribute("stroke-linejoin", "round");
      // Clock icon for reading time
      viewsIcon.innerHTML =
        '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>';
      const viewsText = document.createElement("span");
      viewsText.classList.add("post-card__readtime-text");
      console.log("Post reading time minutes:", post.reading_time_minutes);
      const rawMinutes = post.reading_time_minutes;
      const minutes =
        typeof rawMinutes === "number" ? rawMinutes : parseInt(rawMinutes, 10);
      const hasMinutes = Number.isFinite(minutes);
      console.log("Calculated minutes:", minutes);
      if (!hasMinutes) {
        viewsWrapper.style.display = "none";
      }
      viewsText.textContent = hasMinutes ? minutes + " min" : "";
      viewsText.style.fontWeight = "600";
      viewsText.style.color = "#3d4a2c";
      viewsText.style.fontSize = "12px";
      viewsText.style.whiteSpace = "nowrap";
      viewsWrapper.appendChild(viewsIcon);
      viewsWrapper.appendChild(viewsText);
      row1.appendChild(viewsWrapper);

      contentDiv.appendChild(row1);

      // 2. RED: naslov
      const title = document.createElement("h3");
      title.className = "post-card__title";
      title.textContent = post.title;
      contentDiv.appendChild(title);

      // 3. RED: opis
      const excerpt = document.createElement("p");
      excerpt.className = "post-card__excerpt";
      excerpt.textContent = post.excerpt;
      contentDiv.appendChild(excerpt);

      // 4. RED: gumb "Pročitaj više"
      const link = document.createElement("a");
      link.className = "post-card__read";
      link.href = "post.html?id=" + encodeURIComponent(post.id);
      link.textContent = "Pročitaj više";
      contentDiv.appendChild(link);

      article.appendChild(contentDiv);

      fragment.appendChild(article);
    });

    listEl.appendChild(fragment);
    listEl.setAttribute("aria-busy", "false");
    return items;
  }

  function buildContentNodes(container, content) {
    if (!container) {
      return;
    }
    container.innerHTML = "";
    const blocks = (content || "")
      .split(/\n{2,}/)
      .map(function (block) {
        return block.trim();
      })
      .filter(Boolean);

    if (!blocks.length) {
      const paragraph = document.createElement("p");
      paragraph.textContent = content || "";
      container.appendChild(paragraph);
      return;
    }

    blocks.forEach(function (block) {
      const paragraph = document.createElement("p");
      paragraph.textContent = block;
      container.appendChild(paragraph);
    });
  }

  function renderPost(identifier, postOverride) {
    const postTrace =
      window.svzStartTrace &&
      window.svzStartTrace("blog_post_render", { id: identifier || "" });
    const article = document.getElementById("post-article");
    if (!article) {
      window.svzStopTrace && window.svzStopTrace(postTrace);
      return null;
    }
    const titleEl = document.getElementById("post-title");
    const hero = document.getElementById("post-hero");
    const heroWrap = document.getElementById("post-hero-wrap");
    const meta = document.getElementById("post-meta");
    const content = document.getElementById("post-content");
    const editLink = document.getElementById("post-edit");
    const deleteButton = document.getElementById("post-delete");

    // Dodaj referencu na eyebrow i updated
    const eyebrowEl = article.querySelector(".blog__eyebrow");
    let updatedEl = document.getElementById("post-updated");

    const post =
      postOverride || getPostById(identifier) || getPostBySlug(identifier);

    console.log("Rendering post:", identifier, post);

    if (!post) {
      if (titleEl) {
        titleEl.textContent = "Objava nije pronađena";
      }
      if (meta) {
        meta.textContent = "";
      }
      if (content) {
        content.innerHTML = "";
        const message = document.createElement("p");
        message.className = "post-detail__empty";
        message.textContent =
          "Nismo mogli pronaći traženu objavu. Vratite se na popis i pokušajte ponovno.";
        content.appendChild(message);
      }
      if (deleteButton) {
        deleteButton.disabled = true;
      }
      document.title = "Objava nije pronađena | Svijet Zdravlja";
      window.svzStopTrace && window.svzStopTrace(postTrace);
      return null;
    }

    article.dataset.id = post.id;
    if (titleEl) {
      titleEl.textContent = post.title;
      const ensureTitleWrap = function () {
        if (
          titleEl.parentElement &&
          titleEl.parentElement.classList.contains("post-title-wrap")
        ) {
          return titleEl.parentElement;
        }
        const wrap = document.createElement("div");
        wrap.className = "post-title-wrap";
        titleEl.parentElement.insertBefore(wrap, titleEl);
        wrap.appendChild(titleEl);
        return wrap;
      };
      const wrap = ensureTitleWrap();
      // remove previous badge/readtime if re-rendering
      const oldBadge = wrap.querySelector(".post-featured");
      if (oldBadge) oldBadge.remove();
      const oldReadtime = wrap.querySelector(".post-readtime");
      if (oldReadtime) oldReadtime.remove();

      // featured badge on the right cluster
      let badge = null;
      if (post.is_featured) {
        badge = document.createElement("span");
        badge.className = "post-featured";
        badge.textContent = "Istaknuto";
        wrap.appendChild(badge);
      }

      // reading time badge (always shown when available)
      const readtime = document.createElement("span");
      readtime.className = "post-readtime";
      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      icon.setAttribute("width", "18");
      icon.setAttribute("height", "18");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "#3d4a2c");
      icon.setAttribute("stroke-width", "2");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("stroke-linejoin", "round");
      icon.classList.add("post-readtime__icon");
      icon.innerHTML =
        '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 14"></polyline>';

      const minutes =
        typeof post.reading_time_minutes === "number"
          ? post.reading_time_minutes
          : parseInt(post.reading_time_minutes, 10);
      const hasMinutes = Number.isFinite(minutes);
      const text = document.createElement("span");
      text.className = "post-readtime__text";
      text.textContent = hasMinutes ? minutes + " min" : "";

      readtime.appendChild(icon);
      readtime.appendChild(text);
      if (hasMinutes) {
        wrap.appendChild(readtime);
      }
    }
    document.title = post.title + " | Svijet Zdravlja";

    if (hero) {
      hero.classList.remove("is-loaded");
      hero.hidden = true;
      if (heroWrap) {
        heroWrap.classList.remove("is-hidden");
        heroWrap.classList.add("skeleton");
      }
      const heroSrc =
        (post.hero_media && post.hero_media.storage_path) ||
        post.featuredImage ||
        "";
      if (heroSrc) {
        hero.onload = function () {
          hero.classList.add("is-loaded");
          hero.hidden = false;
          if (heroWrap) {
            heroWrap.classList.remove("skeleton");
          }
        };
        hero.onerror = function () {
          hero.classList.remove("is-loaded");
          hero.hidden = true;
          if (heroWrap) {
            // Only add shimmer, do not remove is-hidden
            heroWrap.classList.add("skeleton");
          }
        };
        hero.src = heroSrc;
        hero.alt = post.title || "Naslovna slika objave";
      } else {
        hero.hidden = true;
        if (heroWrap) {
          heroWrap.classList.add("is-hidden");
          heroWrap.classList.remove("skeleton");
        }
        hero.removeAttribute("src");
      }
    }
    if (meta) {
      const bits = [];
      const dateValue = formatDate(post.createdAt);
      if (dateValue) {
        bits.push(dateValue);
      }
      if (post.categories && post.categories.length) {
        bits.push(post.categories.join(", "));
      }
      if (post.author) {
        bits.push(post.author);
      }
      if (post.lang) {
        bits.push(post.lang.toUpperCase());
      }
      meta.textContent = bits.join(" • ");
    }

    // Dodaj sažetak ispod horizontalne crte
    const summaryEl = document.getElementById("post-summary");
    if (summaryEl) {
      summaryEl.textContent = post.excerpt || post.summary || "";
      summaryEl.style.marginBottom = "2rem";
      summaryEl.style.fontSize = "1.15rem";
      summaryEl.style.color = "#5a5f56";
    }

    // Reference
    const refSection = document.getElementById("post-references-section");
    const refList = document.getElementById("post-references-list");
    if (refSection && refList) {
      const refs = Array.isArray(post.reference || post.references)
        ? (post.reference || post.references).filter(Boolean)
        : [];
      refList.innerHTML = "";
      if (refs.length) {
        refs.forEach(function (ref) {
          const li = document.createElement("li");
          const text = (ref || "").toString().trim();
          if (text.startsWith("http://") || text.startsWith("https://")) {
            const link = document.createElement("a");
            link.href = text;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = text;
            li.appendChild(link);
          } else {
            li.textContent = text;
          }
          refList.appendChild(li);
        });
        refSection.hidden = false;
      } else {
        refSection.hidden = true;
      }
    }

    // Dinamički postavi kategoriju i datum u meta bar
    const categoryEl = document.getElementById("post-category");
    const dateEl = document.getElementById("post-date");
    // Autor je statički "Filip Jugović" (već u HTML-u)

    if (categoryEl) {
      if (post.categories && post.categories.length) {
        categoryEl.textContent = Array.isArray(post.categories)
          ? post.categories.join(", ")
          : post.categories;
      } else {
        categoryEl.textContent = "";
      }
    }
    if (dateEl) {
      dateEl.textContent = formatDate(post.createdAt);
    }

    // Render content: if chapters exist, render them in order, otherwise use single content field
    if (content) {
      content.innerHTML = "";
      if (Array.isArray(post.chapters) && post.chapters.length) {
        const sorted = post.chapters.slice().sort(function (a, b) {
          return (a.position || 0) - (b.position || 0);
        });

        function appendChapterTitle(target, ch) {
          if (ch && ch.title) {
            const heading = document.createElement("h3");
            heading.className = "post-chapter__title";
            heading.textContent = ch.title;
            target.appendChild(heading);
          }
        }

        sorted.forEach(function (ch) {
          if (ch.type === "TEXT") {
            // Tekstualni chapter: naslov + paragraf (veći font)
            const chapterDiv = document.createElement("div");
            chapterDiv.className = "post-chapter";
            appendChapterTitle(chapterDiv, ch);
            const p = document.createElement("p");
            p.className = "post-chapter__paragraph";
            p.textContent = ch.text_content || "";
            chapterDiv.appendChild(p);
            content.appendChild(chapterDiv);
          } else if (ch.type === "IMAGE") {
            // Prikaži naslov iznad cijelog image-flex containera
            if (ch.title) {
              const heading = document.createElement("h3");
              heading.className = "post-chapter__title";
              heading.textContent = ch.title;
              content.appendChild(heading);
            }

            // Slika + tekst layout (depends on layout_position)
            const chapterFlex = document.createElement("div");
            chapterFlex.className = "post-chapter post-chapter--image-flex";
            const layoutPos = (ch.layout_position || "RIGHT").toUpperCase();
            if (layoutPos === "TOP-MIDDLE" || layoutPos === "BOTTOM-MIDDLE") {
              chapterFlex.classList.add("post-chapter--image-middle");
            }

            // Lijeva strana: tekst + alt
            const left = document.createElement("div");
            left.className = "post-chapter__left";
            if (ch.text_content) {
              const p = document.createElement("p");
              p.className = "post-chapter__paragraph";
              p.textContent = ch.text_content;
              left.appendChild(p);
            }
            if (ch.alt_text) {
              const altP = document.createElement("p");
              altP.className = "post-chapter__alt";
              altP.textContent = ch.alt_text;
              left.appendChild(altP);
            }

            // Desna strana: slika
            const right = document.createElement("div");
            right.className = "post-chapter__right";
            const img = document.createElement("img");
            img.src =
              (ch.media && ch.media.storage_path) ||
              ch.image ||
              ch.chapter_image ||
              ch.featuredImage ||
              "";
            img.alt = ch.alt_text || ch.title || post.title || "";
            img.className = "post-chapter__image";
            right.appendChild(img);

            // Caption ispod slike (opcionalno)
            if (ch.caption) {
              const figcap = document.createElement("figcaption");
              figcap.className = "post-chapter__caption";
              figcap.textContent = ch.caption;
              right.appendChild(figcap);
            }

            if (layoutPos === "TOP-MIDDLE") {
              // Image above text
              chapterFlex.appendChild(right);
              chapterFlex.appendChild(left);
            } else if (layoutPos === "BOTTOM-MIDDLE") {
              // Image bellow text
              chapterFlex.appendChild(left);
              chapterFlex.appendChild(right);
            } else if (layoutPos === "LEFT") {
              // Image left, text right
              chapterFlex.appendChild(right);
              chapterFlex.appendChild(left);
            } else {
              // Default/right: text left, image right
              chapterFlex.appendChild(left);
              chapterFlex.appendChild(right);
            }
            content.appendChild(chapterFlex);
          } else if (ch.type === "VIDEO") {
            // VIDEO poglavlje
            let videoContainer = document.createElement("div");
            videoContainer.className = "post-chapter post-chapter--video";
            appendChapterTitle(videoContainer, ch);

            // YouTube embed ili link
            if (ch.external_video_url) {
              const youtubeMatch = ch.external_video_url.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i
              );
              if (youtubeMatch) {
                const iframe = document.createElement("iframe");
                iframe.width = "100%";
                iframe.height = "480";
                iframe.src = "https://www.youtube.com/embed/" + youtubeMatch[1];
                iframe.frameBorder = "0";
                iframe.allow =
                  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                videoContainer.appendChild(iframe);
              } else {
                const link = document.createElement("a");
                link.href = ch.external_video_url;
                link.textContent = ch.external_video_url;
                link.target = "_blank";
                videoContainer.appendChild(link);
              }
            }

            // Caption ispod videa (opcionalno)
            if (ch.caption) {
              const cap = document.createElement("p");
              cap.className = "post-chapter__caption";
              cap.textContent = ch.caption;
              videoContainer.appendChild(cap);
            }

            // Alt opis (chapter-alt) ispod videa
            if (ch.alt_text) {
              const altP = document.createElement("p");
              altP.className = "post-chapter__alt";
              altP.textContent = ch.alt_text;
              videoContainer.appendChild(altP);
            }

            // Novi tekstualni opis ispod videa (chapter_text)
            if (ch.chapter_text) {
              const textP = document.createElement("p");
              textP.className = "post-chapter__video-text";
              textP.textContent = ch.chapter_text;
              videoContainer.appendChild(textP);
            }

            content.appendChild(videoContainer);
          }
        });
      } else {
        buildContentNodes(content, post.content);
      }
    }

    // track scroll depth for analytics once content is rendered
    initPostScrollDepth(post);

    if (editLink) {
      editLink.href = "create.html?id=" + encodeURIComponent(post.id);
    }
    if (deleteButton) {
      deleteButton.disabled = false;
    }

    // Dodaj prikaz ažuriranog datuma ispod eyebrow
    if (eyebrowEl) {
      if (!updatedEl) {
        updatedEl = document.createElement("p");
        updatedEl.id = "post-updated";
        updatedEl.className = "blog__updated";
        updatedEl.style.marginTop = "-10px";
        updatedEl.style.marginBottom = "0";
        updatedEl.style.color = "#6b7a6b";
        updatedEl.style.fontSize = "0.85rem";
        eyebrowEl.insertAdjacentElement("afterend", updatedEl);
      }
      if (post && post.updatedAt) {
        // Formatiraj datum kao "Ažurirano: 5.6.2024."
        const date = new Date(post.updatedAt);
        const formatted = `${date.getDate()}.${
          date.getMonth() + 1
        }.${date.getFullYear()}.`;
        updatedEl.textContent = `Ažurirano: ${formatted}`;
      } else {
        updatedEl.textContent = "";
      }
    }

    window.svzStopTrace && window.svzStopTrace(postTrace);
    return post;
  }

  function getFilterStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get("q") || "",
      category: params.get("category") || "all",
      sort: params.get("sort") || "newest",
    };
  }

  function persistFilterState(filters) {
    if (!window.history || !window.history.replaceState) {
      return;
    }
    const params = new URLSearchParams(window.location.search);

    if (filters.q) {
      params.set("q", filters.q);
    } else {
      params.delete("q");
    }

    if (filters.category && filters.category !== "all") {
      params.set("category", filters.category);
    } else {
      params.delete("category");
    }

    if (filters.sort && filters.sort !== "newest") {
      params.set("sort", filters.sort);
    } else {
      params.delete("sort");
    }

    const query = params.toString();
    const url = window.location.pathname + (query ? "?" + query : "");
    window.history.replaceState({}, "", url);
  }

  function updateImagePreview(preview, src) {
    if (!preview) {
      return;
    }
    if (src) {
      preview.src = src;
      preview.hidden = false;
    } else {
      preview.hidden = true;
      preview.removeAttribute("src");
    }
  }

  function displayFormMessage(target, type, message) {
    if (!target) {
      return;
    }
    target.textContent = message;
    target.hidden = !message;
    target.className = "form-status form-status--" + type;
  }

  // Toast helper
  function showToast(message, type = "error", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast--hide");
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, duration);
  }

  function showListStatusBanner(params) {
    if (!params) {
      return false;
    }
    const status = params.get("status");
    if (!status) {
      return false;
    }
    // Show only toast for deleted status, do NOT render banner
    if (status === "deleted") {
      showToast("Obrisali ste objavu.", "error", 3500);
      return true;
    }
    const container = document.querySelector(".blog__container");
    if (!container) {
      return false;
    }
    var messageMap = {
      created: "Objava je uspješno spremljena.",
      updated: "Objava je ažurirana.",
      // deleted: "Objava je izbrisana.", // toast only
    };
    const message = messageMap[status];
    if (!message) {
      return false;
    }
    const banner = document.createElement("div");
    const variant = "success";
    banner.className = "blog__status blog__status--" + variant;
    banner.textContent = message;
    container.insertBefore(banner, container.firstChild);
    return true;
  }

  function clearTransientListParams(params) {
    if (!params) {
      return;
    }
    let mutated = false;
    ["status", "id"].forEach(function (key) {
      if (params.has(key)) {
        params.delete(key);
        mutated = true;
      }
    });
    if (!mutated) {
      return;
    }
    const query = params.toString();
    const url = window.location.pathname + (query ? "?" + query : "");
    window.history.replaceState({}, "", url);
  }

  function fillFormFields(form, post, state) {
    if (!form || !post) {
      return;
    }
    form.querySelector("#post-title").value = post.title || "";
    form.querySelector("#post-slug").value = post.slug || "";
    form.querySelector("#post-categories").value = (post.categories || []).join(
      ", "
    );
    form.querySelector("#post-tags").value = (post.tags || []).join(", ");
    form.querySelector("#post-content").value = post.content || "";
    form.querySelector("#post-excerpt").value = post.excerpt || "";
    form.querySelector("#post-published").checked = Boolean(post.published);
    state.currentImage = post.featuredImage || "";
  }

  function initListPage() {
    const listEl = document.getElementById("posts-list");
    if (!listEl) {
      return;
    }
    const searchInput = document.getElementById("posts-search");
    const categorySelect = document.getElementById("posts-filter-category");
    const sortSelect = document.getElementById("posts-sort");
    const filters = getFilterStateFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    let categoryOptions = null;
    let sortOptions = null;

    if (searchInput) {
      searchInput.value = filters.q;
    }
    const applyOptions = function (targetFilters) {
      if (categorySelect) {
        const categoriesToUse =
          categoryOptions || getCategoryOptionsFromPosts(getPosts());
        populateCategoryFilterOptions(
          categoriesToUse,
          categorySelect,
          targetFilters && targetFilters.category
        );
        renderCategoryButtons(lastCategoryOptions, categorySelect.value);
      }
      if (sortSelect) {
        populateSortFilterOptions(
          sortOptions || DEFAULT_SORT_OPTIONS,
          sortSelect,
          targetFilters && targetFilters.sort
        );
      }
    };

    const renderWithFallback = function (targetFilters) {
      listEl.setAttribute("aria-busy", "true");
      const listTrace =
        window.svzStartTrace && window.svzStartTrace("blog_list_render");
      let renderedCount = 0;
      const renderFromApi = function () {
        return fetchPostsFromApi(targetFilters)
          .then(function (apiPosts) {
            if (Array.isArray(apiPosts)) {
              allPostsCache = apiPosts;
              try {
                savePosts(apiPosts);
              } catch (e) {
                console.warn("Could not save API posts to local storage", e);
              }
              renderList(apiPosts);
              renderedCount = apiPosts.length;
              return true;
            }
            return false;
          })
          .catch(function (error) {
            console.warn(
              "Falling back to local posts after fetch error",
              error
            );
            const message =
              (error && error.message) ||
              "Ne možemo učitati objave. Pokušajte ponovno.";
            showToast(message, "error");
            return false;
          });
      };

      const renderFromLocal = function () {
        const basePosts =
          (Array.isArray(allPostsCache) && allPostsCache.length
            ? allPostsCache
            : null) || getPosts();
        const local = filterPostsLocally(
          basePosts,
          targetFilters,
          categoryOptions
        );
        renderList(local);
        renderedCount = local.length;
      };

      return renderFromApi()
        .then(function (rendered) {
          if (!rendered) {
            renderFromLocal();
          }
        })
        .finally(function () {
          window.svzStopTrace &&
            window.svzStopTrace(listTrace, { count: renderedCount });
          notifyPostsLoaded();
          const currentCategory =
            (categorySelect && categorySelect.value) ||
            (targetFilters && targetFilters.category) ||
            "all";
          renderCategoryButtons(lastCategoryOptions, currentCategory);
        });
    };

    applyOptions(filters);
    Promise.all([fetchCategoriesFromApi(), fetchSortOptionsFromApi()])
      .then(function (results) {
        categoryOptions = results[0];
        sortOptions = results[1];
        applyOptions(filters);
      })
      .catch(function () {
        applyOptions(filters);
      });

    const handleChange = function () {
      const updatedFilters = {
        q: searchInput ? searchInput.value.trim() : "",
        category: categorySelect ? categorySelect.value : "all",
        sort: sortSelect ? sortSelect.value : "newest",
      };
      renderCategoryButtons(lastCategoryOptions, updatedFilters.category);
      persistFilterState(updatedFilters);
      renderWithFallback(updatedFilters);
    };

    // Try to refresh posts from backend API, fall back to local storage
    renderWithFallback(filters);
    // const highlightApplied = highlightPostCardFromParams(urlParams);
    const bannerShown = showListStatusBanner(urlParams);
    if (/*highlightApplied ||*/ bannerShown) {
      clearTransientListParams(urlParams);
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        window.clearTimeout(searchInput._debounceTimeout);
        searchInput._debounceTimeout = window.setTimeout(handleChange, 200);
      });
    }
    if (categorySelect) {
      categorySelect.addEventListener("change", handleChange);
    }
    if (sortSelect) {
      sortSelect.addEventListener("change", handleChange);
    }
  }

  function initCreatePage() {
    const form = document.getElementById("post-form");
    if (!form) {
      return;
    }
    const status = document.getElementById("post-form-status");
    const preview = document.getElementById("post-image-preview");
    const fileInput = document.getElementById("post-image");
    const heading = document.getElementById("post-form-heading");
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");
    const state = { currentImage: "" };
    var mode = "create";
    var editingPost = null;

    if (editId) {
      editingPost = getPostById(editId);
      if (editingPost) {
        mode = "edit";
        if (heading) {
          heading.textContent = "Uređivanje objave";
        }
        form.querySelector("#post-save").textContent = "Ažuriraj objavu";
        fillFormFields(form, editingPost, state);
        updateImagePreview(preview, state.currentImage);
      }
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          updateImagePreview(preview, state.currentImage);
          return;
        }
        fileToDataURL(file)
          .then(function (dataUrl) {
            state.currentImage = dataUrl;
            updateImagePreview(preview, dataUrl);
          })
          .catch(function (error) {
            displayFormMessage(status, "error", error.message);
            fileInput.value = "";
          });
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      displayFormMessage(status, "info", "Spremamo objavu...");
      const formData = {
        id: editingPost && editingPost.id,
        title: form.querySelector("#post-title").value,
        slug: form.querySelector("#post-slug").value,
        categories: form.querySelector("#post-categories").value,
        tags: form.querySelector("#post-tags").value,
        content: form.querySelector("#post-content").value,
        excerpt: form.querySelector("#post-excerpt").value,
        published: form.querySelector("#post-published").checked,
        is_featured: !!(
          form.querySelector("#post-featured") &&
          form.querySelector("#post-featured").checked
        ),
        featuredImage: state.currentImage,
      };
      try {
        const post =
          mode === "edit"
            ? updatePost(editingPost.id, formData)
            : createPost(formData);
        displayFormMessage(status, "success", "Objava je uspješno spremljena.");
        window.setTimeout(function () {
          const redirectStatus = mode === "edit" ? "updated" : "created";
          const target =
            "index.html?status=" +
            redirectStatus +
            "&id=" +
            encodeURIComponent(post.id);
          window.location.href = target;
        }, 600);
      } catch (error) {
        displayFormMessage(status, "error", error.message);
      }
    });
  }

  function initPostPage() {
    const article = document.getElementById("post-article");
    if (!article) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    const slugParam = params.get("slug");
    const identifier = idParam || slugParam;
    const deleteBtn = document.getElementById("post-delete");
    fetchPostFromApi(identifier, Boolean(idParam))
      .then(function (apiPost) {
        if (apiPost) {
          renderPost(identifier, apiPost);
        } else {
          renderPost(identifier);
        }
      })
      .catch(function () {
        renderPost(identifier);
      });

    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function () {
        const id = article.dataset.id;
        if (!id || !ADMIN_API_BASE) {
          return;
        }
        const token = getAdminToken();
        if (!token) {
          alert("Niste prijavljeni kao administrator.");
          return;
        }
        const confirmed = window.confirm(
          "Jeste li sigurni da želite izbrisati ovu objavu?"
        );
        if (!confirmed) return;

        deleteBtn.disabled = true;
        deleteBtn.textContent = "Brisanje...";
        try {
          const resp = await adminFetch(
            `${ADMIN_API_BASE}/posts/${id}`,
            {
              method: "DELETE",
            },
            true
          );
          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(
              errText || "Brisanje nije uspjelo. Pokušajte ponovno."
            );
          }
          clearPostsCache();
          window.location.href = "blog.html?status=deleted";
        } catch (err) {
          alert(err.message || "Brisanje nije uspjelo.");
        } finally {
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Izbriši objavu";
        }
      });
    }
  }

  // helper koji obavještava ostale skripte da su postovi učitani
  function notifyPostsLoaded() {
    try {
      // obavijesti index.html skriptu da su postovi gotovi
      document.dispatchEvent(new Event("posts:loaded"));
    } catch (e) {
      // ignore
    }
    try {
      var postsList = document.getElementById("posts-list");
      if (postsList) postsList.setAttribute("aria-busy", "false");
    } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    initListPage();
    initCreatePage();
    initPostPage();
  });

  window.SVZBlog = {
    getPosts: getPosts,
    savePosts: savePosts,
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost,
    getPostById: getPostById,
    getPostBySlug: getPostBySlug,
    fileToDataURL: fileToDataURL,
  };
})();
