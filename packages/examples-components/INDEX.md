# @eweser/examples-components

## Plain English

This package provides shared React UI components and styles used by EweserDB
examples.

## Owns

- Reusable example UI components such as login/status controls and the Eweser
  icon.
- Bundled CSS and package exports for examples.

## Start Here

- [`package.json`](./package.json): Published package scripts and peer
  dependencies.
- [`src/INDEX.md`](./src/): Source navigation map.
- [`src/components/index.ts`](./src/components/index.ts): Component barrel
  export.

## Children

- [`src/`](./src/): React components, helper functions, styles, and env types.
- [`public/`](./public/): Static package assets.

## Key Contracts

- This is a published package; public API or behavior changes require a
  changeset.
- Components should remain framework-light and reusable by examples.

## Update Triggers

- Update when component exports, styles, peer dependencies, package output, or
  public API behavior changes.

## Testing

- `npm test --workspace @eweser/examples-components`: Runs package tests when
  present.
- `npm run build --workspace @eweser/examples-components`: Builds ESM/UMD/CSS.
