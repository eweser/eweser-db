# React Native Example Source

## Plain English

This source root contains the React Native example app and mobile UI helpers.

## Owns

- Mobile app component, login/status UI, config, and styles.

## Start Here

- [`AppReactNative.tsx`](./AppReactNative.tsx): Main app component.
- [`LoginButton.tsx`](./LoginButton.tsx): Mobile login UI.
- [`StatusBar.tsx`](./StatusBar.tsx): Status display.
- [`config.ts`](./config.ts): Example configuration.
- [`styles.ts`](./styles.ts): Shared styles.

## Children

- [`AppReactNative.tsx`](./AppReactNative.tsx): Main app component.
- [`LoginButton.tsx`](./LoginButton.tsx): Login component.
- [`StatusBar.tsx`](./StatusBar.tsx): Status component.
- [`config.ts`](./config.ts): Config helpers.
- [`styles.ts`](./styles.ts): Styles.

## Key Contracts

- Keep mobile config explicit and compatible with SDK local-first behavior.

## Update Triggers

- Update when app flow, config, login/status UI, or styles change.

## Testing

- `npm run web --workspace @eweser/example-react-native`: Starts Expo web for
  manual testing.
