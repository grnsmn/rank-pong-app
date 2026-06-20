import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Registrazione automatica del service worker per supportare offline e installazione
if ('serviceWorker' in navigator) {
	registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
)
