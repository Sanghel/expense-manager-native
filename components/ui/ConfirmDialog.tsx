import { Alert } from 'react-native'

interface ConfirmDialogOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

/**
 * Helper async sobre Alert.alert que devuelve Promise<boolean>.
 * Resuelve `true` si el usuario confirma, `false` si cancela o descarta.
 *
 * @example
 * const ok = await confirmDialog({
 *   title: 'Eliminar transacción',
 *   message: '¿Estás seguro? No se puede deshacer.',
 *   confirmLabel: 'Eliminar',
 *   destructive: true,
 * })
 * if (!ok) return
 * await deleteTransaction(id)
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
}: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelLabel,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    )
  })
}
