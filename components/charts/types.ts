/**
 * Tipos compartidos entre los chart wrappers.
 *
 * Diseñados para coincidir con los shapes que el web ya construye en sus
 * actions. Esto permite que un mismo agrupador (server-side o cliente) sirva
 * a ambos proyectos sin transformaciones intermedias.
 */

/** Punto en serie temporal — usado por AccumulatedBalanceChart. */
export interface TimeSeriesPoint {
  /** YYYY-MM-DD */
  date: string
  /** Valor numérico (balance, total, etc.) */
  value: number
}

/** Categoría con monto agregado — usado por ExpensesByCategoryChart. */
export interface CategoryAggregate {
  /** Nombre legible (Mercado, Salud, etc.) */
  name: string
  /** Emoji opcional del category.icon */
  icon?: string | null
  /** Color de la categoría — hex */
  color?: string | null
  /** Monto agregado en la currency objetivo */
  value: number
  /** % del total — calculado por el caller */
  percent?: number
}

/** Punto mensual con income+expense — usado por MonthlyComparisonChart. */
export interface MonthlyPoint {
  /** Label corto del mes: "ene", "feb", "mar", ..., "ene 25" si hay año mixto */
  label: string
  income: number
  expense: number
}
