import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { formatCurrency } from '@/lib/utils/currency'
import type { Account } from '@/types/database.types'

interface Props {
  account: Account
  onPress: () => void
  onDelete: () => Promise<void>
}

export function AccountCard({ account, onPress, onDelete }: Props) {
  function handleDelete() {
    Alert.alert('Eliminar cuenta', `¿Eliminar "${account.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-surface mx-4 my-1.5 p-4 rounded-xl border border-border"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: account.color ?? '#4F46E5' }}
          >
            <Text className="text-xl">{account.icon ?? '💳'}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold" numberOfLines={1}>
              {account.name}
            </Text>
            <Text className="text-muted text-xs capitalize">{account.type}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-white font-bold">
            {formatCurrency(account.balance, account.currency)}
          </Text>
          <TouchableOpacity onPress={handleDelete} activeOpacity={0.7} className="mt-1">
            <Text className="text-red-400 text-xs">Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}
