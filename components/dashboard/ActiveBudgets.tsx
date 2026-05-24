import { View, Text, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { ProgressBar, defaultColor } from '@/components/ui/ProgressBar'
import { formatCurrency } from '@/lib/utils/currency'
import type { BudgetWithSpent } from '@/types/database.types'

interface Props {
  budgets: BudgetWithSpent[]
  limit?: number
}

/**
 * Widget de presupuestos activos para el dashboard. Muestra los TOP N
 * ordenados por % consumido descendente — los más urgentes primero
 * (excedidos y casi excedidos en la cima).
 *
 * Si no hay budgets, se omite el componente entero (el caller decide
 * mostrar un CTA o nada).
 */
export function ActiveBudgets({ budgets, limit = 3 }: Props) {
  if (budgets.length === 0) return null

  const sorted = [...budgets]
    .sort((a, b) => {
      const ra = a.amount > 0 ? a.spent / a.amount : 0
      const rb = b.amount > 0 ? b.spent / b.amount : 0
      return rb - ra
    })
    .slice(0, limit)

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2 px-1">
        <Text className="text-muted text-xs uppercase tracking-wider">
          Presupuestos
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/budgets')}
          activeOpacity={0.7}
        >
          <Text className="text-primary text-xs">Ver todos →</Text>
        </TouchableOpacity>
      </View>

      <View className="gap-2">
        {sorted.map((b) => {
          const ratio = b.amount > 0 ? b.spent / b.amount : 0
          const color = defaultColor(ratio)
          return (
            <TouchableOpacity
              key={b.id}
              onPress={() => router.push(`/budgets/${b.id}`)}
              activeOpacity={0.7}
              className="bg-surface border border-border rounded-2xl p-3"
            >
              <View className="flex-row items-center mb-2">
                <View
                  style={{ backgroundColor: b.category.color ?? '#4F46E5' }}
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                >
                  <Text className="text-sm">{b.category.icon ?? '📂'}</Text>
                </View>
                <Text className="text-white text-sm flex-1" numberOfLines={1}>
                  {b.category.name}
                </Text>
                <Text style={{ color }} className="text-sm font-bold">
                  {Math.round(ratio * 100)}%
                </Text>
              </View>
              <ProgressBar value={ratio} height={6} />
              <Text className="text-muted text-xs mt-1.5">
                {formatCurrency(b.spent, b.currency)} de{' '}
                {formatCurrency(b.amount, b.currency)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
