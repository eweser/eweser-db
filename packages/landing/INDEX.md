# @eweser/landing

## Plain English

This package is the EweserDB landing site workspace.

## Owns

- Public marketing pages, static assets, and landing-site build configuration.

## Start Here

- [`package.json`](./package.json): Landing app scripts.
- [`src/INDEX.md`](./src/): Source navigation map.

## Children

- [`src/`](./src/): Landing site source.
- [`public/`](./public/): Static landing assets.

## Key Contracts

- Landing pages should stay aligned with current product positioning and package
  names.
- Do not treat landing copy as architecture or API documentation.

## Update Triggers

- Update when landing page structure, build tooling, public assets, or scripts
  change.

## Testing

- `npm run build --workspace @eweser/landing`: Builds the landing site.
- `npm run code-index:check`: Validates landing indexes.
