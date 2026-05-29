// components/chat/TransactionPreview.tsx
//
// Card de preview con el resultado de la categorización IA. El usuario
// puede:
//  - Confirmar → llama createTransaction
//  - Descartar → cierra la card sin crear nada
//
// Mientras se está creando, los botones quedan deshabilitados y se
// muestra ActivityIndicator. Tras confirmar exitosamente, la card pasa a
// estado "creada" (no se puede confirmar de nuevo, evita duplicados).
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { formatCurrency } from '@/lib/utils/currency'
import type { Category } from '@/types/database.types'
import type { CategorizedTransaction } from '@/lib/services/chat.service'

interface Props {
  transaction: CategorizedTransaction
  category: Category | null
  status: 'pending' | 'creating' | 'created'
  onConfirm: () => void
  onDiscard: () => void
}

export function TransactionPreview({
  transaction,
  category,
  status,
  onConfirm,
  onDiscard,
}: Props) {
  const isIncome = transaction.type === 'income'
  const created = status === 'created'
  const creating = status === 'creating'

  return (
    <View className="mx-4 my-2 bg-surface border border-border rounded-2xl p-4">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View
          style={{ backgroundColor: category?.color ?? '#4F46E5' }}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
        >
          <Text className="text-xl">{category?.icon ?? '💰'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            {transaction.description}
          </Text>
          <Text className="text-muted text-xs mt-0.5">
            {category?.name ?? 'Sin categoría'} · {transaction.date}
          </Text>
        </View>
        <Text
          className={`text-base font-bold ${
            isIncome ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(transaction.amount, transaction.currency)}
        </Text>
      </View>

      {/* Estado */}
      {created ? (
        <View className="bg-green-500/10 border border-green-500/40 rounded-lg px-3 py-2">
          <Text className="text-green-400 text-xs text-center">
            Transacción registrada ✓
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={onDiscard}
            disabled={creating}
            activeOpacity={0.7}
            className="flex-1 py-2.5 rounded-xl border border-border items-center"
          >
            <Text className="text-muted text-sm">Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={creating}
            activeOpacity={0.8}
            className="flex-1 py-2.5 rounded-xl bg-primary items-center"
          >
            {creating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-white text-sm font-semibold">
                Confirmar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
