import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // MedEx REST API  →  https://medex.com.bd/api/beta/…
      '/proxy/medex': {
        target: 'https://medex.com.bd',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => '/api/beta' + path.replace(/^\/proxy\/medex/, ''),
      },
      // ACIBD MyACI order backend  →  http://apps.acibd.com/apps/myaci/…
      '/proxy/acibd': {
        target: 'http://apps.acibd.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => '/apps/myaci' + path.replace(/^\/proxy\/acibd/, ''),
      },
      // Google Apps Script webhook (exact macro URL)
      '/proxy/gscript': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: true,
        rewrite: () =>
          '/macros/s/AKfycbxsszVblVlSzb_EVjf5MCem1QGx9VT1Kykkxu5x9LKiw7bHls9HACI8EacA1gRvzyao/exec',
      },
    },
  },
})
