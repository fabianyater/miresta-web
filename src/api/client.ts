import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { redirectToLogin } from '@/lib/navigation'

// Sin VITE_API_URL, usa rutas relativas al mismo origen que sirvió la página — el
// proxy de Vite (ver vite.config.ts) reenvía /api/* al backend en 8081 por su cuenta.
// Así el navegador nunca hace una petición cross-origin real (mismo puerto 5173
// siempre), sin importar si se entra por localhost o por la IP de la red/hotspot.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('miresta_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// The backend issues a single long-lived JWT (no refresh flow) — on 401 (missing/
// expired/invalid token) there's nothing to refresh, so we just log out.
// A 401 from the login request itself just means wrong credentials, not an
// expired session — let the login form show that error instead.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/api/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      useAuthStore.getState().logout()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)
