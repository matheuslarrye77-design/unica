import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyStoredAppearance } from '@/lib/appearance'
import './index.css'
import App from './App.tsx'

applyStoredAppearance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
