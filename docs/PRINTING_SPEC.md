# LeaveDesk Print & PDF Generation Specification

This document specifies the exact standard architecture and template for creating printable forms and reports in LeaveDesk. Any new printable report (e.g. Service Records, Certificates of Leave Credits, Daily Time Records) must follow this exact pattern.

---

## 1. Core Architecture

LeaveDesk uses a **Single-Window WYSIWYG Canvas** pipeline:
1. **On-Screen Preview:** The component renders exact real-world dimensions (in inches or millimeters) with white sheet paper on a dark backdrop (`bg-slate-950`).
2. **Chromium Print Extraction:** Clicking "Generate PDF" calls `api.printToPdf(filename, { landscape?: boolean })`. Electron's `win.webContents.printToPDF()` captures the active window without opening background windows.
3. **Zero Hardware Margin:** `@page { margin: 0 }` + `margins: { top: 0, bottom: 0, left: 0, right: 0 }` prevents Chromium default 0.25in margin shifts that push content onto accidental extra blank pages.
4. **Auto-Open:** The backend writes the PDF buffer to the OS temp folder and immediately opens it via `shell.openPath(tempPath)`.

---

## 2. Global CSS Base (`src/renderer/src/assets/main.css`)

The print styles must define zero base margin and ensure clean page breaks:

```css
@media print {
  @page {
    margin: 0;
  }
  html,
  body,
  #root,
  .h-screen,
  main {
    background: white !important;
    color: black !important;
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    padding: 0 !important;
    margin: 0 !important;
    display: block !important;
  }
  .no-print {
    display: none !important;
  }
  .cs-page {
    box-shadow: none !important;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
  }
  .cs-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
}
```

---

## 3. Main Process IPC Handler (`src/main/db.ts`)

Electron's IPC handler must accept orientation and enforce `preferCSSPageSize`:

```typescript
if (method === 'printToPdf') {
  const opts = (args[1] || {}) as { landscape?: boolean }
  const isLandscape = Boolean(opts.landscape)
  const buffer = await event.sender.printToPDF({
    landscape: isLandscape,
    pageSize: isLandscape ? { width: 13, height: 8.5 } : { width: 8.5, height: 13 },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true,
    preferCSSPageSize: true
  })
  const name = String(args[0] || 'report').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
  const pdfPath = join(app.getPath('temp'), `${name}-${Date.now()}.pdf`)
  writeFileSync(pdfPath, buffer)
  await shell.openPath(pdfPath)
  return
}
```

---

## 4. Standard Paper Dimensions

| Paper Format | Orientation | CSS `@page { size }` | Sheet `style` | Electron `pageSize` |
|---|---|---|---|---|
| **Folio (Philippine Standard)** | Portrait | `8.5in 13in` | `width: 8.5in; height: 13in;` | `{ width: 8.5, height: 13 }` |
| **Folio (Philippine Standard)** | Landscape | `13in 8.5in` | `width: 13in; height: 8.5in;` | `{ width: 13, height: 8.5 }` |
| **A4** | Portrait | `8.27in 11.69in` | `width: 8.27in; height: 11.69in;` | `'A4'` or `{ width: 8.27, height: 11.69 }` |
| **US Letter** | Portrait | `8.5in 11in` | `width: 8.5in; height: 11in;` | `'Letter'` or `{ width: 8.5, height: 11 }` |

> [!CAUTION]
> Never put `!important` inside `@page { size: ... }`. The W3C CSS Paged Media spec forbids `!important` in `@page` rules, and Chromium will completely ignore the rule if `!important` is present.

---

## 5. Copy-Paste Component Template

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errMsg } from '../lib'
import maguindanaoLogo from '../assets/maguindanao_del_norte.jpg'
import bangsamoroLogo from '../assets/bangsamoro.png'

export default function StandardPrintReport(): React.JSX.Element {
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)

  const handlePrintPdf = async (): Promise<void> => {
    setGenerating(true)
    try {
      // Pass { landscape: true } if target format is landscape
      await api.printToPdf('report-name', { landscape: false })
    } catch (e) {
      alert(errMsg(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center print:min-h-0 print:bg-white print:block">
      {/* 1. STICKY TOP TOOLBAR (Hidden during print) */}
      <header className="no-print sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              ← Back
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">
                Report Title
              </h1>
              <p className="text-[11px] text-slate-400">Subtitle / Target Scope</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn text-xs py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30"
              onClick={handlePrintPdf}
              disabled={generating}
            >
              {generating ? '⏳ Generating PDF…' : '📄 Generate PDF (8.5 × 13)'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. SCOPED PAGE SIZE INJECTION */}
      <style>{`
        @page {
          size: 8.5in 13in;
          margin: 0;
        }
      `}</style>

      {/* 3. PRINT CANVAS CONTAINER */}
      <div className="w-full py-8 px-2 flex justify-center overflow-auto print:p-0 print:overflow-visible print:block">
        <div className="cs-form-printable flex flex-col gap-10 items-center print:block" style={{ width: '8.5in' }}>
          
          {/* 4. PRINTABLE SHEET (Repeated for multi-page/batch reports) */}
          <div
            className="cs-page p-6 text-[10px] leading-tight text-black bg-white shadow-2xl flex flex-col justify-between select-text"
            style={{ width: '8.5in', height: '13in', boxSizing: 'border-box' }}
          >
            <div>
              {/* Official Provincial Header */}
              <div className="relative flex items-center justify-between mb-2 pb-1 border-b border-black">
                <img
                  src={maguindanaoLogo}
                  alt="Province of Maguindanao del Norte"
                  className="w-14 h-14 object-contain shrink-0"
                />
                <div className="text-center flex-1 px-4">
                  <div className="text-[9px] font-medium uppercase tracking-wider text-slate-700">
                    Republic of the Philippines
                  </div>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-slate-900">
                    PROVINCE OF MAGUINDANAO DEL NORTE
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-800">
                    OFFICE OF THE PROVINCIAL HUMAN RESOURCE MANAGEMENT OFFICER
                  </div>
                  <div className="inline-block border-b-2 border-black font-extrabold text-[13px] tracking-widest uppercase mt-0.5 px-3 pb-0.5">
                    FORM OR REPORT TITLE
                  </div>
                </div>
                <img
                  src={bangsamoroLogo}
                  alt="Bangsamoro Autonomous Region in Muslim Mindanao"
                  className="w-14 h-14 object-contain shrink-0"
                />
              </div>

              {/* Form Body / Native Table */}
              <table className="w-full border-collapse border-2 border-black text-[9px]">
                <thead>
                  <tr className="border-b border-black bg-slate-100 font-bold">
                    <th className="border border-black p-1 text-left">Column 1</th>
                    <th className="border border-black p-1 text-center">Column 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black h-[22px]">
                    <td className="border border-black p-1">Data 1</td>
                    <td className="border border-black p-1 text-center">Data 2</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Optional Signature Block at Bottom */}
            <div className="pt-4 flex justify-end">
              <div className="text-center w-64">
                <div className="font-bold border-b border-black pb-0.5 uppercase">Officer Name</div>
                <div className="text-[8.5px] text-slate-800">Designation / Title</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
```

---

## 6. Table Layout & Vertical Budgeting Rules

To prevent table rows from spilling over onto a second page:

1. **Calculate Usable Height:**
   $$\text{Usable Height} = \text{Sheet Height} - (2 \times \text{Padding Top/Bottom}) - \text{Header Height} - \text{Footer Height}$$
2. **For Folio Landscape ($13 \times 8.5\text{ in}$):**
   - Total Height = $8.5\text{ in} = 816\text{ px}$.
   - Padding (`p-5`) = $40\text{ px}$.
   - Header + Meta = $100\text{ px}$.
   - Usable Table Height = $676\text{ px}$.
   - For a 26-row table: Table Head ($64\text{ px}$) + 26 rows at $20\text{ px}$ each ($520\text{ px}$) = $584\text{ px}$, safely within the $676\text{ px}$ budget.
3. **Use Explicit Row Heights:** Assign fixed height classes (e.g. `h-[20px]` or `h-[22px]`) to table rows and truncate long text (`truncate max-w-[...]`) so unexpected text wraps don't expand row heights.
4. **Use Native `<table>` with `border-black`:** Do not use CSS grid/flex for form tables. Native tables with `border-collapse` and `border border-black` render crisp, mathematical gridlines across all printers.

---

## 7. External PDF Generation Libraries vs. Native Chromium `printToPDF`

| Evaluation Criteria | Native HTML/CSS + Chromium `printToPDF` | External PDF Engines (`pdfmake`, `jspdf`) |
|---|---|---|
| **Runtime Dependencies** | **0 kB** (Uses Electron's built-in Chromium rendering engine) | **~1.5 MB – 4 MB** (`pdfmake`, virtual font files, `jspdf`, `jspdf-autotable`) |
| **WYSIWYG Fidelity** | **100% Identical** (The React DOM rendered on screen is exactly what is printed) | **Dual Maintenance** (UI written in JSX; PDF written in proprietary JSON DSL or $(x,y)$ canvas coordinates) |
| **Styling & Typography** | **Standard CSS / Tailwind** (`border-collapse`, `colSpan`, `rowSpan`, `leading-tight`) | **Proprietary Styling DSL** (Custom font embedding, manual column measurement, rigid table cells) |
| **Complex CSC Forms** | **Native** (Seamless 18-column grids, dual provincial letterhead seals, signature clearances) | **Difficult** (Translating complex government tables and seals into imperative code is brittle) |
| **Hardware Page Sizes** | **Direct CSS `@page`** (`size: 8.5in 13in`, `size: 13in 8.5in`, zero margins) | **Custom Page Dimension Units** (Must manually define points/mm arrays and calculate printable margins) |

### Why Native HTML/CSS is Standard in LeaveDesk
1. **Zero Bundle Bloat:** Keeps the micro-installer lightweight (~13.4 MB) without adding megabytes of font definitions or external PDF binary bundlers.
2. **Single Source of Truth:** Any change to table columns, signatories, or layout is updated in one React JSX file and immediately reflected in both preview and printed PDF.
3. **Official Seals & Assets:** Logos (`.png`, `.jpg`) render at natural display DPI directly from Vite asset chunks.

---

## 8. When and How to Introduce External PDF Libraries

While native HTML/CSS `printToPDF` is the standard for all UI reports, external libraries should only be introduced under specific architectural conditions:

### Triggers to Add External Libraries
1. **Headless Background Workers:** Generating PDFs from a backend Node process without an active `BrowserWindow` or Chromium frame.
2. **Modifying Pre-Existing Static PDF Templates:** Filling out pre-flattened official government PDF files (use `pdf-lib` for AcroForms or binary overlay).
3. **Client-Side Browser-Only Mode without Native Print Dialog:** If LeaveDesk is deployed strictly as a web browser app where `window.print()` cannot run headlessly.

### Blueprint if External Generation is Required (`pdfmake`)
If a future requirement demands headless batch generation without DOM:

1. **Install dependency:**
   ```bash
   npm install pdfmake
   npm install --save-dev @types/pdfmake
   ```
2. **Structure a Dedicated Document Definition (`src/shared/pdf/leaveCardDef.ts`):**
   ```typescript
   import type { TDocumentDefinitions } from 'pdfmake/interfaces'

   export function createLeaveCardDef(empName: string, rows: any[]): TDocumentDefinitions {
     return {
       pageSize: { width: 936, height: 612 }, // 13 x 8.5 inches in points (72 pt/in)
       pageOrientation: 'landscape',
       pageMargins: [18, 18, 18, 18],
       content: [
         { text: "PROVINCE OF MAGUINDANAO DEL NORTE", style: 'header', alignment: 'center' },
         { text: "EMPLOYEE'S LEAVE CARD", style: 'subHeader', alignment: 'center' },
         { text: `NAME: ${empName}`, margin: [0, 8, 0, 4] },
         {
           table: {
             headerRows: 4,
             widths: [18, 120, 15, 15, 15, 35, 35, 45, 35, 120, 15, 15, 15, 35, 35, 45, 35, 90],
             body: [ /* 18-column header & rows */ ]
           }
         }
       ]
     }
   }
   ```


