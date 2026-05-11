import { Notify } from 'quasar'

export function extractApiErrorMessage(error, fallback = 'Une erreur est survenue') {
  if (!error) return fallback

  if (error.response) {
    const { data, status } = error.response
    if (data) {
      if (typeof data === 'string' && data.trim()) {
        return data
      }
      if (data.message) {
        return String(data.message)
      }
      if (data.error) {
        return String(data.error)
      }
      if (data.errors) {
        if (Array.isArray(data.errors)) {
          return data.errors.flat().join(' / ')
        }
        if (typeof data.errors === 'object') {
          return Object.values(data.errors)
            .flat()
            .map((item) => String(item))
            .join(' / ')
        }
      }
    }

    if (status === 401) return 'Email ou mot de passe incorrect.'
    if (status === 403) return 'Accès refusé.'
    if (status === 404) return 'Ressource introuvable.'
    if (status === 422) return 'Certaines données sont invalides ou manquantes.'
  }

  if (error.message) return String(error.message)
  return fallback
}

export function notifyApiError(error, fallback = 'Une erreur est survenue') {
  Notify.create({
    type: 'negative',
    message: extractApiErrorMessage(error, fallback),
  })
}
