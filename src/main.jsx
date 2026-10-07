import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const ErpApp = lazy(() => import('./ErpApp.jsx'))

// Two separate applications, linked only through shared data:
//   /      → Shopfloor Weighing Desk (Sayali Madam, no login)
//   /erp   → Production ERP (login required)
const isErp = window.location.pathname.replace(/\/+$/, '').toLowerCase() === '/erp'

document.title = isErp
  ? 'AUTOTURN ERP • Production Planning & Changeover'
  : 'AUTOTURN ERP • Shopfloor Weighing Desk'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isErp ? (
      <Suspense fallback={<div className="ax-boot">Loading Production ERP…</div>}>
        <ErpApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
