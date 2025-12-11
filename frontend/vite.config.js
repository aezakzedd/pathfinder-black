import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    // HMR configuration for dev tunnels
    // When accessed through a tunnel, Vite needs to use the client's host
    // By not specifying host, Vite will use the host from the request headers
    hmr: {
      // Use the same port as the server
      port: 5173,
      // Don't specify host - Vite will use the request's host header
      // This allows it to work with dev tunnels automatically
    },
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-map': ['maplibre-gl'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'maplibre-gl', 'zustand', 'axios']
  }
})
