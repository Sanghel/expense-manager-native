import type {
  Currency,
  ExchangeRate,
  TransactionWithCategory,
} from '@/types/database.types'
import type { MonthlyPoint } from '@/components/charts/types'

export type ReportRange = '1M' | '3M' | '6M' | '1Y'

/** Días que mira cada rango para charts diarios (AccumulatedBalance). */
export const RANGE_DAYS: Record<ReportRange, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

/** Meses que mira cada rango para charts mensuales (MonthlyComparison). */
export const RANGE_MONTHS: Record<ReportRange, number> = {
  '1M': 3, // siempre mostramos 3 meses mínimo para tener contexto
  '3M': 3,
  '6M': 6,
  '1Y': 12,
}

export const RANGE_LABEL: Record<ReportRange, string> = {
  '1M': '1 mes',
  '3M': '3 meses',
  '6M': '6 meses',
  '1Y': '1 año',
}

function getRate(
  from: Currency,
  to: Currency,
  rates: ExchangeRate[]
): number {
  if (from === to) return 1
  const r = rates.find(
    (x) => x.from_currency === from && x.to_currency === to
  )
  return r ? Number(r.rate) : 1
}

function shortMonthLabel(year: number, month: number): string {
  const date = new Date(year, month, 1)
  // 'ene', 'feb', etc. Con año si hay rango cruzado: 'ene 25'
  return date
    .toLocaleDateString('es', { month: 'short' })
    .replace('.', '')
    .toLowerCase()
}

/**
 * Agrupa transactions por mes calendario (NO ventana móvil) y devuelve los
 * últimos N meses con income/expense en target currency.
 *
 * Algoritmo:
 *   1. Generar slots `YYYY-MM` desde hace `months - 1` meses hasta el actual.
 *   2. Para cada tx, sumar al slot del mes correspondiente con conversion.
 *   3. Mapear a MonthlyPoint con label corto (ene, feb, ...).
 *
 * Cross-year se anota con el año pegado: "dic 25", "ene 26".
 */
export function buildMonthlyAggregates(
  transactions: TransactionWithCategory[],
  options: {
    months: number
    targetCurrency: Currency
    rates: ExchangeRate[]
  }
): MonthlyPoint[] {
  const { months, targetCurrency, rates } = options
  if (months <= 0) return []

  const now = new Date()
  const slots: { key: string; year: number; month: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    slots.push({ key, year: d.getFullYear(), month: d.getMonth() })
  }

  const byKey: Record<string, { income: number; expense: number }> = {}
  for (const s of slots) byKey[s.key] = { income: 0, expense: 0 }

  for (const t of transactions) {
    const key = t.date.slice(0, 7) // YYYY-MM
    if (!(key in byKey)) continue
    const amount =
      Number(t.amount) * getRate(t.currency, targetCurrency, rates)
    if (t.type === 'income') byKey[key].income += amount
    else if (t.type === 'expense') byKey[key].expense += amount
  }

  // Detectar si hay años distintos en el rango para añadir el sufijo de año
  const years = new Set(slots.map((s) => s.year))
  const showYear = years.size > 1

  return slots.map((s) => {
    const base = shortMonthLabel(s.year, s.month)
    const label = showYear
      ? `${base} ${String(s.year).slice(-2)}`
      : base
    return {
      label,
      income: byKey[s.key].income,
      expense: byKey[s.key].expense,
    }
  })
}

export interface RangeTotals {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}

/**
 * Suma ingresos / gastos / balance de las transactions que caen dentro
 * de los últimos `days` días, convertidos a `targetCurrency`.
 *
 * Cutoff inclusivo: `cutoff = today - (days - 1)` para que `days=30`
 * cubra 30 días completos incluyendo hoy.
 */
export function buildRangeTotals(
  transactions: TransactionWithCategory[],
  options: {
    days: number
    targetCurrency: Currency
    rates: ExchangeRate[]
  }
): RangeTotals {
  const { days, targetCurrency, rates } = options
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  let totalIncome = 0
  let totalExpense = 0
  let transactionCount = 0

  for (const t of transactions) {
    if (t.date < cutoffISO) continue
    const amount =
      Number(t.amount) * getRate(t.currency, targetCurrency, rates)
    if (t.type === 'income') totalIncome += amount
    else if (t.type === 'expense') totalExpense += amount
    transactionCount++
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount,
  }
}
