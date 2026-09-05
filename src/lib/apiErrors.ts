import { isAxiosError } from 'axios'

type ApiErrorResponse = {
  error?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (!isAxiosError<ApiErrorResponse>(error)) return fallback

  if (!error.response) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
  }

  return error.response.data?.error?.trim() || fallback
}
