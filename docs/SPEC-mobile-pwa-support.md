# SPEC-mobile-pwa-support: Progressive Web App & Mobile Support

## 1. Objective
Enable Leave Management to run seamlessly on Android and iOS devices as a mobile-responsive Progressive Web App (PWA) with "Add to Home Screen" support, responsive navigation, and standalone browser storage.

## 2. Technical Requirements
- **Viewport & PWA Meta (`index.html`)**:
  - Add `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />`.
  - Add Apple mobile tags: `<meta name="apple-mobile-web-app-capable" content="yes" />`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`, `<meta name="theme-color" content="#020617" />`.
  - Link `manifest.webmanifest` defining app name (`LeaveDesk`), standalone display mode, background color, and icons.
- **Mobile Responsive Layout (`App.tsx`)**:
  - Desktop: Retain current persistent sidebar (`hidden md:flex w-56`).
  - Mobile: Display a compact top header with branding and a hamburger menu button that opens a slide-over navigation drawer.
- **Data Persistence**:
  - Continue utilizing existing `window.api || browserApi` fallback in `lib.tsx`, storing employee records and leave requests in `localStorage` on mobile devices.
- **Build & Development Tooling (`package.json`, `vite.config.ts`)**:
  - Add `"build:web": "npm run typecheck:web && vite build"` and `"preview:web": "vite preview"` to allow deploying to Netlify/Vercel or testing locally over phone browser.
  - Set build output directory to `out/web` in `vite.config.ts`.

## 3. Verification
- `npm run typecheck:web`: Verify TypeScript compilation.
- `npm run build:web`: Verify standalone static web bundle generation.
- Responsive check: Test mobile viewport resizing, hamburger menu drawer navigation, and standalone PWA manifest syntax.

