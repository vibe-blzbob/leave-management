# SPEC-modal-overflow-dropdowns: Allow Modal Dropdowns to Overlap Modal Boundaries

## 1. Problem Analysis
The shared `Modal` component in `lib.tsx` enforces `overflow-y-auto` on both the outer `.card` container and the inner content wrapper (`div.flex-1.overflow-y-auto`).
When a combobox / searchable dropdown (such as `SearchSelect`) renders its menu with `position: absolute`, the modal clips the menu or creates nested vertical scrollbars within the modal rather than letting the dropdown float cleanly over the modal edges.

## 2. Technical Solution
- **`Modal` Prop Extension (`lib.tsx`)**:
  - Add optional prop: `overflowVisible?: boolean` (defaults to `false` for standard scrolling dialogs).
  - When `overflowVisible: true`:
    - Apply `overflow-visible` to `.card` instead of `overflow-y-auto`.
    - Apply `overflow-visible` to `div.flex-1` instead of `overflow-y-auto`.
- **Application in Print Leave Card Modal (`Reports.tsx`)**:
  - Add `overflowVisible` to `<Modal title="Print Employee's Leave Card (CSC Form)" ... overflowVisible>`.
  - The Department and Employee dropdown menus (`absolute z-50 left-0 right-0 mt-1`) now float outside and overlap the modal borders without causing clipping or scrollbars.

## 3. Verification
- `npm run typecheck`: Verify TypeScript passes with no type errors.
- UI inspection: Open the Print Leave Card modal, open Department and Employee dropdowns, verify they float over the modal edges smoothly without internal scrollbars.

