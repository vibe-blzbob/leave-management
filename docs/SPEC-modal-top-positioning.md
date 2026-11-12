# SPEC-modal-top-positioning: Global Top-Biased Modal Placement

## 1. Problem
Modals across the application were vertically centered using `items-center my-auto`.
For dialogs containing interactive elements (such as searchable comboboxes, dropdowns, and date pickers), vertical dead-centering positions the bottom of the modal close to the bottom viewport boundary, causing downward-opening popovers to crowd or clip against the bottom edge of the screen.

## 2. Technical Solution
- In `lib.tsx`, adjust the shared `Modal` overlay layout:
  - Change flex alignment from `items-center` to `items-start justify-center`.
  - Add responsive top padding: `pt-10 sm:pt-14 md:pt-16 pb-10`.
  - Replace `my-auto` on `.card` with `mb-auto` to anchor modals consistently higher in the viewport while retaining bottom margin clearance.
  - Retain `max-h-[calc(100vh-6rem)]` on the card to ensure that tall modal dialogs remain scrollable on smaller screens.
- This automatically applies to all modals across the app (`LeaveForm`, `BalanceModal`, Print Leave Card modal, etc.).

## 3. Verification
- `npm run typecheck`: Verify TypeScript passes.
- Visual check: All modals render higher up on the screen with generous downward clearance for dropdowns and popovers.

