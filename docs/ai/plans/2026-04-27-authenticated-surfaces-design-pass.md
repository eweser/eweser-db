## Goal

Define the first authenticated product surfaces for EweserDB and establish the visual and information-architecture pattern that the rest of the app should follow.

This pass starts after the landing page story shift. The aim is to make the real product feel as strong and legible as the manifesto: owned data, visible control, interoperable apps, and scoped MCP access.

## Scope

In:

- Authenticated product surface order
- Core purpose of each screen
- Design principles for app-like UIs
- Exact role of the first screen: Personal Data Home

Out:

- Full implementation specs
- Mobile variants
- Edge-state coverage for every flow

## Screen Order

1. Personal Data Home
2. Connected Apps and Permissions
3. MCP / AI Access
4. Login and Auth

This order is intentional.

Personal Data Home is the anchor screen because it explains the product model in operational form. Once that screen works, Apps, MCP, and Auth can all inherit its hierarchy and tone.

## Product UI Principles

- The app should feel like a control plane, not a generic workspace.
- Ownership should be visible in the structure of the screen, not only in marketing copy.
- The UI should feel calm and competent even when the brand language is defiant.
- App and agent access should read as scoped guests around a user-owned center.
- Notes should appear as one collection or app surface inside a larger ecosystem, not as the whole product.

## Personal Data Home

### Purpose

Give the user one calm, high-trust home for their data layer.

### Must communicate on first view

- This is the place where the user owns the underlying system
- Collections, schemas, sharing, recovery, and permissions belong together
- Apps and MCP clients connect into this layer instead of owning it

### Recommended content blocks

- Authenticated header
- Control-plane hero / overview
- Storage, rooms, permissions, and recovery summary
- Collections table or list
- Connected apps summary
- MCP / agent grants summary
- Schema and sync status
- Sharing and recovery controls

### Tone

The top of the screen can still carry the punk / sovereignty voice, but the operational area should be quieter and more dashboard-like. The user should feel powerful, not overwhelmed.

## Next Screens

### Connected Apps and Permissions

Focus on installed apps, requested scopes, recent access, revoke controls, and trust language.

### MCP / AI Access

Focus on clients, scopes, grants, audit visibility, and clear local-versus-shared boundaries.

### Login and Auth

Focus on trust, entry, session control, and account verification. This should inherit the system rather than define it.

## Execution Note

The current Figma screens for this pass are:

- `04 Authenticated Surfaces` -> `Personal Data Home / Desktop 1440`
- `04 Authenticated Surfaces` -> `Connected Apps and Permissions / Desktop 1440`

The first frame establishes the control-plane pattern.

The second frame shifts the emphasis from ownership of collections to ownership of app access:

- installed apps
- scoped grants
- visible recent access
- revoke and downgrade flows

These two frames together should define the visual and product language for the upcoming MCP and Auth screens.
