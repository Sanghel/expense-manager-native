import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { formatCurrency } from '@/lib/utils/currency'
import type { TransactionWithCategory } from '@/types/database.types'

interface Props {
  transactions: TransactionWithCategory[]
  limit?: number
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/**
 * Lista compacta de las últimas N transacciones con link a la pantalla
 * completa de transacciones. Se asume que `transactions` ya viene ordenado
 * por fecha desc por el caller.
 */
export function RecentTransactions({ transactions, limit = 5 }: Props) {
  const items = transactions.slice(0, limit)

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Text className="text-muted text-xs uppercase tracking-wider">
          Últimas transacciones
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/transactions')}
          activeOpacity={0.7}
        >
          <Text className="text-primary text-xs">Ver todas →</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <View className="py-6 items-center">
            <Text className="text-muted text-sm">Sin transacciones</Text>
          </View>
        ) : (
          items.map((tx, idx) => (
            <TouchableOpacity
              key={tx.id}
              onPress={() => router.push(`/transactions/${tx.id}`)}
              activeOpacity={0.7}
              className={`flex-row items-center px-4 py-3 ${
                idx < items.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <View
                style={{ backgroundColor: tx.category?.color ?? '#4F46E5' }}
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
              >
                <Text className="text-base">{tx.category?.icon ?? '📂'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium" numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text className="text-muted text-xs mt-0.5">
                  {tx.category?.name ?? 'Sin categoría'} ·{' '}
                  {formatShortDate(tx.date)}
                </Text>
              </View>
              <Text
                className={`text-sm font-semibold ${
                  tx.type === 'income' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {tx.type === 'income' ? '+' : '−'}{' '}
                {formatCurrency(Number(tx.amount), tx.currency)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  )
}
