import { Toaster, toast } from 'sonner-native'

// Re-export the imperative API
export { toast }

/**
 * Provider del sistema de toasts. Mount UNA vez en el root layout.
 * Después, despachar toasts con la API imperativa `toast(...)`:
 *
 * @example
 * import { toast } from '@/components/ui/Toast'
 * toast.success('Guardado')
 * toast.error('Falló la conexión')
 * toast('Mensaje plain')
 * toast.loading('Guardando...')
 */
export function AppToaster() {
  return <Toaster position="top-center" duration={3000} />
}
