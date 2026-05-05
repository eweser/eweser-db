# Landing Source

## Plain English

This source root contains the landing site's pages, layouts, and styles.

## Owns

- Landing-page source files, layouts, and visual presentation for the
  marketing site.

## Start Here

- [`pages/`](./pages/): Page routes when present.
- [`layouts/`](./layouts/): Shared Astro layout wrappers.
- [`styles/`](./styles/): Landing styles when present.

## Children

- [`layouts/`](./layouts/): Shared layout files.
- [`pages/`](./pages/): Route/page files when present.
- [`styles/`](./styles/): Site styles when present.

## Key Contracts

- Keep current product copy aligned with `README.md` and `ARCHITECTURE.md`.
- Visual assets live in `public` unless the build tool requires imports.

## Update Triggers

- Update when source folders, landing routes, layouts, copy ownership, or
  build commands change.

## Testing

- `npm run build --workspace @eweser/landing`: Builds landing output.
