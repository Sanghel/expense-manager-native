import { View } from 'react-native'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface Props {
  /** Cantidad de filas a mostrar. Default 6. */
  count?: number
}

/**
 * Lista de skeleton rows para pantallas que cargan datos al focus.
 * Cada row simula una list card típica: avatar circular + 2 líneas de texto.
 *
 * Reemplaza al `<ActivityIndicator>` centrado en pantallas de listas
 * (Transactions, Budgets, Savings, Loans, Reminders, Categories, Accounts).
 *
 * Mejora la perception de velocidad: el user ve el shape de la lista
 * inmediatamente, no un spinner abstracto.
 */
export function ListLoadingSkeleton({ count = 6 }: Props) {
  return (
    <View className="gap-3 px-4 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="bg-surface border border-border rounded-2xl p-4 flex-row items-center"
        >
          <LoadingSkeleton
            width={40}
            height={40}
            rounded="full"
            className="mr-3"
          />
          <View style={{ flex: 1 }} className="gap-2">
            <LoadingSkeleton height={14} width="60%" />
            <LoadingSkeleton height={12} width="40%" />
          </View>
          <LoadingSkeleton width={60} height={14} />
        </View>
      ))}
    </View>
  )
}
