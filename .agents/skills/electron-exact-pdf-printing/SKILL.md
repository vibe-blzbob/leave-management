---
name: electron-exact-pdf-printing
description: >-
  Guides implementation of pixel-perfect, exact-dimension multi-page PDF generation
  and printing in Electron and React/web applications (e.g. official government forms,
  CSC Form No. 6, Philippine Folio 8.5x13, A4, certificates). Use when configuring
  webContents.printToPDF, designing WYSIWYG print previews, fixing print CSS clipping,
  eliminating spillover blank pages, removing dark backgrounds, or structuring formal
  form tables and signature clearance.
---

# Electron Exact-Dimension PDF Printing & Form Layout

A complete runbook for generating exact-dimension, multi-page, publication-grade PDFs directly from Electron and web apps without clipping, background pollution, or layout drift between screen and paper.

---

## 1. Core Architecture: Single-Window WYSIWYG

Do **not** create a hidden offscreen window or secondary browser route just for PDF rendering. Rendering in a second window duplicates routing, state, and authentication logic.

Instead, structure the on-screen preview component so that:
1. The on-screen canvas matches the exact target dimensions (`width` and `height` in inches or millimeters).
2. Printing media styles (`@media print`) strip the app chrome, toolbars, and background colors.
3. Electron's `win.webContents.printToPDF()` captures the active window directly.

---

## 2. Electron Main Process (`printToPDF`)

In the Electron main process IPC handler:

```typescript
import { ipcMain, BrowserWindow, shell, app } from 'electron'
import fs from 'fs'
import path from 'path'

ipcMain.handle('print-to-pdf', async (event, options?: { filename?: string }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) throw new Error('No window found')

  // Philippine Folio / Legal is 8.5 x 13 inches
  // For A4: { width: 8.27, height: 11.69 }
  // For US Letter: { width: 8.5, height: 11 }
  const pdfBuffer = await win.webContents.printToPDF({
    pageSize: { width: 8.5, height: 13 },
    margins: { marginType: 'none' }, // CRITICAL: disables Chromium's 0.25in default margin
    printBackground: true,
    preferCSSPageSize: true
  })

  // Save to temporary file and open in system viewer
  const tempPath = path.join(
    app.getPath('temp'),
    options?.filename || `document-${Date.now()}.pdf`
  )
  await fs.promises.writeFile(tempPath, pdfBuffer)
  await shell.openPath(tempPath)

  return { success: true, path: tempPath }
})
```

### Critical Flags
- **`margins: { marginType: 'none' }`**: If omitted, Chromium applies a default `0.25in` margin to all edges. This shifts your content down and right, pushing the bottom of a full-page form onto a blank spillover page.
- **`printBackground: true`**: Required to print table header background fills, checkbox ticks, and border accents.
- **`preferCSSPageSize: true`**: Respects `@page { size: ... }` defined in CSS.

---

## 3. Print CSS Specification (`@media print`)

In your global stylesheet (e.g., `main.css`):

```css
/* Exact page size definition matching target paper */
@page {
  size: 8.5in 13in; /* e.g. Folio 8.5x13, A4, or Letter */
  margin: 0;        /* Zero hardware margin */
}

@media print {
  /* 1. Neutralize viewport & container wrappers */
  html,
  body,
  #root,
  .app-container {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    box-shadow: none !important;
  }

  /* 2. Hide all preview chrome, sidebars, buttons */
  .no-print,
  nav,
  header,
  .print-controls {
    display: none !important;
  }

  /* 3. Force exact page boundary and page breaks */
  .cs-page {
    width: 8.5in !important;
    height: 13in !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    background: #ffffff !important;
    break-after: page !important;
    page-break-after: always !important;
    box-sizing: border-box !important;
  }

  /* Prevent trailing blank page */
  .cs-page:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }
}
```

> [!IMPORTANT]
> **Never override inner padding or font sizes in `@media print`**. Keep `.cs-page` inner padding (e.g. `p-6` or `p-8`) and typography identical across screen preview and print so what the user sees is 100% true to the resulting PDF.

---

## 4. Preview Component Structure (React)

```tsx
export function DocumentPrintView() {
  return (
    <div className="w-full py-8 px-2 flex flex-col items-center print:p-0 print:block">
      {/* Printable Sheet 1 */}
      <div
        className="cs-page cs-page-1 p-6 text-[10px] leading-[1.28] text-black bg-white shadow-2xl flex flex-col justify-between"
        style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
      >
        <div>
          {/* Header & Body Content */}
        </div>
      </div>

      {/* Printable Sheet 2 (Duplex Back Page) */}
      <div
        className="cs-page cs-page-2 p-8 text-[8pt] leading-[1.28] text-black bg-white shadow-2xl flex flex-col justify-between"
        style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
      >
        <div>
          {/* Instructions / Back Page Content */}
        </div>
      </div>
    </div>
  )
}
```

---

## 5. Formal Form Grid Rules (Government / CSC Form Standards)

When laying out official forms (like Civil Service Form No. 6):

### Rule 1: Use Native Tables with `colSpan` Instead of Floating Grids
CSS `grid-cols-2` inside a `<td>` lacks true vertical cell borders and breaks column alignment. Use a native `<table>` with a shared column budget:

```tsx
<table className="w-full border-2 border-black border-collapse text-[10px]">
  <tbody>
    {/* Row 1: Two equal halves */}
    <tr className="border-b border-black">
      <td colSpan={2} className="w-1/2 border-r border-black p-1 align-top">
        <span className="font-bold">1. OFFICE/DEPARTMENT:</span>
        <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{dept}</div>
      </td>
      <td colSpan={2} className="w-1/2 p-1 align-top">
        <span className="font-bold">2. NAME :</span>
        <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{name}</div>
      </td>
    </tr>

    {/* Row 2: Left half remains 50%, right half splits into 25% + 25% */}
    <tr className="border-b-2 border-black">
      <td colSpan={2} className="w-1/2 border-r border-black p-1 align-top">
        <span className="font-bold">3. DATE OF FILING:</span>
        <div className="font-semibold text-slate-900 mt-0.5 pl-2">{date}</div>
      </td>
      <td className="w-1/4 border-r border-black p-1 align-top">
        <span className="font-bold">4. POSITION:</span>
        <div className="font-semibold text-slate-900 uppercase mt-0.5 pl-2">{position}</div>
      </td>
      <td className="w-1/4 p-1 align-top">
        <span className="font-bold">5. SALARY:</span>
        <div className="font-semibold text-slate-900 mt-0.5 pl-2">{salary || '_______________'}</div>
      </td>
    </tr>
  </tbody>
</table>
```

### Rule 2: Signature Block Clearance
Physical ink signatures and dry seals need vertical breathing room.
- Apply `pt-8` to `pt-10` (32px – 40px / 0.35in – 0.45in) padding top on the signature cell.
- Ensure the name line has a clear solid underline (`border-b-2 border-black`) with `w-56` or `w-80 mx-auto`.
- Position and title should follow immediately below with tight vertical spacing (`text-[10px] uppercase font-bold`).

---

## 6. Common Pitfalls & Quick Fixes

| Symptom | Root Cause | Fix |
|---|---|---|
| **Black or dark PDF background** | Preview container has `bg-slate-950` or dark theme, and `printBackground: true` captures it. | Add `html, body, #root { background: white !important }` in `@media print`, or add `print:bg-white` to the wrapper. |
| **Spilling onto extra page** | Print margins (`marginType: 'default'`) or destructive `.cs-page { height: auto }` in print CSS. | Set `margins: { marginType: 'none' }` in `printToPDF` and keep fixed `.cs-page { height: 13in }`. |
| **Borders missing on print** | Tailwind utility `border` without explicit black color or print media stripping light borders. | Use `border-black` or `border-slate-950` and ensure `printBackground: true` is enabled. |
| **Misaligned vertical grid lines** | Using flex or div grids across stacked rows. | Use single unified `<table>` with `colSpan` so column lines match mathematically across rows. |
| **Signatures overlapping content** | Insufficient padding in table cell above signature line. | Change signature cell padding to `pt-9 pb-2.5 px-3`. |

