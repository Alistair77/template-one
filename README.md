# Design India Forward Forum: Pune Edition

A standalone, responsive event microsite for the Design India Forward Forum, Pune Edition (13 November 2026), presented by Krion and Autodesk, executed by Biz-ora. It is built as a reusable template for other event editions.

## Preview locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Add `?theme=blue` or `?theme=magenta` to the address to preview another colour set.

## Publish with GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Set the source to **Deploy from a branch**, choose `main` and `/ (root)`, then save.

The page is plain HTML, CSS and JavaScript, with no build step or server dependency. Smooth scrolling uses Lenis (MIT), vendored at `assets/vendor/lenis.min.js`; without it the page falls back to native scrolling. Icons are from Phosphor (MIT) and are embedded in `index.html`. Manrope and DM Mono load from Google Fonts, with system fonts as a fallback.

## Change the colours

- **Use a ready-made set:** change `data-theme` on the `<html>` tag in `index.html` to `krion` (charcoal and yellow), `blue` or `magenta`.
- **Make a new set:** copy one of the `[data-theme="…"]` blocks at the top of `styles.css`, give it a new name and edit its values. Every colour on the page comes from those few tokens.

## Set up a new event edition

Everything event-specific in `index.html` is marked with an `EVENT:` comment.

1. **Name, city and date:** the `<title>` and description, the hero, the menu panel, the agenda date card, the register section and the footer.
2. **Countdown:** the `data-target` on `.hero-countdown`, as an ISO time with timezone (for example `2026-11-13T08:45:00+05:30`). After that time it shows the "took place" message instead.
3. **Registration link:** the header, hero and register buttons. They currently open an email to events@bizoramedia.com; replace them with the real registration URL.
4. **Partner logos:** the "Presented by" block at the top of the hero (delete it to hide the logos), the strip inside the hero under the buttons, and the "Brought to you by" section. Logos live in `assets/logos/`; use a `-on-dark` version on dark backgrounds.
5. **Speakers:** copy the example card in the speakers section for each speaker. Portraits are 4:5, about 600 × 750 px, and show in greyscale.
6. **Agenda:** one `<li class="session">` per session in the timeline.
7. **Brochure:** replace `assets/design-india-forward-pune-brochure.pdf` and update the two links to it.
8. **Publish:** bump the `?v=` date on the `styles.css` and `app.js` links so browsers fetch the new files instead of cached copies.
