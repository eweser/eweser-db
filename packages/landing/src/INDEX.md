# Landing Source

## Plain English

This source root contains the landing site's pages, layouts, and styles.

## Owns

- Landing-page source files, layouts, and visual presentation for the
  marketing site.

## Start Here

- [`pages/`](./pages/): Page routes, including the `docs/` user documentation
  section.
- [`layouts/`](./layouts/): Shared Astro layout wrappers, including
  `DocsLayout.astro` for documentation pages.
- [`styles/`](./styles/): Landing styles when present.

## Children

- [`layouts/`](./layouts/): Shared layout files.
- [`pages/`](./pages/): Route/page files when present.
- [`styles/`](./styles/): Site styles when present.
- [`lib/`](./lib/): Shared page data, such as the docs navigation.

## Key Contracts

- Keep current product copy aligned with `README.md` and `ARCHITECTURE.md`.
- Docs pages describe shipped behavior only. Verify against the code before
  adding a claim, and add the route to `lib/docs-nav.ts` so the sidebar and the
  in-app "Learn more" links stay in step.
- Visual assets live in `public` unless the build tool requires imports.

## Update Triggers

- Update when source folders, landing routes, layouts, copy ownership, docs
  pages, or build commands change.

## Testing

- `npm run build --workspace @eweser/landing`: Builds landing output.
