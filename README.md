# Amar Bazar — local market, delivered

Amar Bazar is a responsive, static pilot storefront for ordering food, groceries, and everyday essentials from participating shops around Amishapara Bazar. The pilot demonstrates how a local team can check shop availability, confirm the final total with the customer, and then arrange delivery.

## Preview

The site is deployed with GitHub Pages. Once Pages is enabled for the repository, every push to `main` automatically publishes the latest version.

## Run locally

Open `index.html` in a browser. The project is plain HTML, CSS, and JavaScript; it has no build step or package installation.

## Pilot features

- Browse local shops, categories, and product listings.
- View restaurant menus by section and add items to a cart.
- Select a delivery area and see the pilot delivery charge included in the order estimate.
- Submit an order request, then follow the shop-check and customer-approval steps before preparation.
- Use the local staff preview to record availability and revised item prices.
- Open the delivery-area map, share device location, or contact the team through the configured phone and WhatsApp links.
- Open the separate delivery-rider information page at `rider.html`.

## Update and publish

1. Edit the site files in this repository. Product and menu data are maintained in `app.js`; styles are in `styles.css` and `rider.css`.
2. Save the changes, then commit and push them to the `main` branch.
3. The **Deploy static site to GitHub Pages** workflow runs automatically after each push. When it finishes, GitHub Pages serves the new version at the repository's Pages URL.

To publish a new version in VS Code, use the Source Control panel: review the changed files, enter a short commit message, commit, then select **Sync Changes** or **Push**. The automatic deployment starts after the push reaches GitHub.

To enable Pages the first time, open **Settings → Pages** in the GitHub repository and choose **GitHub Actions** as the build and deployment source. The workflow is already included in `.github/workflows/deploy.yml`.

## Project files

- `index.html` — customer-facing storefront.
- `app.js` — product, shop, delivery-area, cart, order, and staff-preview behavior.
- `styles.css` — storefront layout and responsive styles.
- `rider.html` and `rider.css` — rider information page.
- `assets/` — brand artwork, food photography, generated delivery imagery, and font files.
- `.github/workflows/deploy.yml` — automatic GitHub Pages deployment on pushes to `main`.

## Pilot data and production readiness

This is a front-end pilot, not a production ordering service. Cart and order records are stored in the current browser's local storage; staff actions are not shared across devices and there is no authentication or server-side database. Do not enter real customer information.

Before taking real orders, verify all shop participation, menu items, prices, delivery areas and fees, phone/WhatsApp links, opening hours, map pins, and delivery promises. The photos are illustrative. Add a secure backend, staff authentication, privacy and data-retention rules, and operational monitoring before a public commercial launch.
