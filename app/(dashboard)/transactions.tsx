// app/(dashboard)/transactions.tsx
import { View, Text } from 'react-native'

export default function TransactionsScreen() {
  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <Text className="text-white text-xl font-bold">Transacciones</Text>
      <Text className="text-muted mt-2">Próximamente — Plan 2</Text>
    </View>
  )
}
