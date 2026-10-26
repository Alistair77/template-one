# Autodesk Manufacturing Next

A standalone, responsive static microsite for the Autodesk Manufacturing Next forum in Faridabad.

## Preview locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish with GitHub Pages

1. Create a new GitHub repository and upload the **contents** of this folder.
2. In the repository, open **Settings → Pages**.
3. Set the source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.

The page is plain HTML, CSS, and JavaScript; it has no build step or server dependency. Smooth scrolling uses Lenis (MIT), vendored at `assets/vendor/lenis.min.js`; without it the page falls back to native scrolling. Manrope and DM Mono load from Google Fonts when a network connection is available, with local system fallbacks otherwise.

## Before publishing a new event edition

- Update the event date and location in `index.html`.
- Update the `data-target` date on `.hero-countdown` in `index.html` using an ISO timestamp with the correct timezone.
- Bump the `?v=` date on the `styles.css` and `app.js` links in `index.html` whenever you publish changes, so browsers fetch the new files instead of cached copies.
- Replace the registration `mailto:` link with the event's real registration URL or form.
- Replace the photos in `assets/images/` and keep their filenames or update the references in `index.html`.

The countdown displays an ended state after the configured event date passes.
