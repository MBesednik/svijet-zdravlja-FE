(function () {
  "use strict";

  const SVZ_STORAGE_KEY = "svz_blog_posts";
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
  const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f4f6f2"/><text x="50%" y="50%" fill="%235a5f56" font-size="24" font-family="Inter,Arial,sans-serif" text-anchor="middle">Svijet Zdravlja</text></svg>';
  const WINDOW_STATE_PREFIX = "SVZ_BLOG::";
  const SESSION_CACHE_KEY = "svz_blog_posts_cache";

  function readSessionCache() {
    try {
      const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.warn("Ne možemo pročitati sessionStorage cache.", error);
      return null;
    }
  }

  function writeSessionCache(posts) {
    try {
      window.sessionStorage.setItem(
        SESSION_CACHE_KEY,
        JSON.stringify(posts || [])
      );
    } catch (error) {
      console.warn("Ne možemo spremiti sessionStorage cache.", error);
    }
  }

  function readFromWindowState() {
    const raw = window.name || "";
    if (!raw.startsWith(WINDOW_STATE_PREFIX)) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw.slice(WINDOW_STATE_PREFIX.length));
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.warn("Ne možemo pročitati window.name stanje.", error);
      return null;
    }
  }

  function writeToWindowState(posts) {
    try {
      window.name = WINDOW_STATE_PREFIX + JSON.stringify(posts || []);
    } catch (error) {
      console.warn("Ne možemo spremiti stanje u window.name.", error);
    }
  }

  function getPosts() {
    let posts = [];
    try {
      const raw = window.localStorage.getItem(SVZ_STORAGE_KEY);
      console.log("LOLOLO Rendering raw:", raw);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          posts = parsed;
        }
      }
    } catch (error) {
      console.error("Ne možemo učitati objave", error);
    }
    if (!posts.length) {
      const cached = readSessionCache();
      if (Array.isArray(cached)) {
        posts = cached;
      }
    }

    if (!posts.length) {
      const fallback = readFromWindowState();
      if (Array.isArray(fallback)) {
        posts = fallback;
      }
    }

    if (posts.length) {
      writeSessionCache(posts);
      writeToWindowState(posts);
    }
    return posts;
  }

  function savePosts(posts) {
    try {
      window.localStorage.setItem(SVZ_STORAGE_KEY, JSON.stringify(posts));
    } catch (error) {
      console.error("Ne možemo spremiti objave.", error);
    }
    writeSessionCache(posts);
    writeToWindowState(posts);
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
      categories: Array.isArray(p.categories)
        ? p.categories.map(function (c) {
            return c.name || c;
          })
        : p.categories || [],
      tags: p.tags || [],
      featuredImage:
        (p.hero_media && p.hero_media.storage_path) || p.featuredImage || "",
      published: p.status === "PUBLISHED" || p.published === true,
      readTime: p.read_time || p.readTime || null,
      is_featured: p.is_featured || p.isFeatured || false,
      lang: p.lang || p.language || undefined,
      chapters: p.chapters || [],
      hero_media: p.hero_media,
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
    if (filters && filters.sort && filters.sort !== "newest") {
      params.set("sort", resolveSortAlias(filters.sort));
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

  async function fetchPostsFromApi(filters) {
    try {
      const resp = await fetch(API_BASE + "/posts" + buildPostsQuery(filters), {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        console.warn("API posts fetch failed", resp.status);
        return null;
      }
      const data = await resp.json();
      if (!Array.isArray(data)) return null;
      // normalize to local storage shape
      const normalized = data.map(normalizeApiPost).filter(Boolean);
      return normalized;
    } catch (err) {
      console.warn("Failed to fetch posts from API", err);
      return null;
    }
  }

  async function fetchPostFromApi(identifier, fetchById) {
    if (!identifier) {
      return null;
    }
    const path = fetchById ? "/posts/id/" : "/posts/";
    try {
      const resp = await fetch(
        API_BASE + path + encodeURIComponent(identifier),
        {
          headers: { Accept: "application/json" },
        }
      );
      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      return normalizeApiPost(data);
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
      const resp = await fetch(API_BASE + "/posts/sort-options", {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      const normalized = normalizeSortResponse(data);
      sortAliases = normalized.aliases || {};
      return normalized.options.length ? normalized.options : null;
    } catch (err) {
      console.warn("Failed to fetch sort options", err);
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
          return { slug: item, name: item };
        }
        if (item && typeof item === "object") {
          const slug =
            item.slug || item.value || item.id || item.key || item.name;
          const name = item.name || item.label || item.title || slug;
          if (slug) {
            return { slug: slug, name: name };
          }
        }
        return null;
      })
      .filter(Boolean);
  }

  async function fetchCategoriesFromApi() {
    try {
      const resp = await fetch(API_BASE + "/categories", {
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        return null;
      }
      const data = await resp.json();
      const normalized = normalizeCategoryOptions(data);
      return normalized.length ? normalized : null;
    } catch (err) {
      console.warn("Failed to fetch categories", err);
      return null;
    }
  }

  function getCategoryOptionsFromPosts(posts) {
    const items = Array.from(
      new Set(
        (posts || []).flatMap(function (post) {
          return Array.isArray(post.categories) ? post.categories : [];
        })
      )
    ).sort(function (a, b) {
      return a.localeCompare(b, "hr");
    });
    return items.map(function (name) {
      return { slug: name, name: name };
    });
  }

  function populateCategoryFilterOptions(categories, selectEl, currentValue) {
    if (!selectEl) {
      return;
    }
    const normalized = normalizeCategoryOptions(categories || []);
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
      author: (raw.author && raw.author.trim()) || "Svijet Zdravlja",
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
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

      const image = document.createElement("img");
      image.className = "post-card__image";
      image.src = post.featuredImage || FALLBACK_IMAGE;
      image.alt = post.title || "Naslovna slika objave";
      article.appendChild(image);

      const title = document.createElement("h3");
      title.className = "post-card__title";
      title.textContent = post.title;
      article.appendChild(title);

      const excerpt = document.createElement("p");
      excerpt.className = "post-card__excerpt";
      excerpt.textContent = post.excerpt;
      article.appendChild(excerpt);

      const meta = document.createElement("div");
      meta.className = "post-card__meta";
      const date = document.createElement("span");
      date.textContent = formatDate(post.createdAt);
      meta.appendChild(date);

      if (post.categories && post.categories.length) {
        const categoriesSpan = document.createElement("span");
        categoriesSpan.textContent = " • " + post.categories.join(", ");
        meta.appendChild(categoriesSpan);
      }

      if (!post.published) {
        const draft = document.createElement("span");
        draft.textContent = " • Skica";
        meta.appendChild(draft);
      }

      article.appendChild(meta);

      const link = document.createElement("a");
      link.className = "post-card__read";
      link.href = "post.html?id=" + encodeURIComponent(post.id);
      link.textContent = "Pročitaj više";
      article.appendChild(link);

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
    const article = document.getElementById("post-article");
    if (!article) {
      return null;
    }
    const titleEl = document.getElementById("post-title");
    const hero = document.getElementById("post-hero");
    const meta = document.getElementById("post-meta");
    const content = document.getElementById("post-content");
    const editLink = document.getElementById("post-edit");
    const deleteButton = document.getElementById("post-delete");

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
      return null;
    }

    article.dataset.id = post.id;
    if (titleEl) {
      titleEl.textContent = post.title;
      // featured badge
      if (post.is_featured) {
        if (!titleEl.querySelector(".post-featured")) {
          const badge = document.createElement("span");
          badge.className = "post-featured";
          badge.textContent = "Istaknuto";
          badge.style.marginLeft = "0.75rem";
          badge.style.fontSize = "0.6rem";
          badge.style.background = "#3d4a2c";
          badge.style.color = "#fff";
          badge.style.padding = "0.25rem 0.5rem";
          badge.style.borderRadius = "6px";
          titleEl.appendChild(badge);
        }
      }
    }
    document.title = post.title + " | Svijet Zdravlja";

    if (hero) {
      // prefer hero_media.storage_path (backend), fallback to featuredImage (local storage)
      const heroSrc =
        (post.hero_media && post.hero_media.storage_path) ||
        post.featuredImage ||
        "";
      if (heroSrc) {
        hero.src = heroSrc;
        hero.alt = post.title || "Naslovna slika objave";
        hero.hidden = false;
      } else {
        hero.hidden = true;
        hero.removeAttribute("src");
      }
    }
    if (meta) {
      const bits = [];
      const dateValue = formatDate(post.createdAt);
      if (dateValue) {
        bits.push(dateValue);
      }
      if (post.readTime) {
        bits.push(post.readTime + " min čitanja");
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

    // Render content: if chapters exist, render them in order, otherwise use single content field
    if (content) {
      content.innerHTML = "";
      if (Array.isArray(post.chapters) && post.chapters.length) {
        const sorted = post.chapters.slice().sort(function (a, b) {
          return (a.position || 0) - (b.position || 0);
        });
        sorted.forEach(function (ch) {
          if (ch.type === "TEXT") {
            const p = document.createElement("p");
            p.textContent = ch.text_content || "";
            content.appendChild(p);
          } else if (ch.type === "IMAGE") {
            const figure = document.createElement("figure");
            const img = document.createElement("img");
            img.src =
              (ch.media && ch.media.storage_path) ||
              ch.image ||
              ch.chapter_image ||
              ch.featuredImage ||
              "";
            img.alt = ch.alt_text || ch.title || post.title || "";
            img.style.maxWidth = "100%";
            figure.appendChild(img);
            if (ch.caption) {
              const figcap = document.createElement("figcaption");
              figcap.textContent = ch.caption;
              figure.appendChild(figcap);
            }
            content.appendChild(figure);
          } else if (ch.type === "VIDEO") {
            if (ch.external_video_url) {
              // try to embed YouTube links
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
                content.appendChild(iframe);
              } else {
                const link = document.createElement("a");
                link.href = ch.external_video_url;
                link.textContent = ch.external_video_url;
                link.target = "_blank";
                content.appendChild(link);
              }
              if (ch.caption) {
                const cap = document.createElement("p");
                cap.className = "post-chapter__caption";
                cap.textContent = ch.caption;
                content.appendChild(cap);
              }
            }
          }
        });
      } else {
        buildContentNodes(content, post.content);
      }
    }

    if (editLink) {
      editLink.href = "create.html?id=" + encodeURIComponent(post.id);
    }
    if (deleteButton) {
      deleteButton.disabled = false;
    }

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

  function highlightPostCardFromParams(params) {
    if (!params) {
      return false;
    }
    const id = params.get("id");
    if (!id) {
      return false;
    }
    const card = document.querySelector('.post-card[data-id="' + id + '"]');
    if (!card) {
      return false;
    }
    card.classList.add("post-card--highlight");
    window.setTimeout(function () {
      card.classList.remove("post-card--highlight");
    }, 3000);
    return true;
  }

  function showListStatusBanner(params) {
    if (!params) {
      return false;
    }
    const status = params.get("status");
    if (!status) {
      return false;
    }
    const container = document.querySelector(".blog__container");
    if (!container) {
      return false;
    }
    var messageMap = {
      created: "Objava je uspješno spremljena.",
      updated: "Objava je ažurirana.",
      deleted: "Objava je izbrisana.",
    };
    const message = messageMap[status];
    if (!message) {
      return false;
    }
    const banner = document.createElement("div");
    const variant = status === "deleted" ? "warning" : "success";
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
      return fetchPostsFromApi(targetFilters)
        .then(function (apiPosts) {
          if (Array.isArray(apiPosts)) {
            if (apiPosts.length) {
              try {
                savePosts(apiPosts);
              } catch (e) {
                console.warn("Could not save API posts to local storage", e);
              }
            }
            renderList(apiPosts);
            return;
          }
          renderList(
            filterPostsLocally(getPosts(), targetFilters, categoryOptions)
          );
        })
        .catch(function () {
          renderList(
            filterPostsLocally(getPosts(), targetFilters, categoryOptions)
          );
        })
        .finally(notifyPostsLoaded);
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
      persistFilterState(updatedFilters);
      renderWithFallback(updatedFilters);
    };

    // Try to refresh posts from backend API, fall back to local storage
    renderWithFallback(filters);
    const highlightApplied = highlightPostCardFromParams(urlParams);
    const bannerShown = showListStatusBanner(urlParams);
    if (highlightApplied || bannerShown) {
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
      deleteBtn.addEventListener("click", function () {
        const id = article.dataset.id;
        if (!id) {
          return;
        }
        const deleted = deletePost(id);
        if (deleted) {
          window.location.href = "index.html?status=deleted";
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
    SVZ_STORAGE_KEY: SVZ_STORAGE_KEY,
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
