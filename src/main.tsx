import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './store/theme' // initializes theme before first render
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
