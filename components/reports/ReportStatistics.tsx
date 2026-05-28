// components/reports/ReportStatistics.tsx
//
// 3 cards de resumen del rango activo del reporte:
//   - Balance neto (hero card, full-width)
//   - Ingresos + Gastos (lado a lado)
//
// Diseño consistente con SummaryCards del dashboard, pero el cálculo
// usa buildRangeTotals (rango por días, no por mes) y convierte todas
// las tx a la preferred currency del usuario.
import { View, Text } from 'react-native'
import { formatCurrency } from '@/lib/utils/currency'
import type { Currency } from '@/types/database.types'
import type { RangeTotals } from '@/lib/utils/reports'

interface Props {
  totals: RangeTotals
  currency: Currency
}

export function ReportStatistics({ totals, currency }: Props) {
  const positive = totals.balance >= 0

  return (
    <View className="gap-3">
      {/* Balance — hero card */}
      <View className="bg-surface border border-border rounded-2xl p-5">
        <Text className="text-muted text-xs uppercase tracking-wider">
          Balance del rango
        </Text>
        <Text
          className={`text-3xl font-bold mt-1 ${
            positive ? 'text-white' : 'text-red-400'
          }`}
        >
          {formatCurrency(totals.balance, currency)}
        </Text>
        <Text className="text-muted text-xs mt-1">
          {totals.transactionCount}{' '}
          {totals.transactionCount === 1 ? 'transacción' : 'transacciones'}
        </Text>
      </View>

      {/* Income + Expense lado a lado */}
      <View className="flex-row gap-3">
        <StatItem
          label="Ingresos"
          value={formatCurrency(totals.totalIncome, currency)}
          accent="green"
        />
        <StatItem
          label="Gastos"
          value={formatCurrency(totals.totalExpense, currency)}
          accent="red"
        />
      </View>
    </View>
  )
}

function StatItem({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'green' | 'red'
}) {
  return (
    <View className="flex-1 bg-surface border border-border rounded-2xl p-4">
      <Text className="text-muted text-xs uppercase tracking-wider">
        {label}
      </Text>
      <Text
        className={`text-base font-bold mt-1 ${
          accent === 'green' ? 'text-green-400' : 'text-red-400'
        }`}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  )
}
