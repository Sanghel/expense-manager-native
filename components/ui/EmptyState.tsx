import { View, Text } from 'react-native'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
}

/**
 * Placeholder genérico para cuando una lista o pantalla no tiene datos.
 *
 * @example
 * <EmptyState
 *   icon="📭"
 *   title="Sin transacciones"
 *   description="Crea tu primera transacción tocando el botón +"
 * />
 */
export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12 gap-2">
      {icon ? <Text className="text-5xl mb-2">{icon}</Text> : null}
      <Text className="text-white text-lg font-semibold text-center">{title}</Text>
      {description ? (
        <Text className="text-muted text-sm text-center">{description}</Text>
      ) : null}
    </View>
  )
}
