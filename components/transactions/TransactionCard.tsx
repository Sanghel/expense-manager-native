import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { formatCurrency } from '@/lib/utils/currency'
import type { TransactionWithCategory } from '@/types/database.types'

interface Props {
  transaction: TransactionWithCategory
  onPress: () => void
  onDelete: () => Promise<void>
}

export function TransactionCard({ transaction, onPress, onDelete }: Props) {
  const isIncome = transaction.type === 'income'

  function handleDelete() {
    Alert.alert('Eliminar', '¿Eliminar esta transacción?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center bg-surface mx-4 my-1 p-4 rounded-xl border border-border"
    >
      <Text className="text-2xl mr-3">{transaction.category?.icon ?? '💰'}</Text>
      <View className="flex-1">
        <Text className="text-white font-medium" numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text className="text-muted text-xs mt-0.5">
          {transaction.category?.name ?? 'Sin categoría'} · {transaction.date}
        </Text>
      </View>
      <View className="items-end ml-2">
        <Text className={`font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
        </Text>
        <TouchableOpacity onPress={handleDelete} activeOpacity={0.7} className="mt-1">
          <Text className="text-red-400 text-xs">Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}
