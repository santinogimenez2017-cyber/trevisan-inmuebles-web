import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Analytics ids: the ONLY place where VITE_GTM_ID and VITE_GA4_ID are read. Each one is validated by
// format and injected into index.html at build time (%VITE_GTM_ID% / %VITE_GA4_ID%). A missing or
// malformed id becomes '' and its snippet exits immediately, so nothing is ever loaded by mistake.
//   · GTM: container loader (+ <noscript> iframe, stripped when there is no id).
//   · GA4: direct gtag.js. Leave it empty if GA4 is configured inside the GTM container, to avoid
//     counting every event twice.
const ID_FORMAT = { VITE_GTM_ID: /^GTM-[A-Z0-9]+$/, VITE_GA4_ID: /^G-[A-Z0-9]+$/ } as const

function analyticsPlugin(): Plugin {
  const ids: Record<keyof typeof ID_FORMAT, string> = { VITE_GTM_ID: '', VITE_GA4_ID: '' }
  return {
    name: 'trevisan-analytics',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, 'VITE_')
      for (const key of Object.keys(ID_FORMAT) as (keyof typeof ID_FORMAT)[]) {
        const raw = env[key]?.trim() ?? ''
        if (raw && !ID_FORMAT[key].test(raw)) config.logger.warn(`[analytics] ${key}="${raw}" has an invalid format: ignored.`)
        ids[key] = ID_FORMAT[key].test(raw) ? raw : ''
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const out = ids.VITE_GTM_ID ? html : html.replace(/<noscript><iframe[^>]*googletagmanager[^>]*><\/iframe><\/noscript>/, '')
        return out.replaceAll('%VITE_GTM_ID%', ids.VITE_GTM_ID).replaceAll('%VITE_GA4_ID%', ids.VITE_GA4_ID)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), analyticsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
