# Analytics quick guide

## What was added
- Firebase Analytics initialized in `scripts/analytics.js` (loaded on all main pages).
- Global helper `window.svzTrack(event, params)` for custom events.
- Automatic events: `page_engagement` (time on page), `nav_click` (top nav), `cta_click` (elements with `data-track="cta"`), `featured_read_click` (home featured cards), `blog_filter` and `post_list_view` (blog listing), `blog_post_view`, `blog_post_scroll` (25/50/75/100%), `blog_post_engagement` (time on post).
- Hero CTA (“Zakaži besplatnu konzultaciju”) and other CTAs are tracked via `data-track` attributes.

## Developer checklist
1) Ensure `scripts/analytics.js` is included where tracking is needed (already added to `index.html`, `blog/blog.html`, `blog/post.html`).
2) Keep Firebase config (in `scripts/analytics.js`) aligned with the correct project keys.
3) When adding new buttons/links to track, add `data-track="cta"` and an optional `data-track-label="my_label"`; the script will emit `cta_click` with label/href.
4) When rendering featured posts or blog content elsewhere, reuse existing helpers or call `window.svzTrack` with consistent event names above.

## What the client can view
- Realtime > Events: see `nav_click`, `cta_click`, `featured_read_click`, `blog_post_view`, `blog_post_scroll`, `blog_post_engagement`, `blog_filter`, `post_list_view`.
- Engagement > Events: aggregated counts and parameters (e.g., `depth` for scroll, `duration_ms` for engagement, `category/sort/search` for filters).
- Pages/screens: time-on-page via `page_engagement` with `path` and `referrer`.

## Event reference
- `page_engagement`: `{ path, duration_ms, referrer }`
- `nav_click`: `{ label, href }`
- `cta_click`: `{ label, href }` (label from text or `data-track-label`)
- `featured_read_click`: `{ id, slug, position }`
- `post_list_view`: `{ count, filters }`
- `blog_filter`: `{ category, sort, search, count }`
- `blog_post_view`: `{ id, slug }`
- `blog_post_scroll`: `{ id, slug, depth }` where depth is 25/50/75/100
- `blog_post_engagement`: `{ id, slug, duration_ms }`
- `api_error`: `{ endpoint, status, message, path }` (fires on failed API calls)
- Admin flows also emit `api_error` for login and admin form requests.
