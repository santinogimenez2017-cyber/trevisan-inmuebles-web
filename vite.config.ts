import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// GTM (Módulo D): with a valid VITE_GTM_ID the container id is injected into index.html; without
// one, the <noscript> iframe is stripped and the head snippet receives '' (it exits immediately).
function gtmPlugin(): Plugin {
  let id = ''
  return {
    name: 'trevisan-gtm',
    configResolved(config) {
      const raw = loadEnv(config.mode, config.root, 'VITE_').VITE_GTM_ID?.trim() ?? ''
      id = /^GTM-[A-Z0-9]+$/.test(raw) ? raw : ''
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const out = id ? html : html.replace(/<noscript><iframe[^>]*googletagmanager[^>]*><\/iframe><\/noscript>/, '')
        return out.replaceAll('%VITE_GTM_ID%', id)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gtmPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
