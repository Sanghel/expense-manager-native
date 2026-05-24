import { insforge } from '@/lib/insforge'
import {
  createBudgetSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@/lib/validations/budget'
import type {
  Budget,
  BudgetWithSpent,
  Category,
} from '@/types/database.types'

interface Result<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Calcula la ventana activa del presupuesto a partir de `start_date` y `period`.
 *
 * NO es mes calendar — es una ventana móvil anclada al día de inicio.
 * Ejemplo: budget mensual creado el 15-ene → períodos sucesivos:
 *   15-ene → 14-feb, 15-feb → 14-mar, 15-mar → 14-abr, ...
 */
function computeActivePeriod(
  startDate: string,
  period: 'monthly' | 'yearly',
  now = new Date()
): { periodStart: Date; periodEnd: Date } {
  const start = new Date(startDate)

  if (period === 'monthly') {
    let monthsElapsed =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth())
    if (now.getDate() < start.getDate()) monthsElapsed--

    if (monthsElapsed < 0) {
      // Budget arranca en el futuro — no hay período activo aún
      const periodEnd = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        start.getDate() - 1,
        23,
        59,
        59
      )
      return { periodStart: start, periodEnd }
    }

    const periodStart = new Date(
      start.getFullYear(),
      start.getMonth() + monthsElapsed,
      start.getDate()
    )
    const periodEnd = new Date(
      start.getFullYear(),
      start.getMonth() + monthsElapsed + 1,
      start.getDate() - 1,
      23,
      59,
      59
    )
    return { periodStart, periodEnd }
  }

  // yearly
  let yearsElapsed = now.getFullYear() - start.getFullYear()
  const pastAnniversary =
    now.getMonth() > start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() >= start.getDate())
  if (!pastAnniversary) yearsElapsed--

  if (yearsElapsed < 0) {
    const periodEnd = new Date(
      start.getFullYear() + 1,
      start.getMonth(),
      start.getDate() - 1,
      23,
      59,
      59
    )
    return { periodStart: start, periodEnd }
  }

  const periodStart = new Date(
    start.getFullYear() + yearsElapsed,
    start.getMonth(),
    start.getDate()
  )
  const periodEnd = new Date(
    start.getFullYear() + yearsElapsed + 1,
    start.getMonth(),
    start.getDate() - 1,
    23,
    59,
    59
  )
  return { periodStart, periodEnd }
}

/**
 * Lista budgets del user con `spent` calculado para el período activo.
 *
 * Estrategia: 1 query a budgets + 1 query a todas las expense transactions
 * del user. Luego filtramos en memoria. Para usuarios con miles de transacciones
 * conviene migrar a un RPC server-side, pero por ahora es aceptable.
 */
export async function getBudgets(
  userId: string
): Promise<Result<BudgetWithSpent[]>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data: budgets, error: budgetError } = await insforge.database
      .from('budgets')
      .select('*, category:categories(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (budgetError) throw budgetError
    if (!budgets || budgets.length === 0) {
      return { success: true, data: [] }
    }

    const { data: transactions, error: transError } = await insforge.database
      .from('transactions')
      .select('category_id, amount, date, type')
      .eq('user_id', userId)
      .eq('type', 'expense')

    if (transError) throw transError

    type BudgetRow = Budget & { category: Category }
    type TxRow = { category_id: string | null; amount: number; date: string; type: string }
    const txs = (transactions ?? []) as TxRow[]

    const result: BudgetWithSpent[] = (budgets as BudgetRow[]).map((budget) => {
      const { periodStart, periodEnd } = computeActivePeriod(
        budget.start_date,
        budget.period
      )

      const spent = txs
        .filter((t) => {
          if (t.category_id !== budget.category_id) return false
          const d = new Date(t.date)
          return d >= periodStart && d <= periodEnd
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)

      return {
        ...budget,
        spent,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
      }
    })

    return { success: true, data: result }
  } catch {
    return { success: false, error: 'Error al cargar presupuestos' }
  }
}

export async function getBudgetById(
  id: string,
  userId: string
): Promise<Result<Budget>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { data, error } = await insforge.database
      .from('budgets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    if (!data) return { success: false, error: 'Presupuesto no encontrado' }
    return { success: true, data: data as Budget }
  } catch {
    return { success: false, error: 'Error al cargar presupuesto' }
  }
}

export async function createBudget(
  userId: string,
  input: CreateBudgetInput
): Promise<Result<Budget>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createBudgetSchema.parse(input)
    const { data, error } = await insforge.database
      .from('budgets')
      .insert([{ ...validated, user_id: userId }])
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as Budget }
  } catch {
    return { success: false, error: 'Error al crear presupuesto' }
  }
}

export async function updateBudget(
  id: string,
  userId: string,
  input: UpdateBudgetInput
): Promise<Result<Budget>> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const validated = createBudgetSchema.partial().parse(input)
    const { data, error } = await insforge.database
      .from('budgets')
      .update(validated)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data: data as Budget }
  } catch {
    return { success: false, error: 'Error al actualizar presupuesto' }
  }
}

export async function deleteBudget(
  id: string,
  userId: string
): Promise<Result> {
  if (!userId) return { success: false, error: 'User ID requerido' }
  try {
    const { error } = await insforge.database
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar presupuesto' }
  }
}
