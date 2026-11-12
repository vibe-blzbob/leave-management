# SPEC-searchable-report-dropdowns: Searchable Dropdowns for Leave Card Modal

## 1. Objective
Replace the static `<select>` elements for Department and Employee in the Print Leave Card modal (`Reports.tsx`) with searchable popover dropdowns, enabling quick filtering and selection across large departments and employee rosters.

## 2. Requirements & UI Behavior
- **Department Search Dropdown (`cardDept`)**:
  - Activated when `cardScope === 'department'`.
  - Trigger button shows current selection or `"All Departments (All Employees)"`.
  - Popover contains an autofocus search input.
  - Options list includes an explicit `"All Departments (All Employees)"` choice at the top, followed by alphabetized department names matching the search query.
- **Employee Search Dropdown (`cardEmpId`)**:
  - Activated when `cardScope === 'employee'`.
  - Trigger button shows selected employee name & department or `"Select Employee…"`.
  - Popover contains an autofocus search input that filters across employee name and department.
  - Displays alphabetized active employees matching the query.
- **Interaction & Dismissal**:
  - Clicking outside the popover (backdrop) dismisses the dropdown and resets the search input.
  - Selecting an option updates state and dismisses the dropdown.
  - Retains dark theme styling (`bg-slate-900 border-slate-700 text-slate-200`) consistent with existing `EmployeeFilter` in `Reports.tsx`.

## 3. Verification
- `npm run typecheck`: Run TypeScript verification for both node and web renderer contexts.
- Verify seamless filtering, option selection, and report generation in the UI.

