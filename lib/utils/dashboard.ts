import type {
  Currency,
  ExchangeRate,
  TransactionWithCategory,
} from '@/types/database.types'
import type {
  CategoryAggregate,
  TimeSeriesPoint,
} from '@/components/charts/types'

/**
 * Devuelve el multiplicador para convertir `from` → `to`. Si no encuentra
 * rate, devuelve 1 (degradación silenciosa — el caller puede loguear).
 */
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

/**
 * Construye una serie temporal del **flujo acumulado** en los últimos N días.
 *
 * Algoritmo:
 *   1. Generar un slot por día (hoy hacia atrás N días).
 *   2. Para cada transaction dentro del rango, sumar/restar al slot del día.
 *   3. Acumular slot[i] = slot[i-1] + delta[i].
 *
 * Es una vista de "cuánto fluyó el balance" durante el período, no el balance
 * absoluto histórico (que requeriría sumar TODAS las transactions previas).
 * Para un dashboard de mes corriente, esta vista es más útil que el absoluto.
 *
 * Monedas se convierten a `targetCurrency` con las rates provistas.
 */
export function buildBalanceTimeSeries(
  transactions: TransactionWithCategory[],
  options: {
    days: number
    targetCurrency: Currency
    rates: ExchangeRate[]
  }
): TimeSeriesPoint[] {
  const { days, targetCurrency, rates } = options
  if (days <= 0) return []

  // Generar fechas YYYY-MM-DD de hoy hacia atrás
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dates: string[] = []
  const deltaByDate: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    dates.push(iso)
    deltaByDate[iso] = 0
  }
  const oldestDate = dates[0]

  for (const t of transactions) {
    if (t.date < oldestDate) continue
    if (!(t.date in deltaByDate)) continue // tx en el futuro o fuera de rango
    const converted =
      Number(t.amount) * getRate(t.currency, targetCurrency, rates)
    const sign = t.type === 'income' ? 1 : -1
    deltaByDate[t.date] += converted * sign
  }

  // Acumular
  let running = 0
  return dates.map((date) => {
    running += deltaByDate[date]
    return { date, value: running }
  })
}

/**
 * Agrupa expense transactions por categoría y devuelve totales convertidos a
 * la currency objetivo. Ordenado desc por value. Calcula percent del total.
 *
 * `month` opcional — si se pasa (formato YYYY-MM), filtra solo transactions
 * cuya fecha empieza con ese prefijo. Si se omite, usa todas las dadas.
 */
export function buildCategoryAggregates(
  transactions: TransactionWithCategory[],
  options: {
    targetCurrency: Currency
    rates: ExchangeRate[]
    month?: string
  }
): CategoryAggregate[] {
  const { targetCurrency, rates, month } = options
  const filtered = transactions.filter((t) => {
    if (t.type !== 'expense') return false
    if (month && !t.date.startsWith(month)) return false
    return true
  })

  type Bucket = { name: string; icon: string | null; color: string | null; value: number }
  const buckets: Record<string, Bucket> = {}

  for (const t of filtered) {
    const id = t.category?.id ?? '__no_cat__'
    const converted =
      Number(t.amount) * getRate(t.currency, targetCurrency, rates)
    if (!buckets[id]) {
      buckets[id] = {
        name: t.category?.name ?? 'Sin categoría',
        icon: t.category?.icon ?? null,
        color: t.category?.color ?? null,
        value: 0,
      }
    }
    buckets[id].value += converted
  }

  const arr = Object.values(buckets)
  const total = arr.reduce((s, b) => s + b.value, 0)

  return arr
    .map<CategoryAggregate>((b) => ({
      name: b.name,
      icon: b.icon,
      color: b.color,
      value: b.value,
      percent: total > 0 ? (b.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Devuelve el primer día del mes actual en formato YYYY-MM-DD.
 * Útil para filtrar transactions del mes en curso.
 */
export function currentMonthPrefix(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
