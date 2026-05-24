import { View, Text } from 'react-native'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  Currency,
  ExchangeRate,
  TransactionWithCategory,
} from '@/types/database.types'

interface Props {
  transactions: TransactionWithCategory[]
  month: string // YYYY-MM
  preferredCurrency: Currency
  exchangeRates: ExchangeRate[]
}

/**
 * Tres cards apiladas con income / expense / balance del mes activo.
 * Reúsa el hook useFinancialSummary que ya hace currency conversion.
 *
 * Diseño mobile-first: cards en columna (no row de 3) para que los montos
 * grandes no se trunquen en pantallas chicas. El balance card va arriba con
 * tamaño extra grande porque es el número más importante.
 */
export function SummaryCards({
  transactions,
  month,
  preferredCurrency,
  exchangeRates,
}: Props) {
  const { summary } = useFinancialSummary(
    transactions,
    month,
    preferredCurrency,
    exchangeRates
  )
  const positive = summary.balance >= 0

  return (
    <View className="gap-3">
      {/* Balance — hero card */}
      <View className="bg-surface border border-border rounded-2xl p-5">
        <Text className="text-muted text-xs uppercase tracking-wider">
          Balance del mes
        </Text>
        <Text
          className={`text-3xl font-bold mt-1 ${
            positive ? 'text-white' : 'text-red-400'
          }`}
        >
          {formatCurrency(summary.balance, preferredCurrency)}
        </Text>
        <Text className="text-muted text-xs mt-1">
          {summary.transactionCount}{' '}
          {summary.transactionCount === 1 ? 'transacción' : 'transacciones'}
        </Text>
      </View>

      {/* Income + Expense lado a lado */}
      <View className="flex-row gap-3">
        <SummaryItem
          label="Ingresos"
          value={formatCurrency(summary.totalIncome, preferredCurrency)}
          count={summary.incomeCount}
          accent="green"
        />
        <SummaryItem
          label="Gastos"
          value={formatCurrency(summary.totalExpense, preferredCurrency)}
          count={summary.expenseCount}
          accent="red"
        />
      </View>
    </View>
  )
}

function SummaryItem({
  label,
  value,
  count,
  accent,
}: {
  label: string
  value: string
  count: number
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
      <Text className="text-muted text-xs mt-1">
        {count} {count === 1 ? 'tx' : 'tx'}
      </Text>
    </View>
  )
}
