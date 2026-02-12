# Syncing from Upstream (Mercur Vendor Panel)

This repo is the vendor panel from the Mercur marketplace (v1.5.1). To pull in upstream changes while keeping TESE-specific customizations, use this guide.

## Remotes

- `origin` – your TESE fork.
- `upstream` – add the original Mercur vendor panel repo, e.g.:
  ```bash
  git remote add upstream <mercur-vendor-panel-repo-url>
  ```

## Merge workflow

1. Fetch and merge:
   ```bash
   git fetch upstream
   git merge upstream/main
   ```
   (Use the branch name upstream uses.)

2. Resolve conflicts. Keep or re-apply the **customizations** listed below.

## TESE customizations to preserve

- **Listing type (Product / Service)**
  - `src/routes/products/product-create/` – create product form and schema (e.g. `constants.ts`, product create form, general section) including `listing_type` and service fields.
  - `src/routes/products/product-edit/` – edit product form and schema including `listing_type`, `request_quote_only`, `duration_text`, `booking_url`.
- **Sidebar** – “Products & Services” label (or equivalent) in navigation/sidebar.
- **Favicon / logo** – `index.html` favicon, and any avatar/fallback images (e.g. `public/favicon.png`, `public/logo-icon.png`).
- **Service metadata fields** – “Request quote only”, “Duration”, “Booking / schedule link” in product create and edit when listing type is Service.

## Tips

- Service-related fields are stored in product `metadata`; avoid changing core product schema in ways that conflict with upstream.
