import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import App from './App'
import './index.css'

// A new deploy installs in the background on launch and takes over this page
// (autoUpdate), but the page itself is still the old build until it reloads —
// so reload once when that happens. Not on the very first install, when there
// was no previous version to replace. Workout state is saved, so nothing is lost.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
