(function () {
  function q(sel) {
    return document.querySelector(sel);
  }

  function hasPosts(postsList) {
    if (!postsList) return false;
    return (
      !!postsList.querySelector("article, .post, .blog-item, .card") ||
      postsList.children.length > 0
    );
  }

  function init() {
    var loader = q(".loader-overlay");
    var postsList = document.getElementById("posts-list");
    if (!loader) {
      // nema loadera na stranici -> ništa za raditi
      return;
    }

    function show() {
      loader.classList.remove("hidden");
      loader.setAttribute("aria-hidden", "false");
      if (postsList) postsList.setAttribute("aria-busy", "true");
    }
    function hide() {
      loader.classList.add("hidden");
      loader.setAttribute("aria-hidden", "true");
      if (postsList) postsList.setAttribute("aria-busy", "false");
    }

    // Inicijalno: pokaži loader (ako već nije) i sakrij odmah ako već postoje postovi
    show();
    if (hasPosts(postsList)) {
      hide();
      return;
    }

    // Observer koji sakrije loader čim dođu postovi
    var obs;
    if (postsList) {
      obs = new MutationObserver(function () {
        if (hasPosts(postsList)) {
          obs.disconnect();
          hide();
        }
      });
      obs.observe(postsList, { childList: true, subtree: true });
    }

    // Custom event: blog.js može dispatch-ati 'posts:loaded'
    var onLoaded = function () {
      if (obs) obs.disconnect();
      hide();
    };
    document.addEventListener("posts:loaded", onLoaded, { once: true });

    // Fallback timeout
    var fallback = setTimeout(function () {
      if (obs) obs.disconnect();
      hide();
    }, 10000);

    // Izloženi API za ručno upravljanje (npr. blog.js može pozvati window.loaderDone())
    window.loaderDone = function () {
      clearTimeout(fallback);
      if (obs) obs.disconnect();
      hide();
    };
    window.loaderShow = function () {
      show();
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
