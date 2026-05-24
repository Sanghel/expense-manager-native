import { View, Text } from 'react-native'
import { CartesianChart, Bar } from 'victory-native'
import { ChartContainer } from './AccumulatedBalanceChart'
import type { MonthlyPoint } from './types'

interface Props {
  data: MonthlyPoint[]
  /** Color para income. Default green-500. */
  incomeColor?: string
  /** Color para expense. Default red-500. */
  expenseColor?: string
  height?: number
  title?: string
  subtitle?: string
}

/**
 * Barras agrupadas income vs expense por mes.
 *
 * victory-native v41 renderiza Bar como barras verticales. Para "barras
 * agrupadas" (dos series por categoría) se renderizan dos <Bar> con
 * `barWidth` reducido — el offset visual se logra con la separación natural
 * entre puntos del eje X.
 *
 * En lugar de eje X con labels (requiere font), usamos una row de labels
 * debajo del chart en HTML/RN normal, alineada a los meses.
 */
export function MonthlyComparisonChart({
  data,
  incomeColor = '#10b981',
  expenseColor = '#ef4444',
  height = 240,
  title,
  subtitle,
}: Props) {
  if (data.length === 0) {
    return (
      <ChartContainer title={title} subtitle={subtitle} height={height}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted text-sm">Sin datos para mostrar</Text>
        </View>
      </ChartContainer>
    )
  }

  const chartData = data.map((p, i) => ({
    i,
    income: p.income,
    expense: p.expense,
  }))

  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      {/* Legend */}
      <View className="flex-row gap-4 mb-2">
        <View className="flex-row items-center gap-1.5">
          <View
            style={{ width: 10, height: 10, backgroundColor: incomeColor, borderRadius: 2 }}
          />
          <Text className="text-muted text-xs">Ingresos</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View
            style={{ width: 10, height: 10, backgroundColor: expenseColor, borderRadius: 2 }}
          />
          <Text className="text-muted text-xs">Gastos</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <CartesianChart
          data={chartData}
          xKey="i"
          yKeys={['income', 'expense']}
          domainPadding={{ top: 16, bottom: 8, left: 24, right: 24 }}
        >
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.income}
                chartBounds={chartBounds}
                color={incomeColor}
                barWidth={10}
                roundedCorners={{ topLeft: 3, topRight: 3 }}
                animate={{ type: 'timing', duration: 500 }}
              />
              <Bar
                points={points.expense}
                chartBounds={chartBounds}
                color={expenseColor}
                barWidth={10}
                roundedCorners={{ topLeft: 3, topRight: 3 }}
                animate={{ type: 'timing', duration: 500 }}
              />
            </>
          )}
        </CartesianChart>
      </View>

      {/* Month labels — alineados aproximadamente con cada índice */}
      <View className="flex-row justify-between mt-1 px-2">
        {data.map((p) => (
          <Text key={p.label} className="text-muted text-xs" style={{ width: `${100 / data.length}%`, textAlign: 'center' }}>
            {p.label}
          </Text>
        ))}
      </View>
    </ChartContainer>
  )
}

