(function () {
  "use strict";

  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f4f6f2"/><text x="50%" y="50%" fill="%235a5f56" font-size="24" font-family="Inter,Arial,sans-serif" text-anchor="middle">Svijet Zdravlja</text></svg>';

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("hr-HR", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      });
    } catch (err) {
      return value;
    }
  }

  function normalizePost(p) {
    if (!p || typeof p !== "object") return null;
    return {
      id: p.id || p._id || p.slug || "",
      slug: p.slug || "",
      title: p.title || "",
      excerpt: p.summary || p.excerpt || "",
      createdAt: p.createdAt || p.published_at || p.created_at,
      categories: Array.isArray(p.categories)
        ? p.categories.map(function (c) {
            return c.name || c;
          })
        : [],
      featuredImage:
        (p.hero_media && p.hero_media.storage_path) ||
        p.featuredImage ||
        p.hero_media ||
        "",
    };
  }

  async function fetchFeaturedFromApi() {
    const apiBase = window.getSVZApiBase();
    const resp = await fetch(apiBase + "/posts/featured", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      if (window.svzTrack) {
        window.svzTrack("api_error", {
          endpoint: "/posts/featured",
          status: resp.status,
          message: "featured",
          path: window.location.pathname,
        });
      }
      throw new Error("Featured fetch failed");
    }
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizePost)
      .filter(Boolean)
      .filter(function (p) {
        return p.title;
      });
  }

  function renderFeatured(container, posts) {
    if (!container) return;
    container.setAttribute("aria-busy", "true");
    container.innerHTML = "";

    // Limit to max 3 featured posts
    const list = Array.isArray(posts) ? posts.slice(0, 3) : [];

    const applyLayout = function (count) {
      const capped = Math.max(1, Math.min(count || 0, 3));
      container.classList.add("post-list--featured");
      container.classList.remove("columns-1", "columns-2", "columns-3");
      container.classList.add("columns-" + capped);
    };

    if (!list.length) {
      // hide entire section if nothing to show
      const section = container.closest(".featured-posts");
      if (section) section.style.display = "none";
      return;
    }

    applyLayout(list.length);

    const frag = document.createDocumentFragment();

    list.forEach(function (post, index) {
      const article = document.createElement("article");
      article.className = "post-card";
      article.dataset.id = post.id || "";

      const image = document.createElement("img");
      image.className = "post-card__image";
      image.src = post.featuredImage || post.hero_media || FALLBACK_IMAGE;
      image.alt = post.title || "Naslovna slika";
      article.appendChild(image);

      const title = document.createElement("h3");
      title.className = "post-card__title";
      title.textContent = post.title || "";
      article.appendChild(title);

      const excerpt = document.createElement("p");
      excerpt.className = "post-card__excerpt";
      excerpt.textContent = post.excerpt || post.summary || "";
      article.appendChild(excerpt);

      const meta = document.createElement("div");
      meta.className = "post-card__meta";
      const dateSpan = document.createElement("span");
      dateSpan.textContent = formatDate(
        post.createdAt || post.published_at || post.created_at
      );
      meta.appendChild(dateSpan);

      if (post.categories && post.categories.length) {
        const categories = document.createElement("span");
        categories.textContent = " • " + post.categories.join(", ");
        meta.appendChild(categories);
      }

      article.appendChild(meta);

      const link = document.createElement("a");
      link.className = "post-card__read";
      link.href =
        "/blog/post.html?id=" + encodeURIComponent(post.id || post.slug || "");
      link.textContent = "Pročitaj više";
      link.addEventListener("click", function () {
        if (window.svzTrack) {
          window.svzTrack("featured_read_click", {
            id: post.id || "",
            slug: post.slug || "",
            position: index + 1,
          });
        }
      });
      article.appendChild(link);

      frag.appendChild(article);
    });

    container.appendChild(frag);
    container.setAttribute("aria-busy", "false");
  }

  // Main
  (async function () {
    try {
      const container = document.getElementById("featured-posts");
      if (!container) return;

      const posts = await fetchFeaturedFromApi();
      renderFeatured(container, posts);
    } catch (err) {
      // Fail silently — homepage should stay up even if posts are malformed
      console.warn("Featured posts render failed:", err);
    }
  })();
})();
