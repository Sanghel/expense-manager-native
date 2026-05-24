import { View, Text } from 'react-native'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ChartContainer } from './AccumulatedBalanceChart'
import { formatCurrency } from '@/lib/utils/currency'
import type { Currency } from '@/types/database.types'
import type { CategoryAggregate } from './types'

interface Props {
  data: CategoryAggregate[]
  currency: Currency
  title?: string
  subtitle?: string
  /** Máximo de categorías a mostrar. Default 8. */
  limit?: number
}

/**
 * "Bar list" de gastos por categoría — barras horizontales con View+flex
 * en lugar de un chart real. Para mobile esto se ve mucho mejor que un
 * bar chart vertical con labels truncados, y no requiere Skia ni font
 * loading.
 *
 * Se asume que `data` viene pre-agregada y convertida a la currency objetivo
 * por el caller (en T-4.2 se hace en el useEffect del dashboard).
 *
 * Cada row reusa <ProgressBar /> pasando el color custom de la categoría.
 */
export function ExpensesByCategoryChart({
  data,
  currency,
  title,
  subtitle,
  limit = 8,
}: Props) {
  const total = data.reduce((s, c) => s + c.value, 0)
  const limited = data.slice(0, limit)
  const heightEstimate = Math.max(120, limited.length * 56 + 20)

  if (limited.length === 0) {
    return (
      <ChartContainer title={title} subtitle={subtitle} height={120}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-sm">Sin datos para mostrar</Text>
        </View>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer title={title} subtitle={subtitle} height={heightEstimate}>
      <View className="gap-3">
        {limited.map((cat) => {
          const ratio = total > 0 ? cat.value / total : 0
          const color = cat.color ?? '#4F46E5'
          return (
            <View key={cat.name}>
              <View className="flex-row items-center mb-1">
                <Text className="text-lg mr-2">{cat.icon ?? '📂'}</Text>
                <Text className="text-white text-sm flex-1" numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text className="text-white text-sm font-semibold">
                  {formatCurrency(cat.value, currency)}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View style={{ flex: 1 }}>
                  <ProgressBar value={ratio} color={color} height={6} />
                </View>
                <Text className="text-muted text-xs w-10 text-right">
                  {Math.round(ratio * 100)}%
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </ChartContainer>
  )
}

