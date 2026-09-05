import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Chrome/Edge bloquean en silencio (sin ni siquiera preguntar) cualquier fetch()
    // desde JS hacia una IP de red local si la página misma no viene por HTTPS — es
    // la causa real de por qué el login nunca conectaba desde el celular. Certificado
    // autofirmado, solo para desarrollo (el celular tendrá que aceptar la advertencia
    // una vez).
    basicSsl(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true, // escucha en todas las interfaces (0.0.0.0), no solo localhost — para poder
    // conectarse desde el celular u otro equipo en la misma red
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      // El navegador del celular solo habla con el puerto 5173 (mismo origen que la
      // página) — Vite reenvía por su cuenta al backend en 8081. Así se evita
      // depender de CORS/protecciones de red-privada del navegador entre celular y PC.
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
