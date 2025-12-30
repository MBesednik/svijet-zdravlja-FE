function highlightPostCardFromParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("postId");
  if (postId) {
    const postCard = document.querySelector(`[data-post-id="${postId}"]`);
    if (postCard) {
      postCard.classList.add("highlight");
    }
  }
}

// Ovdje dolazi funkcija initListPage i njen poziv na highlightPostCardFromParams
