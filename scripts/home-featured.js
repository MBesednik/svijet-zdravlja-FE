(function () {
  "use strict";

  const STORAGE_KEY = "svz_blog_posts";
  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f4f6f2"/><text x="50%" y="50%" fill="%235a5f56" font-size="24" font-family="Inter,Arial,sans-serif" text-anchor="middle">Svijet Zdravlja</text></svg>';

  function safeParse(raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

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

  function getStoredPosts() {
    const raw = window.localStorage.getItem(STORAGE_KEY) || "";
    return safeParse(raw);
  }

  function renderFeatured(container, posts) {
    if (!container) return;
    container.setAttribute("aria-busy", "true");
    container.innerHTML = "";

    if (!posts.length) {
      // hide entire section if nothing to show
      const section = container.closest(".featured-posts");
      if (section) section.style.display = "none";
      return;
    }

    const frag = document.createDocumentFragment();

    posts.forEach(function (post) {
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
        "blog/post.html?id=" + encodeURIComponent(post.id || post.slug || "");
      link.textContent = "Pročitaj više";
      article.appendChild(link);

      frag.appendChild(article);
    });

    container.appendChild(frag);
    container.setAttribute("aria-busy", "false");
  }

  // Main
  try {
    const container = document.getElementById("featured-posts");
    if (!container) return;

    const posts = getStoredPosts()
      .filter(function (p) {
        if (!p) return false;
        // accept both camelCase and snake_case names
        const isFeatured = p.is_featured === true || p.isFeatured === true;
        const isPublished = p.published === true || p.status === "PUBLISHED";
        return isFeatured && isPublished;
      })
      .sort(function (a, b) {
        const ta = new Date(
          a.createdAt || a.published_at || a.created_at || 0
        ).getTime();
        const tb = new Date(
          b.createdAt || b.published_at || b.created_at || 0
        ).getTime();
        return tb - ta;
      })
      .slice(0, 3);

    renderFeatured(container, posts);
  } catch (err) {
    // Fail silently — homepage should stay up even if posts are malformed
    console.warn("Featured posts render failed:", err);
  }
})();
