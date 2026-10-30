import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './App'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Leave from './pages/Leave'
import PrintLeave from './pages/PrintLeave'
import CalendarPage from './pages/Calendar'
import Reports from './pages/Reports'
import Logs from './pages/Logs'
import Settings from './pages/Settings'

// HashRouter: the packaged app loads from file://, where history-API routes would 404.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employees/:id" element={<EmployeeDetail />} />
          <Route path="leave" element={<Leave />} />
          <Route path="leave/:id/print" element={<PrintLeave />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>
)
