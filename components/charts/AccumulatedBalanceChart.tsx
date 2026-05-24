import { View, Text } from 'react-native'
import { CartesianChart, Line, Area } from 'victory-native'
import { LinearGradient, vec } from '@shopify/react-native-skia'
import type { TimeSeriesPoint } from './types'

interface Props {
  data: TimeSeriesPoint[]
  /** Color principal — default primary. */
  color?: string
  /** Altura en px. Default 220. */
  height?: number
  /** Título opcional renderizado encima del chart. */
  title?: string
  /** Subtítulo opcional. */
  subtitle?: string
}

/**
 * Line + área degradada de un valor acumulado sobre el tiempo.
 *
 * Pensado para mostrar balance corrido día a día. El caller normaliza los
 * datos (fecha YYYY-MM-DD + valor en la currency objetivo); este wrapper
 * solo dibuja.
 *
 * El chart funciona sin font cargada — los ejes no muestran labels para
 * evitar dependencias con expo-font. La currency y los rangos se muestran
 * arriba del chart en una row de leyendas mínimas.
 */
export function AccumulatedBalanceChart({
  data,
  color = '#4F46E5',
  height = 220,
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

  // Transformamos las fechas a índices numéricos — victory-native v41
  // necesita una xKey numérica o categórica simple. La fecha la usamos
  // como ID y graficamos contra el índice.
  const chartData = data.map((p, i) => ({
    i,
    value: p.value,
    date: p.date,
  }))

  const first = data[0].value
  const last = data[data.length - 1].value
  const delta = last - first
  const positive = delta >= 0

  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      {/* Header con delta */}
      <View className="flex-row items-baseline mb-2 px-1">
        <Text className="text-white text-xl font-bold">
          {Math.round(last).toLocaleString()}
        </Text>
        <Text
          className={
            positive ? 'text-green-400 text-xs ml-2' : 'text-red-400 text-xs ml-2'
          }
        >
          {positive ? '↑' : '↓'} {Math.abs(Math.round(delta)).toLocaleString()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <CartesianChart
          data={chartData}
          xKey="i"
          yKeys={['value']}
          domainPadding={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          {({ points, chartBounds }) => (
            <>
              <Area
                points={points.value}
                y0={chartBounds.bottom}
                animate={{ type: 'timing', duration: 600 }}
              >
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, chartBounds.bottom)}
                  colors={[`${color}66`, `${color}00`]}
                />
              </Area>
              <Line
                points={points.value}
                color={color}
                strokeWidth={2.5}
                animate={{ type: 'timing', duration: 600 }}
              />
            </>
          )}
        </CartesianChart>
      </View>
    </ChartContainer>
  )
}

/** Container con title/subtitle reusable (también lo usan los otros charts). */
export function ChartContainer({
  title,
  subtitle,
  height,
  children,
}: {
  title?: string
  subtitle?: string
  height: number
  children: React.ReactNode
}) {
  return (
    <View className="bg-surface border border-border rounded-2xl p-4">
      {title ? (
        <Text className="text-white text-base font-semibold">{title}</Text>
      ) : null}
      {subtitle ? (
        <Text className="text-muted text-xs mt-0.5 mb-2">{subtitle}</Text>
      ) : (
        title ? <View className="mb-2" /> : null
      )}
      <View style={{ height }}>{children}</View>
    </View>
  )
}

/** Mock data para verificación visual en T-4.1. Se borra en T-4.2. */
export function DemoAccumulatedBalanceChart() {
  const mock: TimeSeriesPoint[] = [
    { date: '2026-04-01', value: 1_200_000 },
    { date: '2026-04-05', value: 1_350_000 },
    { date: '2026-04-10', value: 1_300_000 },
    { date: '2026-04-15', value: 1_550_000 },
    { date: '2026-04-20', value: 1_700_000 },
    { date: '2026-04-25', value: 1_650_000 },
    { date: '2026-04-30', value: 1_900_000 },
    { date: '2026-05-05', value: 1_850_000 },
    { date: '2026-05-10', value: 2_100_000 },
    { date: '2026-05-15', value: 2_250_000 },
    { date: '2026-05-20', value: 2_400_000 },
  ]
  return (
    <AccumulatedBalanceChart
      data={mock}
      title="Balance acumulado"
      subtitle="Últimos 30 días · COP"
    />
  )
}
