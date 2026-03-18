import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './globals.css'
import { getApiBaseUrl } from './lib/constants'

// Intercept fetch requests to redirect /.well-known/ to the API domain
const originalFetch = window.fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url || input.toString()

  if (url.includes('/.well-known/')) {
    const apiDomain = getApiBaseUrl()
    const wellKnownPath = url.split('/.well-known/')[1]
    const redirectUrl = `${apiDomain}/.well-known/${wellKnownPath}`
    return originalFetch(redirectUrl, init)
  }

  return originalFetch(input, init)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
